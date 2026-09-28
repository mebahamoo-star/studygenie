package com.studygenie.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Date;
import java.util.UUID;

/**
 * Service for generating and parsing JWT access tokens.
 */
@Service
public class JwtService {

    private final JwtProperties properties;
    private final Clock clock;
    private final SecretKey key;

    public JwtService(JwtProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generates an access token for the given user id and email.
     */
    public String generateAccessToken(Long userId, String email) {
        long nowMillis = clock.millis();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .claim("typ", "access")
                .issuer(properties.issuer())
                .issuedAt(new Date(nowMillis))
                .expiration(new Date(nowMillis + properties.expirationMs()))
                .id(UUID.randomUUID().toString())
                .signWith(key)
                .compact();
    }

    public enum TokenStatus {
        VALID, EXPIRED, INVALID
    }

    public record TokenValidationResult(TokenStatus status, Claims claims) {
        public static TokenValidationResult valid(Claims claims) {
            return new TokenValidationResult(TokenStatus.VALID, claims);
        }
        public static TokenValidationResult expired() {
            return new TokenValidationResult(TokenStatus.EXPIRED, null);
        }
        public static TokenValidationResult invalid() {
            return new TokenValidationResult(TokenStatus.INVALID, null);
        }
    }

    /**
     * Validates and parses the given JWT.
     */
    public TokenValidationResult validateToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(properties.issuer())
                    .clock(() -> new Date(clock.millis()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!"access".equals(claims.get("typ"))) {
                return TokenValidationResult.invalid();
            }

            return TokenValidationResult.valid(claims);
        } catch (ExpiredJwtException e) {
            return TokenValidationResult.expired();
        } catch (JwtException | IllegalArgumentException e) {
            return TokenValidationResult.invalid();
        }
    }

    public long accessTokenTtlSeconds() {
        return properties.expirationMs() / 1000;
    }

    public long refreshExpirationMs() {
        return properties.refreshExpirationMs();
    }

    public long rememberMeExpirationMs() {
        return properties.rememberMeExpirationMs();
    }
}
