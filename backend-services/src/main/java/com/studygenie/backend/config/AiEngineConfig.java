package com.studygenie.backend.config;

import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
@org.springframework.boot.context.properties.EnableConfigurationProperties(AiEngineProperties.class)
public class AiEngineConfig {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    @Bean
    public RestClient aiEngineRestClient(AiEngineProperties properties, RestClient.Builder builder) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(properties.getConnectTimeout())
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.getReadTimeout());

        return builder
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .requestInterceptor((request, body, execution) -> {
                    request.getHeaders().add(INTERNAL_TOKEN_HEADER, properties.getInternalToken());
                    String requestId = MDC.get("requestId");
                    if (requestId != null) {
                        request.getHeaders().add(REQUEST_ID_HEADER, requestId);
                    }
                    return execution.execute(request, body);
                })
                .build();
    }
}
