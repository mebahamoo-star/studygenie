package com.studygenie.backend.entity.enums;

public enum AccountStatus {
    ACTIVE,
    SUSPENDED;

    public static AccountStatus fromNullable(String value) {
        if (value == null || value.isBlank()) {
            return ACTIVE;
        }
        try {
            return AccountStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return ACTIVE;
        }
    }
}
