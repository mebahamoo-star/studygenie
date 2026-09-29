package com.studygenie.backend.service.internal;

import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.dto.internal.DigestEntry;
import com.studygenie.backend.dto.study.CardSchedule;
import com.studygenie.backend.service.auth.UserAccount;
import com.studygenie.backend.service.auth.UserAccountStore;
import com.studygenie.backend.service.port.CardScheduleStore;
import com.studygenie.backend.service.port.GamificationStore;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class DigestService {

    private final UserAccountStore userAccountStore;
    private final CardScheduleStore cardScheduleStore;
    private final GamificationStore gamificationStore;
    private final Clock clock;

    public DigestService(UserAccountStore userAccountStore,
                         CardScheduleStore cardScheduleStore,
                         GamificationStore gamificationStore,
                         Clock clock) {
        this.userAccountStore = userAccountStore;
        this.cardScheduleStore = cardScheduleStore;
        this.gamificationStore = gamificationStore;
        this.clock = clock;
    }

    public List<DigestEntry> generateDailyReminders(int minDueCards) {
        List<DigestEntry> result = new ArrayList<>();
        LocalDate today = LocalDate.now(clock);

        // TODO(persistence): In a real database, this should be paginated or streamed
        List<UserAccount> users = userAccountStore.findAll();

        for (UserAccount user : users) {
            Long userId = user.id();
            GamificationProfile profile = gamificationStore.getProfile(userId);
            
            // Calculate streak at risk
            boolean streakAtRisk = false;
            if (profile.currentStreakDays() > 0) {
                if (profile.lastActiveDate() == null || !profile.lastActiveDate().equals(today)) {
                    streakAtRisk = true;
                }
            }

            // Calculate due cards count
            List<CardSchedule> schedules = cardScheduleStore.findByUserId(userId);
            int dueCardsCount = 0;
            for (CardSchedule schedule : schedules) {
                if (schedule.dueDate() != null && !schedule.dueDate().isAfter(today)) {
                    dueCardsCount++;
                }
            }

            if (dueCardsCount >= minDueCards || streakAtRisk) {
                result.add(new DigestEntry(
                        userId,
                        user.email(),
                        user.fullName(),
                        dueCardsCount,
                        streakAtRisk,
                        profile.currentStreakDays(),
                        profile.currentXp(),
                        profile.currentLevel()
                ));
            }
        }

        return result;
    }
}
