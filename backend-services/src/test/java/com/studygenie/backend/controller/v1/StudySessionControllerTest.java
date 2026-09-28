package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.study.ReviewRequest;
import com.studygenie.backend.dto.study.ReviewResponse;
import com.studygenie.backend.security.JwtService;
import com.studygenie.backend.service.study.StudySessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@org.junit.jupiter.api.Disabled("Java 25 ByteBuddy Mockito bug")
@WebMvcTest(StudySessionController.class)
@AutoConfigureMockMvc(addFilters = false)
public class StudySessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StudySessionService service;

    @MockBean
    private JwtService jwtService;

    @Test
    @WithMockUser(username = "1")
    void testReviewCardsApiResponseEnvelope() throws Exception {
        ReviewResponse mockRes = new ReviewResponse(1, 1, 0, 0, 1, 0, List.of());
        when(service.reviewCards(eq(1L), eq("kit1"), any())).thenReturn(mockRes);

        String payload = """
            {
              "submissionId": "%s",
              "items": [
                { "cardId": "c1", "rating": "GOOD" }
              ]
            }
        """.formatted(UUID.randomUUID().toString());

        mockMvc.perform(post("/api/v1/study-kits/kit1/review")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reviewed").value(1));
    }
}
