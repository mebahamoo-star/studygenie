package com.studygenie.backend.config;

import com.studygenie.backend.security.InternalAuthFilter;
import com.studygenie.backend.security.JsonAccessDeniedHandler;
import com.studygenie.backend.security.JsonAuthenticationEntryPoint;
import com.studygenie.backend.security.JwtAuthenticationFilter;
import com.studygenie.backend.security.JwtService;
import com.studygenie.backend.security.RateLimitingFilter;
import com.studygenie.backend.service.auth.UserAccountStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

/**
 * Security configuration.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String CSP_POLICY =
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com data:; " +
            "img-src 'self' data: https: blob:; " +
            "connect-src 'self' https: http://localhost:* ws://localhost:*; " +
            "frame-ancestors 'self'; " +
            "object-src 'none'; " +
            "base-uri 'self'";

    private final JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint;
    private final JsonAccessDeniedHandler jsonAccessDeniedHandler;
    private final String[] allowedOrigins;
    private final JwtService jwtService;
    private final ObjectProvider<UserAccountStore> userAccountStoreProvider;
    private final ObjectProvider<RateLimitingFilter> rateLimitingFilterProvider;
    private final InternalAuthFilter internalAuthFilter;
    private final Environment environment;

    public SecurityConfig(JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint,
                          JsonAccessDeniedHandler jsonAccessDeniedHandler,
                          JwtService jwtService,
                          ObjectProvider<UserAccountStore> userAccountStoreProvider,
                          ObjectProvider<RateLimitingFilter> rateLimitingFilterProvider,
                          InternalAuthFilter internalAuthFilter,
                          Environment environment,
                          @Value("${app.cors.allowed-origins:${cors.allowed-origins:http://localhost:3000,http://localhost:5173}}") String allowedOrigins) {
        this.jsonAuthenticationEntryPoint = jsonAuthenticationEntryPoint;
        this.jsonAccessDeniedHandler = jsonAccessDeniedHandler;
        this.jwtService = jwtService;
        this.userAccountStoreProvider = userAccountStoreProvider;
        this.rateLimitingFilterProvider = rateLimitingFilterProvider;
        this.internalAuthFilter = internalAuthFilter;
        this.environment = environment;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                                    .map(String::trim)
                                    .filter(s -> !s.isEmpty())
                                    .toArray(String[]::new);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        JwtAuthenticationFilter jwtFilter =
                new JwtAuthenticationFilter(jwtService, userAccountStoreProvider.getIfAvailable());
        RateLimitingFilter rateLimitingFilter = rateLimitingFilterProvider.getIfAvailable();
        boolean isDev = environment != null && environment.acceptsProfiles(Profiles.of("dev"));

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(jsonAuthenticationEntryPoint)
                        .accessDeniedHandler(jsonAccessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> {
                    auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/", "/swagger-ui", "/api/health").permitAll()
                        .requestMatchers("/api/internal/**").permitAll()
                        .requestMatchers("/api/admin/reports", "/api/admin/reports/**").hasAnyRole("ADMIN", "MODERATOR")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-resources/**", "/webjars/**").permitAll();

                    if (isDev) {
                        auth.requestMatchers("/h2-console/**").permitAll();
                    } else {
                        auth.requestMatchers("/h2-console/**").denyAll();
                    }

                    auth
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/logout",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password").permitAll()
                        .requestMatchers("/api/auth/oauth/**").permitAll()
                        .requestMatchers("/api/auth/me").authenticated()

                        // Intentionally public read-only catalog discovery endpoints for guests
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/universities",
                                "/api/v1/universities/*",
                                "/api/v1/universities/*/colleges").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/colleges/*/courses").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/courses").permitAll()

                        // Protected course endpoints (matched before /api/v1/courses/*)
                        .requestMatchers("/api/v1/courses/enrolled", "/api/v1/courses/*/enroll", "/api/v1/courses/sync-enrolled").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/courses/reports").hasAnyRole("ADMIN", "MODERATOR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/courses/*/plan").authenticated()

                        // Public read-only single course & topics view for catalog discovery
                        .requestMatchers(HttpMethod.GET, "/api/v1/courses/*", "/api/v1/courses/*/topics").permitAll()

                        // Course & topic deletion rules (Option 2 enforced in CourseService for topics/syllabus; ADMIN/MODERATOR for full course deletion)
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/courses/*/topics/*", "/api/v1/courses/*/syllabus").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/courses/*").hasAnyRole("ADMIN", "MODERATOR")

                        // Public read-only community exam challenges feed; all personal exam reads/writes require authentication
                        .requestMatchers(HttpMethod.GET, "/api/v1/exams/challenges").permitAll()
                        .requestMatchers("/api/v1/exams", "/api/v1/exams/**").authenticated()

                        // All write operations and AI/study endpoints require authentication
                        .requestMatchers("/api/v1/syllabus/**").authenticated()
                        .requestMatchers("/api/v1/study-plans/**").authenticated()
                        .requestMatchers("/api/v1/study-kits/**").authenticated()
                        .anyRequest().authenticated();
                })
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
                        .contentTypeOptions(Customizer.withDefaults())
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .contentSecurityPolicy(csp -> csp.policyDirectives(CSP_POLICY))
                )
                .addFilterBefore(internalAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        if (rateLimitingFilter != null) {
            http.addFilterBefore(rateLimitingFilter, JwtAuthenticationFilter.class);
        }

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(this.allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
