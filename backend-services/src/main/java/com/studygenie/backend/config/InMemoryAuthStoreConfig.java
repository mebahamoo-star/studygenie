package com.studygenie.backend.config;

import com.studygenie.backend.service.auth.RefreshTokenStore;
import com.studygenie.backend.service.auth.UserAccountStore;
import com.studygenie.backend.service.auth.inmemory.InMemoryRefreshTokenStore;
import com.studygenie.backend.service.auth.inmemory.InMemoryUserAccountStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.util.concurrent.atomic.AtomicBoolean;

@Configuration
public class InMemoryAuthStoreConfig {

    private static final Logger log = LoggerFactory.getLogger(InMemoryAuthStoreConfig.class);
    private static final AtomicBoolean warned = new AtomicBoolean(false);

    private void warnOnce() {
        if (warned.compareAndSet(false, true)) {
            log.warn("Using in-memory user/refresh-token store: data is lost on restart. NOT for production.");
        }
    }

    @Bean
    @ConditionalOnMissingBean(UserAccountStore.class)
    public UserAccountStore inMemoryUserAccountStore(Clock clock) {
        warnOnce();
        return new InMemoryUserAccountStore(clock);
    }

    @Bean
    @ConditionalOnMissingBean(RefreshTokenStore.class)
    public RefreshTokenStore inMemoryRefreshTokenStore() {
        warnOnce();
        return new InMemoryRefreshTokenStore();
    }
}
