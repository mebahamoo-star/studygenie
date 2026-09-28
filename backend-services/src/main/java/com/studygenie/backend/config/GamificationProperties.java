package com.studygenie.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.Map;

@ConfigurationProperties(prefix = "gamification")
public class GamificationProperties {
    
    private Map<String, Integer> xpPerAction;
    private Map<String, Integer> dailyCapPerAction;
    private int streakBadgeThresholdDays = 3; // Default threshold

    public Map<String, Integer> getXpPerAction() {
        return xpPerAction;
    }

    public void setXpPerAction(Map<String, Integer> xpPerAction) {
        this.xpPerAction = xpPerAction;
    }

    public Map<String, Integer> getDailyCapPerAction() {
        return dailyCapPerAction;
    }

    public void setDailyCapPerAction(Map<String, Integer> dailyCapPerAction) {
        this.dailyCapPerAction = dailyCapPerAction;
    }

    public int getStreakBadgeThresholdDays() {
        return streakBadgeThresholdDays;
    }

    public void setStreakBadgeThresholdDays(int streakBadgeThresholdDays) {
        this.streakBadgeThresholdDays = streakBadgeThresholdDays;
    }
}
