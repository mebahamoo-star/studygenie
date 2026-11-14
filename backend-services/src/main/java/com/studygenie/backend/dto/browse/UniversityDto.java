package com.studygenie.backend.dto.browse;

public record UniversityDto(Long id, String name, String city) {
    public UniversityDto(Long id, String name) {
        this(id, name, null);
    }
}
