package com.studygenie.backend.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtProperties properties;
    private AdjustableClock clock;
    private JwtService jwtService;

    static class AdjustableClock extends Clock {
        private Instant instant;

        AdjustableClock(Instant instant) {
            this.instant = instant;
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }

        public void advance(long millis) {
            this.instant = this.instant.plusMillis(millis);
        }
    }

    @BeforeEach
    void setUp() {
        properties = new JwtProperties("01234567890123456789012345678912", "studygenie", 900000, 604800000, 2592000000L);
        clock = new AdjustableClock(Instant.parse("2023-01-01T00:00:00Z"));
        jwtService = new JwtService(properties, clock);
    }

    @Test
    void testGenerateAndValidateValidToken() {
        String token = jwtService.generateAccessToken(1L, "test@example.com");
        JwtService.TokenValidationResult result = jwtService.validateToken(token);
        assertEquals(JwtService.TokenStatus.VALID, result.status());
        assertEquals("1", result.claims().getSubject());
        assertEquals("test@example.com", result.claims().get("email"));
        assertEquals("access", result.claims().get("typ"));
    }

    @Test
    void testExpiredToken() {
        String token = jwtService.generateAccessToken(1L, "test@example.com");
        clock.advance(900001); // advance past expiration
        JwtService.TokenValidationResult result = jwtService.validateToken(token);
        assertEquals(JwtService.TokenStatus.EXPIRED, result.status());
    }

    @Test
    void testWrongIssuer() {
        String token = Jwts.builder()
                .subject("1")
                .claim("typ", "access")
                .issuer("wrong-issuer")
                .issuedAt(new Date(clock.millis()))
                .expiration(new Date(clock.millis() + 900000))
                .signWith(Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8)))
                .compact();

        JwtService.TokenValidationResult result = jwtService.validateToken(token);
        assertEquals(JwtService.TokenStatus.INVALID, result.status());
    }

    @Test
    void testWrongTyp() {
        String token = Jwts.builder()
                .subject("1")
                .claim("typ", "refresh")
                .issuer(properties.issuer())
                .issuedAt(new Date(clock.millis()))
                .expiration(new Date(clock.millis() + 900000))
                .signWith(Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8)))
                .compact();

        JwtService.TokenValidationResult result = jwtService.validateToken(token);
        assertEquals(JwtService.TokenStatus.INVALID, result.status());
    }

    @Test
    void testWrongSecret() {
        String token = Jwts.builder()
                .subject("1")
                .claim("typ", "access")
                .issuer(properties.issuer())
                .issuedAt(new Date(clock.millis()))
                .expiration(new Date(clock.millis() + 900000))
                .signWith(Keys.hmacShaKeyFor("different-secret-0123456789012345".getBytes(StandardCharsets.UTF_8)))
                .compact();

        JwtService.TokenValidationResult result = jwtService.validateToken(token);
        assertEquals(JwtService.TokenStatus.INVALID, result.status());
    }

    @Test
    void testAlgNoneRejected() {
        String token = Jwts.builder()
                .subject("1")
                .claim("typ", "access")
                .issuer(properties.issuer())
                .issuedAt(new Date(clock.millis()))
                .expiration(new Date(clock.millis() + 900000))
                .compact();

        JwtService.TokenValidationResult result = jwtService.validateToken(token);
        assertEquals(JwtService.TokenStatus.INVALID, result.status());
    }

    @Test
    void testMalformedString() {
        JwtService.TokenValidationResult result = jwtService.validateToken("not-a-jwt");
        assertEquals(JwtService.TokenStatus.INVALID, result.status());
    }
}
