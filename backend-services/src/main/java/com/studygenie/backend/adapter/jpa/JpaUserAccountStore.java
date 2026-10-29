package com.studygenie.backend.adapter.jpa;

import com.studygenie.backend.entity.Student;
import com.studygenie.backend.exception.DuplicateResourceException;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.service.auth.UserAccount;
import com.studygenie.backend.service.auth.UserAccountStore;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
                .authProvider("LOCAL")
                .build();
        try {
            Student saved = studentRepository.saveAndFlush(student);
            return mapToRecord(saved);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("Email already exists");
        }
    }

    @Override
    public UserAccount findOrCreateOAuthUser(String fullName, String normalizedEmail, String provider, String providerId, String avatarUrl) {
        Optional<Student> existing = studentRepository.findByEmail(normalizedEmail);
        if (existing.isPresent()) {
            Student student = existing.get();
            boolean changed = false;
            if (student.getAuthProvider() == null || student.getAuthProvider().equalsIgnoreCase("LOCAL")) {
                student.setAuthProvider(provider);
                changed = true;
            }
            if (providerId != null && student.getProviderId() == null) {
                student.setProviderId(providerId);
                changed = true;
            }
            if (avatarUrl != null && student.getAvatarUrl() == null) {
                student.setAvatarUrl(avatarUrl);
                changed = true;
            }
            if (changed) {
                student = studentRepository.save(student);
            }
            return mapToRecord(student);
        }

        // Create new student with OAuth provider details
        String randomPasswordHash = new BCryptPasswordEncoder().encode(UUID.randomUUID().toString());
        Student newStudent = Student.builder()
                .fullName((fullName != null && !fullName.isBlank()) ? fullName : normalizedEmail.split("@")[0])
                .email(normalizedEmail)
                .password(randomPasswordHash)
                .authProvider(provider)
                .providerId(providerId)
                .avatarUrl(avatarUrl)
                .geniePoints(0)
                .streakCount(0)
                .longestStreakDays(0)
                .build();

        Student saved = studentRepository.saveAndFlush(newStudent);
        return mapToRecord(saved);
    }
}
