package com.studygenie.backend.entity.enums;

public enum Role {
    STUDENT,
    MODERATOR,
    ADMIN;

    public static Role fromNullable(String value) {
        if (value == null || value.isBlank()) {
            return STUDENT;
        }
        try {
            return Role.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return STUDENT;
        }
    }
}
