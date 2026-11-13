package com.studygenie.backend.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminCatalogDtos() {

    public record UniversityAdminDto(
            Long id,
            String name,
            long collegeCount,
            long courseCount
    ) {}

    public record UniversityWriteRequest(
            @NotBlank
            @Size(max = 150)
            String name
    ) {}

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
