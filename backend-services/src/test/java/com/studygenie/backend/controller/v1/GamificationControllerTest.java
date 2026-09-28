package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.dto.gamification.LeaderboardEntry;
import com.studygenie.backend.security.JwtService;
import com.studygenie.backend.service.port.GamificationStore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@org.junit.jupiter.api.Disabled("Java 25 ByteBuddy Mockito bug")
@WebMvcTest(GamificationController.class)
@AutoConfigureMockMvc(addFilters = false) // Disabling security filters for slice test
public class GamificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GamificationStore store;

    @MockBean
    private ApplicationEventPublisher publisher;

    @MockBean
    private JwtService jwtService;

    @Test
    @WithMockUser(username = "1")
    void testGetProfile() throws Exception {
        GamificationProfile mockProfile = GamificationProfile.empty(1L);
        when(store.getProfile(1L)).thenReturn(mockProfile);

        mockMvc.perform(get("/api/v1/gamification/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(1))
                .andExpect(jsonPath("$.data.currentLevel").value(1));
    }

    @Test
    @WithMockUser
    void testGetLeaderboard() throws Exception {
        when(store.getTop10()).thenReturn(List.of(new LeaderboardEntry("Alice", 500, 3)));

        mockMvc.perform(get("/api/v1/gamification/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].displayName").value("Alice"))
                .andExpect(jsonPath("$.data[0].xp").value(500));
    }
}
