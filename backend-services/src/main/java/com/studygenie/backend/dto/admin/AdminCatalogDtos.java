package com.studygenie.backend.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminCatalogDtos() {

    public record UniversityAdminDto(
            Long id,
            String name,
            String city,
            long collegeCount,
            long courseCount
    ) {
        public UniversityAdminDto(Long id, String name, long collegeCount, long courseCount) {
            this(id, name, null, collegeCount, courseCount);
        }
    }

    public record UniversityWriteRequest(
            @NotBlank
            @Size(max = 150)
            String name,
            @Size(max = 150)
            String city
    ) {
        public UniversityWriteRequest(String name) {
            this(name, null);
        }
    }

    public record CollegeAdminDto(
            Long id,
            String name,
            Long universityId,
            String universityName,
            long courseCount
    ) {}

    public record CollegeWriteRequest(
            @NotNull
            Long universityId,
            @NotBlank
            @Size(max = 150)
            String name
    ) {}
}
