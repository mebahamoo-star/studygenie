package com.studygenie.backend.service.browse;

import com.studygenie.backend.dto.browse.CollegeDto;
import com.studygenie.backend.entity.College;
import com.studygenie.backend.entity.University;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.repository.CollegeRepository;
import com.studygenie.backend.repository.UniversityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CollegeService {

    private final CollegeRepository collegeRepository;
    private final UniversityRepository universityRepository;

    public CollegeService(CollegeRepository collegeRepository, UniversityRepository universityRepository) {
        this.collegeRepository = collegeRepository;
        this.universityRepository = universityRepository;
    }

    @Transactional(readOnly = true)
    public List<CollegeDto> getCollegesByUniversity(Long universityId) {
        if (!universityRepository.existsById(universityId)) {
            throw new ResourceNotFoundException("University not found");
        }
        return collegeRepository.findByUniversityId(universityId).stream()
                .map(c -> new CollegeDto(c.getId(), c.getName(), c.getUniversity().getId()))
                .collect(Collectors.toList());
    }

    @Transactional
    public CollegeDto createCollege(Long universityId, String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("College name cannot be empty");
        }
        String trimmed = name.trim();
        University uni = universityRepository.findById(universityId)
                .orElseThrow(() -> new ResourceNotFoundException("University not found"));

        List<College> existing = collegeRepository.findByUniversityId(universityId);
        for (College c : existing) {
            if (c.getName().equalsIgnoreCase(trimmed)) {
                return new CollegeDto(c.getId(), c.getName(), uni.getId());
            }
        }

        College college = collegeRepository.save(College.builder().name(trimmed).university(uni).build());
        return new CollegeDto(college.getId(), college.getName(), uni.getId());
    }
}
