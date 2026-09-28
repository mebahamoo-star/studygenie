from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "dev"
    enable_docs: bool = True
    ai_internal_token: str

    llm_provider: str = "gemini"
    gemini_api_key: Optional[str] = None
    
    llm_model_parse: str = "gemini-2.5-flash"
    llm_model_study_kit: str = "gemini-2.5-flash-lite"
    
    llm_thinking_budget: Optional[int] = None
    
    llm_temperature_parse: float = 0.1
    llm_temperature_study_kit: float = 0.4
    
    llm_max_output_tokens_parse: int = 8000
    llm_max_output_tokens_study_kit: int = 6000
    
    llm_timeout_seconds: int = 60
    llm_max_retries: int = 3
    llm_max_concurrency: int = 4
    
    max_pdf_mb: int = 10
    max_pdf_pages: int = 60
    max_input_chars: int = 60000
    min_text_chars_for_text_mode: int = 200

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
