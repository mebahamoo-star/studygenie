package com.studygenie.backend.repository;

import com.studygenie.backend.entity.College;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CollegeRepository extends JpaRepository<College, Long> {
    List<College> findByUniversityId(Long universityId);
}
