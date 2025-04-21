package com.proxym.amir.clickup_ticket_service.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@RequiredArgsConstructor // Lombok annotation to generate constructor for final fields
public class WebClientConfig {

    private final ClickUpProperties clickUpProperties; // Injects ClickUp configuration properties

    @Bean // Configures WebClient bean for ClickUp API communication
    public WebClient clickUpWebClient(WebClient.Builder builder) {
        return builder
                .baseUrl(clickUpProperties.getApiBaseUrl()) // Sets the base URL from properties
                .defaultHeader(HttpHeaders.AUTHORIZATION, clickUpProperties.getApiKey()) // Sets authorization header
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE) // Sets JSON content type
                // Additional configuration options:
                // .clientConnector(...)
                // .filter(...)
                .build();
    }
}
