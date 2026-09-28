package com.studygenie.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.dto.auth.LoginRequest;
import com.studygenie.backend.dto.auth.LogoutRequest;
import com.studygenie.backend.dto.auth.RefreshRequest;
import com.studygenie.backend.dto.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testRegisterSuccessAndDuplicateEmail() throws Exception {
        String uniqueEmail = "user-" + UUID.randomUUID() + "@example.com";
        RegisterRequest req = new RegisterRequest("Test User", uniqueEmail, "Password123");

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(jsonPath("$.data.refreshToken").exists())
                .andReturn();
        
        String responseBody = result.getResponse().getContentAsString();
        assertFalse(responseBody.contains("password"), "Password should not be in the response");

        // Duplicate email test
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));

        // Case insensitivity duplicate test
        RegisterRequest reqUpper = new RegisterRequest("Test User 2", uniqueEmail.toUpperCase(), "Password123");
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqUpper)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testRegisterValidationErrors() throws Exception {
        RegisterRequest req = new RegisterRequest("", "invalid-email", "short");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", hasSize(greaterThanOrEqualTo(3))));
    }
    
    @Test
    void testPasswordTooLongValidation() throws Exception {
        String longPassword = "a1".repeat(50); // 100 bytes
        RegisterRequest req = new RegisterRequest("Test", "a@example.com", longPassword);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("password"));
    }

    @Test
    void testLoginSuccessAndFailure() throws Exception {
        String uniqueEmail = "login-" + UUID.randomUUID() + "@example.com";
        RegisterRequest registerReq = new RegisterRequest("Test User", uniqueEmail, "Password123");
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        // Success
        LoginRequest req = new LoginRequest(uniqueEmail, "Password123", true);
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").exists());

        // Wrong password
        LoginRequest reqWrongPass = new LoginRequest(uniqueEmail, "Wrong123", false);
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqWrongPass)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));

        // Unknown email
        LoginRequest reqWrongEmail = new LoginRequest("unknown@example.com", "Password123", false);
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqWrongEmail)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password")); // Identical message
    }

    @Test
    void testRateLimiter() throws Exception {
        String uniqueEmail = "rate-" + UUID.randomUUID() + "@example.com";
        LoginRequest reqWrong = new LoginRequest(uniqueEmail, "Wrong123", false);
        
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .header("X-Forwarded-For", "192.168.1.100")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(reqWrong)))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/auth/login")
                .header("X-Forwarded-For", "192.168.1.100")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqWrong)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Too many attempts. Try again later."));

        // Different email on same IP doesn't block? Wait, key is email + ip. So different email should be unblocked.
        LoginRequest otherReq = new LoginRequest("other@example.com", "Wrong123", false);
        mockMvc.perform(post("/api/auth/login")
                .header("X-Forwarded-For", "192.168.1.100")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(otherReq)))
                .andExpect(status().isUnauthorized()); // Not 429
    }

    @Test
    void testGetMeAndLogout() throws Exception {
        String uniqueEmail = "me-" + UUID.randomUUID() + "@example.com";
        RegisterRequest req = new RegisterRequest("Me User", uniqueEmail, "Password123");

        String res = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();
        
        String accessToken = objectMapper.readTree(res).path("data").path("accessToken").asText();
        String refreshToken = objectMapper.readTree(res).path("data").path("refreshToken").asText();

        // Get me
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(uniqueEmail));

        // Refresh
        RefreshRequest refreshReq = new RefreshRequest(refreshToken);
        String refreshRes = mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        
        String newRefreshToken = objectMapper.readTree(refreshRes).path("data").path("refreshToken").asText();

        // Reusing old refresh token -> 401
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid refresh token"));

        // Family revocation check (new token should now be revoked)
        RefreshRequest newRefreshReq = new RefreshRequest(newRefreshToken);
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newRefreshReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid refresh token"));

        // Logout
        LogoutRequest logoutReq = new LogoutRequest(newRefreshToken);
        mockMvc.perform(post("/api/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(logoutReq)))
                .andExpect(status().isOk());

        // Logout twice
        mockMvc.perform(post("/api/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(logoutReq)))
                .andExpect(status().isOk());
    }

    @Test
    void testAuthExceptions() throws Exception {
        // No token
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Unauthorized"));

        // Invalid token
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer not-a-valid-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Unauthorized"));

        // Expired token is hard to test in integration without a real token, but the filter logic sets "TOKEN_EXPIRED".
        // Health check permitAll with bad token
        mockMvc.perform(get("/api/health")
                .header("Authorization", "Bearer bad-token"))
                .andExpect(status().isOk());
    }
}
