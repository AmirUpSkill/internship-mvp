/**
 * REST Controller for managing ClickUp tickets.
 * Provides endpoints for creating tickets and checking service health.
 */
package com.proxym.amir.clickup_ticket_service.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.proxym.amir.clickup_ticket_service.dto.ClickUpTaskResponse;
import com.proxym.amir.clickup_ticket_service.dto.ClickUpTicketRequest;
import com.proxym.amir.clickup_ticket_service.service.ClickUpTicketService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller class that handles HTTP requests related to ClickUp tickets.
 * Base path for all endpoints is '/api/v1'
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class ClickUpTicketController {

    /**
     * Service layer dependency for handling ClickUp ticket operations
     */
    private final ClickUpTicketService clickUpTicketService;

    /**
     * Creates a new ticket in ClickUp
     * 
     * @param ticketRequest The request object containing ticket details
     * @return ResponseEntity containing the created task response and HTTP 201 status
     */
    @PostMapping("/create-ticket")
    public ResponseEntity<ClickUpTaskResponse> createTicket(@RequestBody @Valid ClickUpTicketRequest ticketRequest) {
        log.info("Received request to create ticket : {}", ticketRequest.getName());

        ClickUpTaskResponse response = clickUpTicketService.createTicket(ticketRequest);

        log.info("Successfully processed create ticket request for : {}", ticketRequest.getName());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);  // return 201 Created with the response body 
    }

    /**
     * Health check endpoint to verify service status
     * 
     * @return ResponseEntity with status "UP" if service is running
     */
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("{\"status\": \"UP\"   }");
    }
}
