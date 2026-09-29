package com.studygenie.backend.controller.internal;

import com.studygenie.backend.service.internal.DigestService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class DigestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DigestService digestService;

    @Test
    void missingTokenShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/internal/digest/daily-reminders"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongTokenShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/internal/digest/daily-reminders")
                .header("X-Internal-Token", "wrong-token"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void aiEngineTokenShouldReturn401() throws Exception {
        // AI engine token is "dev-internal-token-change-me" in application-dev.properties
        mockMvc.perform(get("/api/internal/digest/daily-reminders")
                .header("X-Internal-Token", "dev-internal-token-change-me"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void normalUserJwtShouldNotWorkIfMissingInternalToken() throws Exception {
        // Just providing a random JWT won't help, internal token is still required
        mockMvc.perform(get("/api/internal/digest/daily-reminders")
                .header("Authorization", "Bearer somerandomjwt"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void correctTokenShouldReturn200() throws Exception {
        
        
        mockMvc.perform(get("/api/internal/digest/daily-reminders")
                .header("X-Internal-Token", "dev-n8n-token-change-me"))
               .andExpect(status().isOk());
    }
}


