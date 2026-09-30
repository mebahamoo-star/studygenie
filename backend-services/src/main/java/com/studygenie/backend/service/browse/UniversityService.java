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
}
