package com.studygenie.backend.security;

import com.studygenie.backend.entity.enums.AccountStatus;
import com.studygenie.backend.entity.enums.Role;
import com.studygenie.backend.service.auth.UserAccount;
import com.studygenie.backend.service.auth.UserAccountStore;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserAccountStore userAccountStore;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this(jwtService, null);
    }

    public JwtAuthenticationFilter(JwtService jwtService, UserAccountStore userAccountStore) {
        this.jwtService = jwtService;
        this.userAccountStore = userAccountStore;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        JwtService.TokenValidationResult result = jwtService.validateToken(token);

        if (result.status() == JwtService.TokenStatus.VALID) {
            Long userId = Long.valueOf(result.claims().getSubject());
            String email = result.claims().get("email", String.class);
            Role effectiveRole = jwtService.extractRole(result.claims());

            String uri = request.getRequestURI() != null ? request.getRequestURI() : "";
            boolean isAdminRequest = uri.startsWith("/api/admin");

            if (userAccountStore != null) {
                Optional<UserAccount> dbUserOpt = userAccountStore.findById(userId);
                if (dbUserOpt.isPresent()) {
                    UserAccount dbUser = dbUserOpt.get();
                    if (dbUser.status() == AccountStatus.SUSPENDED) {
                        SecurityContextHolder.clearContext();
                        request.setAttribute("auth.error", "ACCOUNT_SUSPENDED");
                        filterChain.doFilter(request, response);
                        return;
                    }
                    // Always prefer the live DB role so demotions/promotions take effect immediately
                    effectiveRole = dbUser.role();
                } else if (isAdminRequest) {
                    // On /api/admin/**, if the user does not exist in DB, do not trust the token's admin claim
                    effectiveRole = Role.STUDENT;
                }
            }

            AuthenticatedUser principal = new AuthenticatedUser(userId, email, effectiveRole);
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + effectiveRole.name()))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        } else if (result.status() == JwtService.TokenStatus.EXPIRED) {
            SecurityContextHolder.clearContext();
            request.setAttribute("auth.error", "TOKEN_EXPIRED");
        } else {
            SecurityContextHolder.clearContext();
            request.setAttribute("auth.error", "TOKEN_INVALID");
        }

        filterChain.doFilter(request, response);
    }
}
