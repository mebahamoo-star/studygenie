package com.studygenie.backend.config;

import com.studygenie.backend.service.auth.RefreshTokenRecord;
import com.studygenie.backend.service.auth.RefreshTokenStore;
import com.studygenie.backend.service.auth.UserAccount;
import com.studygenie.backend.service.auth.UserAccountStore;
import com.studygenie.backend.service.auth.inmemory.InMemoryRefreshTokenStore;
import com.studygenie.backend.service.auth.inmemory.InMemoryUserAccountStore;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class InMemoryAuthStoreConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(AppConfig.class, InMemoryAuthStoreConfig.class));

    @Test
    void defaultProvidesInMemoryStores() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(UserAccountStore.class);
            assertThat(context).getBean(UserAccountStore.class).isInstanceOf(InMemoryUserAccountStore.class);

            assertThat(context).hasSingleBean(RefreshTokenStore.class);
            assertThat(context).getBean(RefreshTokenStore.class).isInstanceOf(InMemoryRefreshTokenStore.class);
        });
    }

    @Test
    void customStoresOverrideInMemory() {
        contextRunner.withUserConfiguration(CustomStoreConfig.class).run(context -> {
            assertThat(context).hasSingleBean(UserAccountStore.class);
            assertThat(context).getBean(UserAccountStore.class).isInstanceOf(DummyUserStore.class);

            assertThat(context).hasSingleBean(RefreshTokenStore.class);
            assertThat(context).getBean(RefreshTokenStore.class).isInstanceOf(DummyRefreshStore.class);
        });
    }

    @Configuration
    static class CustomStoreConfig {
        @Bean
        public UserAccountStore customUserAccountStore() {
            return new DummyUserStore();
        }

        @Bean
        public RefreshTokenStore customRefreshTokenStore() {
            return new DummyRefreshStore();
        }
    }

    static class DummyUserStore implements UserAccountStore {
        @Override public Optional<UserAccount> findByEmail(String normalizedEmail) { return Optional.empty(); }
        @Override public Optional<UserAccount> findById(Long id) { return Optional.empty(); }
        @Override public boolean existsByEmail(String normalizedEmail) { return false; }
        @Override public UserAccount create(String fullName, String normalizedEmail, String passwordHash) { return null; }
    }

    static class DummyRefreshStore implements RefreshTokenStore {
        @Override public RefreshTokenRecord save(RefreshTokenRecord r) { return null; }
        @Override public Optional<RefreshTokenRecord> findByTokenHash(String hash) { return Optional.empty(); }
        @Override public void revoke(Long id) {}
        @Override public void revokeAllForUser(Long userId) {}
        @Override public int deleteExpired(Instant now) { return 0; }
    }
}
