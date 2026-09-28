package com.studygenie.backend.controller;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.auth.*;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.service.auth.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String remoteAddr = httpRequest.getRemoteAddr();
        AuthResponse response = authService.login(request, remoteAddr);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserSummary>> getMe(@AuthenticationPrincipal AuthenticatedUser user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build(); // Should be intercepted by entry point usually
        }
        UserSummary summary = authService.getMe(user.id());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }
}
