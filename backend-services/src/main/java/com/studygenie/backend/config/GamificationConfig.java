package com.studygenie.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneOffset;

@Configuration
@org.springframework.boot.context.properties.EnableConfigurationProperties({GamificationProperties.class, StudyLogicProperties.class})
public class GamificationConfig {
    // Clock bean is already provided by AppConfig
}
