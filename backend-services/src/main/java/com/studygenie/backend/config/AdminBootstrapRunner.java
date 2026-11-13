package com.studygenie.backend.config;

import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.enums.AccountStatus;
import com.studygenie.backend.entity.enums.Role;
import com.studygenie.backend.repository.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;

/**
 * Performs additive schema backfill for role/status defaults and promotes an existing
 * registered account to ADMIN if ADMIN_BOOTSTRAP_EMAIL is set and no admin exists yet.
 * Never creates a new account with a default password.
 */
@Component
@Order(1)
public class AdminBootstrapRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final StudentRepository studentRepository;
    private final String bootstrapEmail;

    public AdminBootstrapRunner(
            StudentRepository studentRepository,
            @Value("${app.admin.bootstrap-email:${ADMIN_BOOTSTRAP_EMAIL:}}") String bootstrapEmail) {
        this.studentRepository = studentRepository;
        this.bootstrapEmail = bootstrapEmail != null ? bootstrapEmail.trim().toLowerCase(Locale.ROOT) : "";
    }

    @Override
    @Transactional
    public void run(String... args) {
        backfillDefaults();
        bootstrapFirstAdminIfConfigured();
    }

    public void backfillDefaults() {
        try {
            int rolesUpdated = studentRepository.backfillNullRoles();
            int statusesUpdated = studentRepository.backfillNullStatuses();
            if (rolesUpdated > 0 || statusesUpdated > 0) {
                log.info("Backfilled student defaults: {} role(s) -> STUDENT, {} status(es) -> ACTIVE",
                        rolesUpdated, statusesUpdated);
            }
        } catch (Exception ex) {
            log.debug("Skipped student role/status backfill: {}", ex.getMessage());
        }
    }

    public void bootstrapFirstAdminIfConfigured() {
        if (bootstrapEmail.isEmpty()) {
            return;
        }

        long existingAdmins = studentRepository.countByRole(Role.ADMIN);
        if (existingAdmins > 0) {
            log.debug("Admin bootstrap skipped: {} ADMIN account(s) already exist.", existingAdmins);
            return;
        }

        Optional<Student> candidateOpt = studentRepository.findByEmailIgnoreCase(bootstrapEmail);
        if (candidateOpt.isEmpty()) {
            log.warn("ADMIN_BOOTSTRAP_EMAIL is configured ({}) and no ADMIN exists yet, " +
                     "but no existing registered user matches that email. Register the user first and restart.",
                     bootstrapEmail);
            return;
        }

        Student candidate = candidateOpt.get();
        candidate.setRole(Role.ADMIN);
        if (candidate.getStatus() == null) {
            candidate.setStatus(AccountStatus.ACTIVE);
        }
        studentRepository.saveAndFlush(candidate);
        log.info("ADMIN BOOTSTRAP: Promoted existing account [id={}, email={}] to ADMIN role.",
                candidate.getId(), candidate.getEmail());
    }
}
