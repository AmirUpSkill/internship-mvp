// lib/dataTransformer.ts

import { ClickupTicketCreatePayload } from "@/types/api";

/**
 * Transforms the unstructured AI response object into a structured payload
 * suitable for the ClickUp API backend.
 *
 * @param aiResponse The JSON object received from the AI processing step.
 * @returns A ClickupTicketCreatePayload object with defaults applied.
 */
export function transformAiResponseToClickupPayload(
    aiResponse: any // Expecting an object, potentially nested or flat
): ClickupTicketCreatePayload {

    // --- Default values ---
    const defaultName = `Task from PDF - ${new Date().toISOString()}`;
    const defaultPriority = 3; // 3 = Normal
    const defaultStatus = "To Do";
    let defaultDescription = "Task created from PDF content.";
     // Include raw AI output in description if it's not too complex
     if (aiResponse && typeof aiResponse === 'object') {
         try {
             const jsonString = JSON.stringify(aiResponse, null, 2);
             if (jsonString.length < 1000) { // Avoid overly long descriptions
                defaultDescription += `\n\n--- Raw AI Output ---\n\`\`\`json\n${jsonString}\n\`\`\``;
             }
         } catch (e) { /* ignore stringify errors */ }
     }


    // --- Safely extract data from aiResponse ---
    // Use optional chaining (?.) and nullish coalescing (??)

    let name = aiResponse?.name ?? defaultName;
    if (typeof name !== 'string') {
        console.warn("AI response 'name' was not a string, using default.");
        name = defaultName;
    }
    // Ensure name does not exceed max length enforced by backend/ClickUp
    name = name.substring(0, 250);

    let description = aiResponse?.description ?? aiResponse?.details ?? defaultDescription;
     if (typeof description !== 'string') {
         console.warn("AI response 'description' or 'details' were not strings, using default.");
         description = defaultDescription;
     }
     // Simple Markdown is usually fine, no complex parsing needed here unless required

    let priority = aiResponse?.priority ?? defaultPriority;
    // Validate priority: should be a number between 1 and 4
    if (typeof priority === 'string') {
        // Try converting string numbers like "2"
        const parsedPriority = parseInt(priority, 10);
        if (!isNaN(parsedPriority) && parsedPriority >= 1 && parsedPriority <= 4) {
            priority = parsedPriority;
        } else {
            console.warn(`AI response 'priority' ("${priority}") was not a valid number 1-4, using default.`);
            priority = defaultPriority;
        }
    } else if (typeof priority !== 'number' || priority < 1 || priority > 4) {
        console.warn(`AI response 'priority' (${priority}) was not a valid number 1-4, using default.`);
        priority = defaultPriority;
    }

    let status = aiResponse?.status ?? defaultStatus;
    if (typeof status !== 'string' || status.trim() === '') {
         console.warn("AI response 'status' was not a non-empty string, using default.");
         status = defaultStatus;
    }
    // Basic check - doesn't validate against actual ClickUp list statuses here
    // Your backend validates against the specific list's statuses


    // --- Construct the final payload ---
    const payload: ClickupTicketCreatePayload = {
        name: name,
        description: description,
        priority: priority,
        status: status,
    };

    console.log("Transformed AI Response into ClickUp Payload:", payload);
    return payload;
}