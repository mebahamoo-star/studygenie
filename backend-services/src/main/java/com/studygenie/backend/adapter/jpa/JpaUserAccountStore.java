package com.studygenie.backend.adapter.jpa;

import com.studygenie.backend.entity.Student;
import com.studygenie.backend.exception.DuplicateResourceException;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.service.auth.UserAccount;
import com.studygenie.backend.service.auth.UserAccountStore;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class JpaUserAccountStore implements UserAccountStore {

    private final StudentRepository studentRepository;

    public JpaUserAccountStore(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    private UserAccount mapToRecord(Student student) {
        return new UserAccount(
                student.getId(),
                student.getFullName(),
                student.getEmail(),
                student.getPassword(),
                student.getCreatedAt() != null ? student.getCreatedAt().toInstant(ZoneOffset.UTC) : null
        );
    }

    @Override
    public Optional<UserAccount> findByEmail(String normalizedEmail) {
        return studentRepository.findByEmail(normalizedEmail).map(this::mapToRecord);
    }

    @Override
    public Optional<UserAccount> findById(Long id) {
        return studentRepository.findById(id).map(this::mapToRecord);
    }

    @Override
    public boolean existsByEmail(String normalizedEmail) {
        return studentRepository.existsByEmail(normalizedEmail);
    }

    @Override
    public List<UserAccount> findAll() {
        return studentRepository.findAll().stream().map(this::mapToRecord).collect(Collectors.toList());
    }

    @Override
    public UserAccount create(String fullName, String normalizedEmail, String passwordHash) {
        Student student = Student.builder()
                .fullName(fullName)
                .email(normalizedEmail) // Already normalized by AuthService
                .password(passwordHash)
                .university(null)
                .geniePoints(0)
                .streakCount(0)
                .lastStudyDate(null)
                .build();
        try {
            Student saved = studentRepository.saveAndFlush(student);
            return mapToRecord(saved);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("Email already exists");
        }
    }
}
