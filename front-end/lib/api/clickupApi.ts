// lib/api/clickupApi.ts

import {
    ClickupTicketCreatePayload,
    ClickupSuccessResponse,
    ClickupValidationErrorResponse,
    ClickupApiErrorResponse,
    isClickupValidationErrorResponse,
    isClickupApiErrorResponse
} from '@/types/api'; // Adjust path if needed

// Use the environment variable for the API URL
const CLICKUP_API_URL = process.env.NEXT_PUBLIC_CLICKUP_API_URL;

if (!CLICKUP_API_URL) {
    console.error("CRITICAL ERROR: NEXT_PUBLIC_CLICKUP_API_URL is not defined in .env.local");
    // In a real app, you might want to prevent the app from even loading here
}

// Define a consistent return type for this client function
interface CreateTicketResult {
    success: boolean;
    data?: ClickupSuccessResponse; // Contains task_id, url, message on success
    error?: string; // User-friendly error message on failure
    validationErrors?: ClickupValidationErrorResponse['detail']; // Specific validation errors if status 422
}

/**
 * Sends the ticket data to the ClickUp backend API.
 *
 * @param payload The structured ticket data matching ClickupTicketCreatePayload.
 * @returns A promise resolving to a CreateTicketResult object.
 */
export async function createClickupTicket(
    payload: ClickupTicketCreatePayload
): Promise<CreateTicketResult> {
    // Return early if URL isn't configured (checked at module load, but good practice here too)
    if (!CLICKUP_API_URL) {
        return { success: false, error: "ClickUp API URL is not configured. Check environment variables." };
    }

    try {
        const response = await fetch(CLICKUP_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Add other headers like Authorization if your ClickUp backend required them
            },
            body: JSON.stringify(payload),
        });

        // Attempt to parse JSON response body regardless of status code
        let responseData: any = null;
        try {
           responseData = await response.json();
        } catch (jsonError) {
           console.warn("Could not parse JSON response body:", jsonError);
           // If parsing fails on an OK response, it's an issue with the backend response format
           if (response.ok) {
                return { success: false, error: `Received OK status (${response.status}) but failed to parse response body as JSON.` };
           }
           // For non-OK responses, we might try reading text later if JSON failed
        }

        // --- Handle Successful Response (2xx status code) ---
        if (response.ok) {
            // Validate the structure of the successful response data
            if (
                responseData &&
                typeof responseData.message === 'string' &&
                typeof responseData.task_id === 'string' &&
                typeof responseData.url === 'string'
            ) {
                // Response data matches expected structure
                return { success: true, data: responseData as ClickupSuccessResponse };
            } else {
                // Response data is missing expected fields - treat as an error
                console.error("Unexpected success response format from ClickUp backend:", responseData);
                return { success: false, error: "Received an unexpected success response format from the server." };
            }
        }
        // --- Handle Error Response (non-2xx status code) ---
        else {
            let errorMessage = `ClickUp API Error: ${response.status} ${response.statusText}`;
            let validationErrors: ClickupValidationErrorResponse['detail'] | undefined = undefined;

            // Handle 422 Validation Errors specifically
            if (response.status === 422 && responseData && isClickupValidationErrorResponse(responseData)) {
                validationErrors = responseData.detail;
                errorMessage = `Validation failed: ${validationErrors.map(e => `${e.loc.join('.')} - ${e.msg}`).join('; ')}`;
            }
            // Handle other errors where backend might provide a 'detail' field
            else if (responseData) {
                 if (isClickupApiErrorResponse(responseData)) {
                     // Handle cases where detail is provided (string or other type)
                     errorMessage = `ClickUp API Error (${response.status}): ${typeof responseData.detail === 'string' ? responseData.detail : JSON.stringify(responseData.detail)}`;
                 } else if (responseData.message && typeof responseData.message === 'string') {
                     // Handle cases where error might be in a 'message' field
                     errorMessage = `ClickUp API Error (${response.status}): ${responseData.message}`;
                 }
                 // Add more checks here if your backend uses other error formats
            }
             // Fallback if no JSON detail found or JSON parsing failed initially
             else {
                 try {
                     const textResponse = await response.text(); // Try reading body as text
                     errorMessage = `ClickUp API request failed: ${response.status} ${textResponse || response.statusText}`;
                 } catch {
                     // Use original status text if reading text also fails
                     errorMessage = `ClickUp API request failed: ${response.status} ${response.statusText}`;
                 }
             }

            return { success: false, error: errorMessage, validationErrors };
        }

    } catch (error) {
        // Handle network errors (fetch failed, DNS issues, CORS *if not preflight*, etc.)
        console.error("Network or other error during ClickUp ticket creation:", error);
        let networkErrorMessage = "An unexpected error occurred while contacting the ClickUp service.";
        if (error instanceof Error) {
            networkErrorMessage = `Network Error: ${error.message}`;
            // Specific check for CORS issues (though OPTIONS failure happens before fetch promise)
            if (error.message.toLowerCase().includes('failed to fetch')) {
                networkErrorMessage += " (Check network connection, CORS settings on the backend, or if the server is running)";
            }
        }
        return { success: false, error: networkErrorMessage };
    }
}