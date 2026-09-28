package com.studygenie.backend.security;

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

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
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
            AuthenticatedUser principal = new AuthenticatedUser(userId, email);

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    principal, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_STUDENT"))
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
