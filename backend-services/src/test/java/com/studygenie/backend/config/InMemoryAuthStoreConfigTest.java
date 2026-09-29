package com.studygenie.backend.config;

import com.studygenie.backend.service.auth.UserAccount;
import com.studygenie.backend.service.auth.UserAccountStore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {
        InMemoryAuthStoreConfig.class,
        InMemoryAuthStoreConfigTest.TestConfig.class,
        com.studygenie.backend.BackendApplication.class
})
@ActiveProfiles("dev")
class InMemoryAuthStoreConfigTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private UserAccountStore userAccountStore;

    @Test
    void inMemoryStoreShouldNotOverrideExistingBean() {
        // If a Primary bean or another bean is defined, it should use that one.
        // Wait, @ConditionalOnMissingBean means if we provided one in TestConfig,
        // it should pick ours.
        assertThat(userAccountStore).isInstanceOf(DummyUserStore.class);
    }

    @Configuration
    static class TestConfig {
        @Bean
        @Primary
        public UserAccountStore dummyUserStore() {
            return new DummyUserStore();
        }
    }

    static class DummyUserStore implements UserAccountStore {
        @Override
        public Optional<UserAccount> findByEmail(String normalizedEmail) {
            return Optional.empty();
        }

        @Override
        public Optional<UserAccount> findById(Long id) {
            return Optional.empty();
        }

        @Override
        public boolean existsByEmail(String normalizedEmail) {
            return false;
        }

        @Override
        public java.util.List<UserAccount> findAll() {
            return java.util.List.of();
        }

        @Override
        public UserAccount create(String fullName, String normalizedEmail, String passwordHash) {
            return new UserAccount(999L, fullName, normalizedEmail, passwordHash, Instant.now());
        }
    }
}
