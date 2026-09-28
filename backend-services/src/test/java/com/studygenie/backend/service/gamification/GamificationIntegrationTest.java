package com.studygenie.backend.service.gamification;

import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.event.UserActionCompletedEvent;
import com.studygenie.backend.service.port.GamificationStore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("dev")
public class GamificationIntegrationTest {

    @Autowired
    private ApplicationEventPublisher publisher;

    @Autowired
    private GamificationStore store;

    @Test
    void testEventPublishingUpdatesStore() {
        publisher.publishEvent(UserActionCompletedEvent.create(10L, "Integrator", ActionType.SYLLABUS_UPLOADED, 1));
        
        GamificationProfile profile = store.getProfile(10L);
        assertEquals(10L, profile.userId());
        assertEquals("Integrator", profile.displayName());
        assertEquals(100, profile.currentXp());
    }
}
