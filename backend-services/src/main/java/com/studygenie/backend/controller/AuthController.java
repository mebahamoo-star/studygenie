package com.studygenie.backend.controller;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.auth.*;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.service.auth.AuthService;
import com.studygenie.backend.service.auth.OAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@io.swagger.v3.oas.annotations.tags.Tag(name = "Authentication", description = "Endpoints for registering, logging in, token refresh, and OAuth2 social login")
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final OAuthService oAuthService;

    public AuthController(AuthService authService, OAuthService oAuthService) {
        this.authService = authService;
        this.oAuthService = oAuthService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String remoteAddr = httpRequest.getRemoteAddr();
        AuthResponse response = authService.login(request, remoteAddr);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/oauth/info")
    public ResponseEntity<ApiResponse<OAuthProviderInfo>> getOAuthInfo(@RequestParam(value = "redirectUri", required = false) String redirectUri) {
        OAuthProviderInfo info = oAuthService.getProviderInfo(redirectUri);
        return ResponseEntity.ok(ApiResponse.ok(info));
    }

    @PostMapping("/oauth/login")
    public ResponseEntity<ApiResponse<AuthResponse>> oauthLogin(@Valid @RequestBody OAuthLoginRequest request) {
        AuthResponse response = oAuthService.authenticate(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserSummary>> getMe(@AuthenticationPrincipal AuthenticatedUser user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserSummary summary = authService.getMe(user.id());
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }
}
