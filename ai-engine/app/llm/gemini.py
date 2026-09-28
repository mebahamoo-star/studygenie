import asyncio
import base64
import json
import logging
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError

from app.config import settings
from app.llm.base import (
    LLMInvalidOutput,
    Provider,
    ProviderAuthError,
    ProviderBadResponse,
    ProviderNotConfigured,
    ProviderRateLimited,
    ProviderTimeout,
)

logger = logging.getLogger(__name__)

semaphore = asyncio.Semaphore(settings.llm_max_concurrency)

class GeminiProvider(Provider):
    def __init__(self):
        self.api_key = settings.gemini_api_key
        if not self.api_key:
            raise ProviderNotConfigured("GEMINI_API_KEY is not set.")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def _make_request_with_retries(self, model: str, payload: dict) -> httpx.Response:
        url = f"{self.base_url}/{model}:generateContent"
        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            retries = 0
            while retries <= settings.llm_max_retries:
                try:
                    async with semaphore:
                        response = await client.post(url, headers=headers, json=payload)
                    
                    if response.status_code in (200, 400): # handle 400 as bad response, not retry
                        pass
                    elif response.status_code in (401, 403):
                        raise ProviderAuthError("Authentication failed with Gemini.")
                    elif response.status_code == 429:
                        raise ProviderRateLimited("Rate limited by Gemini.")
                    elif response.status_code >= 500:
                        response.raise_for_status()
                    
                    if response.status_code == 429 or response.status_code >= 500:
                        raise ProviderRateLimited(f"HTTP {response.status_code}")
                    
                    return response

                except (httpx.TimeoutException, httpx.NetworkError) as e:
                    if retries >= settings.llm_max_retries:
                        raise ProviderTimeout(f"Network error or timeout: {e!s}")
                except ProviderRateLimited as e:
                    if retries >= settings.llm_max_retries:
                        raise e
                    
                # Calculate backoff
                retry_after = 2 ** retries
                # Try to get Retry-After header if it's an HTTP response exception
                if 'response' in locals() and response.headers.get("Retry-After"):
                    try:
                        retry_after = int(response.headers.get("Retry-After"))
                    except ValueError:
                        pass
                
                await asyncio.sleep(retry_after)
                retries += 1
                
        raise ProviderTimeout("Max retries exceeded")

    def _build_payload(self, system: str, contents: list, temperature: float, max_tokens: int) -> dict:
        config = {
            "responseMimeType": "application/json",
            "temperature": temperature,
            "maxOutputTokens": max_tokens
        }
        if settings.llm_thinking_budget is not None:
            config["thinkingConfig"] = {"thinkingBudget": settings.llm_thinking_budget}

        return {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": contents,
            "generationConfig": config
        }

    def _parse_response(self, response: httpx.Response) -> tuple[Any, dict[str, int]]:
        if response.status_code != 200:
            raise ProviderBadResponse(f"Gemini error {response.status_code}: {response.text}")
            
        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise ProviderBadResponse("No candidates returned.")
            
        candidate = candidates[0]
        finish_reason = candidate.get("finishReason")
        if finish_reason and finish_reason not in ("STOP", "MAX_TOKENS"):
            raise ProviderBadResponse(f"Bad finish reason: {finish_reason}")
            
        content_parts = candidate.get("content", {}).get("parts", [])
        if not content_parts:
            raise ProviderBadResponse("No content parts returned.")
            
        text = content_parts[0].get("text", "")
        
        try:
            parsed_json = json.loads(text)
        except json.JSONDecodeError:
            raise ProviderBadResponse("Invalid JSON returned by provider")

        usage_meta = data.get("usageMetadata", {})
        usage = {
            "prompt_tokens": usage_meta.get("promptTokenCount", 0),
            "output_tokens": usage_meta.get("candidatesTokenCount", 0)
        }
        
        return parsed_json, usage

    async def _execute_with_repair(self, payload: dict, model: str, schema: type[BaseModel]) -> tuple[BaseModel, dict[str, int], str]:
        response = await self._make_request_with_retries(model, payload)
        parsed_json, usage = self._parse_response(response)
        
        try:
            validated = schema.model_validate(parsed_json)
            return validated, usage, model
        except ValidationError as e:
            # Repair attempt
            error_summary = str(e)
            repair_contents = list(payload["contents"])
            repair_contents.append({
                "role": "model",
                "parts": [{"text": json.dumps(parsed_json)}]
            })
            repair_contents.append({
                "role": "user",
                "parts": [{"text": f"Your previous output failed validation: {error_summary}. Fix it and return valid JSON."}]
            })
            
            payload["contents"] = repair_contents
            
            repair_response = await self._make_request_with_retries(model, payload)
            repair_json, repair_usage = self._parse_response(repair_response)
            
            # Combine usage
            usage["prompt_tokens"] += repair_usage["prompt_tokens"]
            usage["output_tokens"] += repair_usage["output_tokens"]
            
            try:
                validated_repaired = schema.model_validate(repair_json)
                return validated_repaired, usage, model
            except ValidationError as final_e:
                raise LLMInvalidOutput(f"Failed after repair: {final_e!s}")

    async def generate_json(self, system: str, user: str, model: str, temperature: float, max_output_tokens: int, schema: type[BaseModel]) -> tuple[BaseModel, dict[str, int], str]:
        contents = [{"role": "user", "parts": [{"text": user}]}]
        payload = self._build_payload(system, contents, temperature, max_output_tokens)
        return await self._execute_with_repair(payload, model, schema)

    async def generate_json_from_pdf(self, system: str, user: str, pdf_bytes: bytes, model: str, temperature: float, max_output_tokens: int, schema: type[BaseModel]) -> tuple[BaseModel, dict[str, int], str]:
        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
        contents = [{
            "role": "user", 
            "parts": [
                {"inlineData": {"mimeType": "application/pdf", "data": pdf_b64}},
                {"text": user}
            ]
        }]
        payload = self._build_payload(system, contents, temperature, max_output_tokens)
        return await self._execute_with_repair(payload, model, schema)
