// types/api.ts

// --- PDF Processor API Types ---
export interface PdfProcessSuccessResponse {
    status: "success";
    message: string;
    document_id: string;
    ai_structured_output: any; // Refine 'any' if possible based on expected AI output
}

export interface PdfProcessErrorResponse {
    status: "error";
    error_message: string;
    details?: any;
}

// Type guard for PDF success response
export function isPdfProcessSuccessResponse(
    response: any
): response is PdfProcessSuccessResponse {
    return response && response.status === "success" && typeof response.document_id === 'string' && response.ai_structured_output !== undefined;
}

// Type guard for PDF error response
export function isPdfProcessErrorResponse(
    response: any
): response is PdfProcessErrorResponse {
     return response && response.status === "error" && typeof response.error_message === 'string';
}


// --- ClickUp API Types ---

// Payload for the POST /create-ticket endpoint (Matches FastAPI TicketCreate model)
export interface ClickupTicketCreatePayload {
    name: string;                 // Required, max 250 chars
    description?: string | null;  // Optional
    priority?: number | null;     // Optional, 1-4, defaults to 3 on backend
    status?: string | null;       // Optional, defaults to "To Do" on backend
}

// Success response structure from POST /create-ticket (FastAPI backend)
export interface ClickupSuccessResponse {
    message: string;
    task_id: string;
    url: string;
}

// Validation error detail structure (FastAPI 422 response)
export interface ClickupValidationErrorDetail {
    loc: (string | number)[];
    msg: string;
    type: string;
}
// Validation error response structure (FastAPI 422 response)
export interface ClickupValidationErrorResponse {
    detail: ClickupValidationErrorDetail[];
}

// General ClickUp API error response (e.g., 401, 404, 5xx proxied by backend)
// Expecting 'detail' field based on FastAPI's HTTPException handling
export interface ClickupApiErrorResponse {
     detail: string | any; // Can be string or sometimes structured JSON
}

// Type guard for validation errors (422)
export function isClickupValidationErrorResponse(
    response: any
): response is ClickupValidationErrorResponse {
    return response && Array.isArray(response.detail) && response.detail.length > 0 && response.detail[0].loc && response.detail[0].msg;
}

// Type guard for general API errors (where detail might be a string)
export function isClickupApiErrorResponse(
    response: any
): response is ClickupApiErrorResponse {
     // Check if detail exists, can be any type but often string from simple HTTPException
     return response && response.detail !== undefined;
}