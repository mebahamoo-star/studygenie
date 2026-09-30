package com.studygenie.backend.adapter.jpa;

import com.studygenie.backend.entity.RefreshToken;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.repository.RefreshTokenRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.service.auth.RefreshTokenRecord;
import com.studygenie.backend.service.auth.RefreshTokenStore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.List;

@Service
public class JpaRefreshTokenStore implements RefreshTokenStore {

    private final RefreshTokenRepository refreshTokenRepository;
    private final StudentRepository studentRepository;

    public JpaRefreshTokenStore(RefreshTokenRepository refreshTokenRepository, StudentRepository studentRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.studentRepository = studentRepository;
    }

    private RefreshTokenRecord mapToRecord(RefreshToken entity) {
        return new RefreshTokenRecord(
                entity.getId(),
                entity.getStudent().getId(),
                entity.getTokenHash(),
                Instant.now(), // No createdAt on entity; using now() as fallback
                entity.getExpiresAt().toInstant(ZoneOffset.UTC),
                entity.getRememberMe(),
                entity.getRevoked()
        );
    }

    @Override
    @Transactional
    public RefreshTokenRecord save(RefreshTokenRecord r) {
        Student student = studentRepository.findById(r.userId()).orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        RefreshToken entity = new RefreshToken();
        if (r.id() != null) {
            entity = refreshTokenRepository.findById(r.id()).orElse(new RefreshToken());
        }
        
        entity.setStudent(student);
        entity.setTokenHash(r.tokenHash());
        entity.setExpiresAt(LocalDateTime.ofInstant(r.expiresAt(), ZoneOffset.UTC));
        entity.setRememberMe(r.rememberMe());
        entity.setRevoked(r.revoked());

        RefreshToken saved = refreshTokenRepository.save(entity);
        return mapToRecord(saved);
    }

    @Override
    public Optional<RefreshTokenRecord> findByTokenHash(String hash) {
        return refreshTokenRepository.findByTokenHash(hash).map(this::mapToRecord);
    }

    @Override
    @Transactional
    public void revoke(Long id) {
        refreshTokenRepository.findById(id).ifPresent(r -> {
            r.setRevoked(true);
            refreshTokenRepository.save(r);
        });
    }

    @Override
    @Transactional
    public void revokeAllForUser(Long userId) {
        List<RefreshToken> tokens = refreshTokenRepository.findByStudentId(userId);
        for (RefreshToken t : tokens) {
            t.setRevoked(true);
        }
        refreshTokenRepository.saveAll(tokens);
    }

    @Override
    @Transactional
    public int deleteExpired(Instant now) {
        return refreshTokenRepository.deleteExpired(LocalDateTime.ofInstant(now, ZoneOffset.UTC));
    }
}
