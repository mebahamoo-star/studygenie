package com.studygenie.backend.controller;

import com.studygenie.backend.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/test-exception")
@Validated
public class TestExceptionController {

    @GetMapping("/not-found")
    public void throwNotFound() {
        throw new ResourceNotFoundException("Test not found");
    }

    @PostMapping("/validation")
    public void throwValidation(@Valid @RequestBody DummyRequest request) {
        // do nothing
    }

    @GetMapping("/access-denied")
    public void throwAccessDenied() {
        throw new AccessDeniedException("Test access denied");
    }

    @GetMapping("/auth")
    public void throwAuthException() {
        throw new org.springframework.security.authentication.BadCredentialsException("Auth error");
    }

    @GetMapping("/generic")
    public void throwGeneric() {
        throw new RuntimeException("Generic error");
    }

    @GetMapping("/type-mismatch")
    public void throwTypeMismatch(@RequestParam("id") Long id) {
        // do nothing
    }

    @PostMapping(value = "/media-type", consumes = "application/json", produces = "application/json")
    public DummyRequest throwMediaType(@RequestBody DummyRequest req) {
        return req;
    }

    @GetMapping("/method-validation")
    public void throwMethodValidation(
            @RequestParam("param") @NotBlank @Min(5) String param) {
        // do nothing
    }

    @PostMapping("/missing-part")
    public void throwMissingPart(@RequestPart("file") MultipartFile file) {
        // do nothing
    }

    @GetMapping("/missing-path")
    public void throwMissingPath(@PathVariable("id") Long id) {
    }

    @GetMapping("/constraint")
    public void throwConstraintViolation() {
        throw new jakarta.validation.ConstraintViolationException("createUser.arg0 leaked", new java.util.HashSet<>());
    }

    @GetMapping("/class-validation")
    public void throwClassValidation() throws NoSuchMethodException, org.springframework.web.bind.MethodArgumentNotValidException {
        org.springframework.validation.MapBindingResult bindingResult = new org.springframework.validation.MapBindingResult(new java.util.HashMap<>(), "dummyRequest");
        bindingResult.addError(new org.springframework.validation.ObjectError("dummyRequest", "Class level error"));
        org.springframework.core.MethodParameter methodParameter = new org.springframework.core.MethodParameter(
                this.getClass().getDeclaredMethod("throwClassValidation"), -1);
        throw new org.springframework.web.bind.MethodArgumentNotValidException(methodParameter, bindingResult);
    }

    @GetMapping(value = "/not-acceptable", produces = "application/pdf")
    public String throwNotAcceptable() {
        return "test";
    }
    public static class DummyRequest {
        @NotBlank(message = "Name is required")
        private String name;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }
}
