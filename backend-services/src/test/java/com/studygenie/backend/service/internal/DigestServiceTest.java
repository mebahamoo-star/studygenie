package com.studygenie.backend.service.internal;

import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.dto.internal.DigestEntry;
import com.studygenie.backend.dto.study.CardSchedule;
import com.studygenie.backend.service.auth.UserAccount;
import com.studygenie.backend.service.auth.UserAccountStore;
import com.studygenie.backend.service.port.CardScheduleStore;
import com.studygenie.backend.service.port.GamificationStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DigestServiceTest {

    private UserAccountStore userAccountStore;
    private CardScheduleStore cardScheduleStore;
    private GamificationStore gamificationStore;
    private Clock clock;
    private DigestService digestService;

    @BeforeEach
    void setUp() {
        userAccountStore = mock(UserAccountStore.class);
        cardScheduleStore = mock(CardScheduleStore.class);
        gamificationStore = mock(GamificationStore.class);
        // Fixed at exactly midnight of 2026-10-01
        clock = Clock.fixed(Instant.parse("2026-10-01T00:00:00Z"), ZoneId.of("UTC"));
        digestService = new DigestService(userAccountStore, cardScheduleStore, gamificationStore, clock);
    }

    @Test
    void shouldReturnUserWithDueCardsOnly() {
        UserAccount u1 = new UserAccount(1L, "Alice", "alice@test.com", "hash", Instant.now());
        when(userAccountStore.findAll()).thenReturn(List.of(u1));
        
        GamificationProfile p1 = new GamificationProfile(1L, "Alice", 100, 2, 0, 0, LocalDate.of(2026, 9, 30), java.util.List.of(), java.util.Map.of(), Set.of());
        when(gamificationStore.getProfile(1L)).thenReturn(p1);

        // One due today, one due yesterday, one due tomorrow
        CardSchedule c1 = new CardSchedule("card1", 2.5, 0, 0, 0, LocalDate.of(2026, 10, 1), null);
        CardSchedule c2 = new CardSchedule("card2", 2.5, 0, 0, 0, LocalDate.of(2026, 9, 30), null);
        CardSchedule c3 = new CardSchedule("card3", 2.5, 0, 0, 0, LocalDate.of(2026, 10, 2), null);
        when(cardScheduleStore.findByUserId(1L)).thenReturn(List.of(c1, c2, c3));

        List<DigestEntry> result = digestService.generateDailyReminders(1);
        
        assertThat(result).hasSize(1);
        assertThat(result.get(0).dueCardsCount()).isEqualTo(2); // today and yesterday
        assertThat(result.get(0).streakAtRisk()).isFalse(); // streak is 0, so no risk
    }

    @Test
    void shouldReturnUserWithStreakAtRiskOnly() {
        UserAccount u1 = new UserAccount(1L, "Bob", "bob@test.com", "hash", Instant.now());
        when(userAccountStore.findAll()).thenReturn(List.of(u1));
        
        GamificationProfile p1 = new GamificationProfile(1L, "Bob", 100, 2, 5, 5, LocalDate.of(2026, 9, 30), java.util.List.of(), java.util.Map.of(), Set.of());
        when(gamificationStore.getProfile(1L)).thenReturn(p1);

        when(cardScheduleStore.findByUserId(1L)).thenReturn(List.of());

        List<DigestEntry> result = digestService.generateDailyReminders(1);
        
        assertThat(result).hasSize(1);
        assertThat(result.get(0).dueCardsCount()).isEqualTo(0);
        assertThat(result.get(0).streakAtRisk()).isTrue();
    }

    @Test
    void shouldExcludeUserWithNeither() {
        UserAccount u1 = new UserAccount(1L, "Charlie", "char@test.com", "hash", Instant.now());
        when(userAccountStore.findAll()).thenReturn(List.of(u1));
        
        // Active today, streak not at risk
        GamificationProfile p1 = new GamificationProfile(1L, "Charlie", 100, 2, 5, 5, LocalDate.of(2026, 10, 1), java.util.List.of(), java.util.Map.of(), Set.of());
        when(gamificationStore.getProfile(1L)).thenReturn(p1);

        CardSchedule c1 = new CardSchedule("card1", 2.5, 0, 0, 0, LocalDate.of(2026, 10, 2), null);
        when(cardScheduleStore.findByUserId(1L)).thenReturn(List.of(c1));

        List<DigestEntry> result = digestService.generateDailyReminders(1);
        
        assertThat(result).isEmpty();
    }
}


