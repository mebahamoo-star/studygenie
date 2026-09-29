package com.studygenie.backend.service.port;

import com.studygenie.backend.dto.study.CardSchedule;
import java.util.List;
import java.util.function.Function;

public interface CardScheduleStore {
    public record CardScheduleUpdateResult(CardSchedule schedule, boolean counted) {}

    CardScheduleUpdateResult update(Long userId, String kitId, String cardId, Function<CardSchedule, CardScheduleUpdateResult> updater);
    List<CardSchedule> findByUserId(Long userId);
    List<CardSchedule> findByUserIdAndKitId(Long userId, String kitId);
}

