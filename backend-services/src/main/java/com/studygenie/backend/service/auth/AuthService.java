package com.studygenie.backend.service.auth;

import com.studygenie.backend.dto.auth.*;
import com.studygenie.backend.exception.TooManyRequestsException;
import com.studygenie.backend.exception.UnauthorizedException;
import com.studygenie.backend.security.JwtService;
import com.studygenie.backend.security.RefreshTokenGenerator;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;

@Service
public class AuthService {

    private final UserAccountStore userStore;
    private final RefreshTokenStore refreshStore;
    private final JwtService jwtService;
    private final RefreshTokenGenerator refreshTokenGenerator;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttemptService;
    private final Clock clock;

    public AuthService(UserAccountStore userStore, RefreshTokenStore refreshStore, JwtService jwtService,
                       RefreshTokenGenerator refreshTokenGenerator, PasswordEncoder passwordEncoder,
                       LoginAttemptService loginAttemptService, Clock clock) {
        this.userStore = userStore;
        this.refreshStore = refreshStore;
        this.jwtService = jwtService;
        this.refreshTokenGenerator = refreshTokenGenerator;
        this.passwordEncoder = passwordEncoder;
        this.loginAttemptService = loginAttemptService;
        this.clock = clock;
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = normalize(request.email());
        String hash = passwordEncoder.encode(request.password());
        
        UserAccount user = userStore.create(request.fullName(), normalizedEmail, hash);
        
        return issueTokens(user, false);
    }

    public AuthResponse login(LoginRequest request, String remoteAddr) {
        String normalizedEmail = normalize(request.email());
        String attemptKey = normalizedEmail + "|" + remoteAddr;

        if (loginAttemptService.isBlocked(attemptKey)) {
            throw new TooManyRequestsException("Too many attempts. Try again later.");
        }

        UserAccount user = userStore.findByEmail(normalizedEmail).orElse(null);
        
        boolean matches = false;
        if (user != null) {
            matches = passwordEncoder.matches(request.password(), user.passwordHash());
        } else {
            // Dummy check to prevent timing attacks
            passwordEncoder.matches(request.password(), "$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhash");
        }

        if (!matches) {
            loginAttemptService.loginFailed(attemptKey);
            throw new UnauthorizedException("Invalid email or password");
        }

        loginAttemptService.loginSucceeded(attemptKey);
        return issueTokens(user, request.rememberMe());
    }

    public AuthResponse refresh(RefreshRequest request) {
        String tokenHash = refreshTokenGenerator.hashToken(request.refreshToken());
        RefreshTokenRecord record = refreshStore.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (record.revoked()) {
            refreshStore.revokeAllForUser(record.userId());
            throw new UnauthorizedException("Invalid refresh token");
        }

        if (record.expiresAt().isBefore(clock.instant())) {
            throw new UnauthorizedException("Refresh token expired");
        }

        UserAccount user = userStore.findById(record.userId())
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token")); // User deleted

        refreshStore.revoke(record.id());
        
        return issueTokens(user, record.rememberMe());
    }

    public void logout(LogoutRequest request) {
        String tokenHash = refreshTokenGenerator.hashToken(request.refreshToken());
        refreshStore.findByTokenHash(tokenHash).ifPresent(r -> refreshStore.revoke(r.id()));
    }

    public UserSummary getMe(Long userId) {
        UserAccount user = userStore.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("Unauthorized"));
        return new UserSummary(user.id(), user.fullName(), user.email());
    }

    private AuthResponse issueTokens(UserAccount user, boolean rememberMe) {
        String accessToken = jwtService.generateAccessToken(user.id(), user.email());
        String refreshToken = refreshTokenGenerator.generateToken();
        String refreshTokenHash = refreshTokenGenerator.hashToken(refreshToken);

        long refreshTtl = rememberMe ? jwtService.rememberMeExpirationMs() : jwtService.refreshExpirationMs();
        Instant refreshExpiresAt = clock.instant().plusMillis(refreshTtl);

        RefreshTokenRecord rtr = new RefreshTokenRecord(
                null, user.id(), refreshTokenHash, clock.instant(), refreshExpiresAt, rememberMe, false
        );
        refreshStore.save(rtr);

        UserSummary summary = new UserSummary(user.id(), user.fullName(), user.email());
        return new AuthResponse(
                accessToken, refreshToken, jwtService.accessTokenTtlSeconds(), refreshTtl / 1000, summary
        );
    }
}
