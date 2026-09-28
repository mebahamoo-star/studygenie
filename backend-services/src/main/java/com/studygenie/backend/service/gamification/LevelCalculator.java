package com.studygenie.backend.service.gamification;

import org.springframework.stereotype.Component;

@Component
public class LevelCalculator {

    /**
     * Calculates the level based on the cumulative XP formula: XP = 50 * L * (L - 1).
     * O(1) computation using floor((1 + sqrt(1 + XP / 12.5)) / 2) with integer correction.
     */
    public int calculateLevel(int xp) {
        if (xp < 0) return 1;
        
        // Initial estimate using float math
        int estL = (int) ((1 + Math.sqrt(1 + xp / 12.5)) / 2);
        
        // Integer correction to prevent floating point inaccuracies at boundaries
        while (requiredXpForLevel(estL + 1) <= xp) {
            estL++;
        }
        while (estL > 1 && requiredXpForLevel(estL) > xp) {
            estL--;
        }
        
        return estL;
    }

    public int requiredXpForLevel(int level) {
        if (level <= 1) return 0;
        return 50 * level * (level - 1);
    }
}
