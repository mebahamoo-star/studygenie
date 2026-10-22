package com.studygenie.backend.service.browse;

import com.studygenie.backend.dto.browse.UniversityDto;
import com.studygenie.backend.entity.University;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.repository.UniversityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UniversityService {

    private final UniversityRepository universityRepository;

    public UniversityService(UniversityRepository universityRepository) {
        this.universityRepository = universityRepository;
    }

    @Transactional(readOnly = true)
    public List<UniversityDto> getAllUniversities() {
        return universityRepository.findAll().stream()
                .map(u -> new UniversityDto(u.getId(), u.getName()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UniversityDto getUniversity(Long id) {
        University u = universityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("University not found"));
        return new UniversityDto(u.getId(), u.getName());
    }

    @Transactional
    public UniversityDto createUniversity(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("University name cannot be empty");
        }
        String trimmed = name.trim();
        List<University> existing = universityRepository.findAll();
        for (University u : existing) {
            if (u.getName().equalsIgnoreCase(trimmed)) {
                return new UniversityDto(u.getId(), u.getName());
            }
        }
        University created = universityRepository.save(University.builder().name(trimmed).build());
        return new UniversityDto(created.getId(), created.getName());
    }
}
