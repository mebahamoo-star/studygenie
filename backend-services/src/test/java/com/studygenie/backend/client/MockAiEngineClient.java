package com.studygenie.backend.client;

import com.studygenie.backend.dto.ai.*;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@Component
@Primary
@Profile("test")
public class MockAiEngineClient implements AiEngineClient {

    @Override
    public ParseResponseData parseSyllabus(MultipartFile file, String courseName, String languageHint) {
        return new ParseResponseData(null, null, null, 0, null, null, 0, 0, null, null);
    }

    @Override
    public StudyKitResponseData generateStudyKit(GenerateStudyKitRequest request) {
        return new StudyKitResponseData(null, null, null);
    }

    @Override
    public PlanResponseData generatePlan(GeneratePlanRequest request) {
        if (request.topics() != null && !request.topics().isEmpty()) {
            int completedToday = request.getCompletedTodayMinutes() != null ? Math.max(0, request.getCompletedTodayMinutes()) : 0;
            if (completedToday == 0 && request.topics().size() == 1) {
                Task task = new Task(request.startDate(), request.topics().get(0).ref(), "LEARN", 120);
                return new PlanResponseData(List.of(task), List.of(), new PlanSummary("NORMAL", 1, 120, 120, 1, 0, true, List.of()));
            }
            int dailyCap = Math.max(30, (int) Math.round(request.dailyHours() * 60));
            int todayRem = Math.max(0, dailyCap - completedToday);
            List<Task> tasks = new java.util.ArrayList<>();
            LocalDate dayCursor = request.startDate();
            int dayRem = todayRem;
            for (TopicPlanInput topic : request.topics()) {
                int needed = Math.max(30, (int) Math.round(topic.estimatedHours() * 60));
                while (needed > 0) {
                    if (dayRem <= 0) {
                        dayCursor = dayCursor.plusDays(1);
                        dayRem = dailyCap;
                    }
                    int take = Math.min(needed, dayRem);
                    tasks.add(new Task(dayCursor, topic.ref(), "STUDY", take));
                    needed -= take;
                    dayRem -= take;
                }
            }
            int totalMins = tasks.stream().mapToInt(Task::minutes).sum();
            return new PlanResponseData(tasks, List.of(), new PlanSummary("NORMAL", 1, dailyCap, totalMins, request.topics().size(), 0, true, List.of()));
        }
        return new PlanResponseData(List.of(), List.of(), new PlanSummary("NORMAL", 0, 0, 0, 0, 0, true, List.of()));
    }
}

