// lib/api/pdfProcessorApi.ts

import {
    PdfProcessSuccessResponse,
    PdfProcessErrorResponse,
    isPdfProcessSuccessResponse,
    isPdfProcessErrorResponse
} from '@/types/api'; // Adjust path if needed

// ---> Use the environment variable
const PDF_PROCESSOR_API_URL = process.env.NEXT_PUBLIC_PDF_PROCESSOR_API_URL;

if (!PDF_PROCESSOR_API_URL) {
    console.error("Error: NEXT_PUBLIC_PDF_PROCESSOR_API_URL is not defined in .env.local");
    // Optionally throw an error or use a fallback for local dev, but crashing is often safer
    // throw new Error("PDF Processor API URL is not configured.");
}

// Keep the rest of the file (ProcessPdfResult interface, processPdfWithPrompt function) the same
// Ensure the fetch call inside processPdfWithPrompt uses the PDF_PROCESSOR_API_URL variable

// Example fetch call inside processPdfWithPrompt (ensure it uses the variable):
// try {
//     const response = await fetch(PDF_PROCESSOR_API_URL!, { // Use the variable (non-null assertion safe due to check above)
//         method: "POST",
//         body: formData,
//     });
//     // ... rest of the try block
// } catch (error) {
//     // ... catch block
// }

// --- Keep the ProcessPdfResult interface ---
interface ProcessPdfResult { /* ... */ }

// --- Keep the processPdfWithPrompt function ---
export async function processPdfWithPrompt(
    file: File,
    systemPrompt: string,
    description?: string
): Promise<ProcessPdfResult> {
    if (!PDF_PROCESSOR_API_URL) {
        return { success: false, error: "PDF Processor API URL is not configured." };
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("system_prompt", systemPrompt);
    if (description) {
        formData.append("description", description);
    }

    try {
        const response = await fetch(PDF_PROCESSOR_API_URL, { // Using the variable
            method: "POST",
            body: formData,
        });

        const responseData: any = await response.json(); // Parse JSON regardless of status first

        if (!response.ok) {
            if (isPdfProcessErrorResponse(responseData)) {
                 return { success: false, error: `API Error (${response.status}): ${responseData.error_message}` };
            }
            // Handle other non-ok responses that might not fit the error schema
             let detail = responseData?.detail || response.statusText;
             if (typeof detail !== 'string') detail = JSON.stringify(detail);
            return { success: false, error: `API Request Failed: ${response.status} ${detail}` };
        }

        // Handle backend's structured response (200 OK)
        if (isPdfProcessSuccessResponse(responseData)) {
            return {
                success: true,
                data: {
                    ai_structured_output: responseData.ai_structured_output,
                    document_id: responseData.document_id,
                },
            };
        } else if (isPdfProcessErrorResponse(responseData)) {
            return { success: false, error: `Processing Error: ${responseData.error_message}` };
        } else {
            console.error("Unexpected API response structure:", responseData);
            return { success: false, error: "Received an unexpected response format from the server." };
        }

    } catch (error) {
        console.error("Network or other error during PDF processing:", error);
        if (error instanceof Error) {
            return { success: false, error: `Network Error: ${error.message}` };
        }
        return { success: false, error: "An unexpected error occurred while contacting the processing service." };
    }
}