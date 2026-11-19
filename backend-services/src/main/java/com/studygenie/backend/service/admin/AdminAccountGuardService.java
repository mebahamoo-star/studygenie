package com.studygenie.backend.service.admin;

import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.enums.AccountStatus;
import com.studygenie.backend.entity.enums.Role;
import com.studygenie.backend.exception.BadRequestException;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.service.auth.RefreshTokenStore;
import com.studygenie.backend.service.auth.UserAccountStore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Enforces safety invariants on admin role and account status changes:
 * - An admin cannot demote or suspend themselves.
 * - The last remaining active ADMIN cannot be demoted or suspended.
 * - Suspending an account immediately revokes all of its refresh tokens.
 */
@Service
public class AdminAccountGuardService {

    private final StudentRepository studentRepository;
    private final UserAccountStore userAccountStore;
    private final RefreshTokenStore refreshTokenStore;

    public AdminAccountGuardService(
            StudentRepository studentRepository,
            UserAccountStore userAccountStore,
            RefreshTokenStore refreshTokenStore) {
        this.studentRepository = studentRepository;
        this.userAccountStore = userAccountStore;
        this.refreshTokenStore = refreshTokenStore;
    }

    @Transactional
    public Student changeUserRole(Long actorAdminId, Long targetUserId, Role newRole) {
        if (newRole == null) {
            throw new BadRequestException("Target role is required");
        }

        Student target = studentRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        Role currentRole = target.getRole();
        if (currentRole == newRole) {
            return target;
        }

        if (actorAdminId != null && actorAdminId.equals(targetUserId) && newRole != Role.ADMIN) {
            throw new BadRequestException("Admins cannot demote themselves");
        }

        if (currentRole == Role.ADMIN && newRole != Role.ADMIN) {
            long activeAdmins = studentRepository.countByRoleAndStatus(Role.ADMIN, AccountStatus.ACTIVE);
            if (target.getStatus() == AccountStatus.ACTIVE && activeAdmins <= 1) {
                throw new BadRequestException("Cannot demote the last remaining active admin");
            }
        }

        target.setRole(newRole);
        Student saved = studentRepository.saveAndFlush(target);
        userAccountStore.updateRole(targetUserId, newRole);
        return saved;
    }

    @Transactional
    public Student changeUserStatus(Long actorAdminId, Long targetUserId, AccountStatus newStatus) {
        if (newStatus == null) {
            throw new BadRequestException("Target status is required");
        }

        Student target = studentRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        AccountStatus currentStatus = target.getStatus();
        if (currentStatus == newStatus) {
            return target;
        }

        if (actorAdminId != null && actorAdminId.equals(targetUserId) && newStatus == AccountStatus.SUSPENDED) {
            throw new BadRequestException("Admins cannot suspend themselves");
        }

        if (target.getRole() == Role.ADMIN && newStatus == AccountStatus.SUSPENDED) {
            long activeAdmins = studentRepository.countByRoleAndStatus(Role.ADMIN, AccountStatus.ACTIVE);
            if (currentStatus == AccountStatus.ACTIVE && activeAdmins <= 1) {
                throw new BadRequestException("Cannot suspend the last remaining active admin");
            }
        }

        target.setStatus(newStatus);
        Student saved = studentRepository.saveAndFlush(target);
        userAccountStore.updateStatus(targetUserId, newStatus);

        if (newStatus == AccountStatus.SUSPENDED) {
            refreshTokenStore.revokeAllForUser(targetUserId);
        }

        return saved;
    }
}
