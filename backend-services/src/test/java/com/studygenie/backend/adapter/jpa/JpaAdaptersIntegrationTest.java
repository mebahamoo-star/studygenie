package com.studygenie.backend.adapter.jpa;

import com.studygenie.backend.entity.Student;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.service.auth.RefreshTokenRecord;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("dev")
public class JpaAdaptersIntegrationTest {

    @Autowired
    private JpaRefreshTokenStore refreshTokenStore;

    @Autowired
    private StudentRepository studentRepository;

    @Test
    void testRefreshTokenCreatedAt() {
        Student s = new Student();
        s.setFullName("Token Tester");
        s.setEmail("token" + System.currentTimeMillis() + "@test.com");
        s.setPassword("hash");
        s = studentRepository.save(s);

        RefreshTokenRecord r = new RefreshTokenRecord(
                null, s.getId(), "test-hash-123", null, Instant.now().plus(1, ChronoUnit.DAYS), true, false
        );

        RefreshTokenRecord saved = refreshTokenStore.save(r);
        assertNotNull(saved.createdAt(), "CreatedAt should be populated on save");

        RefreshTokenRecord loaded = refreshTokenStore.findByTokenHash("test-hash-123").get();
        assertEquals(saved.createdAt(), loaded.createdAt(), "CreatedAt should be persisted correctly");
    }
}
