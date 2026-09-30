package com.studygenie.backend.config;

import com.studygenie.backend.adapter.inmemory.InMemoryCardScheduleStore;
import com.studygenie.backend.adapter.inmemory.InMemoryGamificationStore;
import com.studygenie.backend.service.port.CardScheduleStore;
import com.studygenie.backend.service.port.GamificationStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InMemoryAdapterConfig {

    @Bean
    @ConditionalOnMissingBean(GamificationStore.class)
    public GamificationStore inMemoryGamificationStore() {
        return new InMemoryGamificationStore();
    }

    @Bean
    @ConditionalOnMissingBean(CardScheduleStore.class)
    public CardScheduleStore inMemoryCardScheduleStore() {
        return new InMemoryCardScheduleStore();
    }
}
