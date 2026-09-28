package com.studygenie.backend.controller;

import com.studygenie.backend.exception.ResourceNotFoundException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

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

    @GetMapping("/generic")
    public void throwGeneric() {
        throw new RuntimeException("Generic error");
    }

    @GetMapping("/type-mismatch")
    public void throwTypeMismatch(@RequestParam("id") Long id) {
        // do nothing
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
