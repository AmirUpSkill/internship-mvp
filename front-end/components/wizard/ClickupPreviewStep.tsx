// components/wizard/ClickupPreviewStep.tsx
"use client";


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CheckCircle } from "lucide-react"; // Icons for error/success
// Corrected import for react-json-view-lite
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css'; // Import default styles


// Import real API client and transformer
import { createClickupTicket } from '@/lib/api/clickupApi';
import { transformAiResponseToClickupPayload } from '@/lib/dataTransformer';


// Import needed types from central location
import { ClickupSuccessResponse } from '@/types/api';


// Define the structure for the local success state
interface SubmissionResult {
    message: string;
    taskId: string;
    taskUrl: string;
}


// Props definition for this component
interface ClickupPreviewStepProps {
    aiResponse: any | null; // The JSON data from the AI step
    onError: (message: string | null) => void; // For general errors to show in WizardContainer
    onPrevStep: () => void; // Go back to AI Prompt step
    onSubmissionComplete: (result: SubmissionResult) => void; // Report success back
    onResetWizard: () => void; // Reset the entire wizard
}


export function ClickupPreviewStep({
    aiResponse,
    onError,
    onPrevStep,
    onSubmissionComplete,
    onResetWizard
}: ClickupPreviewStepProps) {
    // State Variables
    const [isLoading, setIsLoading] = useState<boolean>(false); // Loading state for ClickUp API call
    const [submissionError, setSubmissionError] = useState<string | null>(null); // Error specific to this step's submission
    const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null); // Success result from submission


    // Handler Function for Submission
    const handleSendToClickup = async () => {
        if (!aiResponse) {
            onError("Cannot send to ClickUp: AI response data is missing."); // Report error globally
            return;
        }


        setIsLoading(true);
        setSubmissionError(null); // Clear previous submission errors
        setSubmissionResult(null); // Clear previous results
        onError(null); // Clear previous global errors


        try {
            // 1. Transform Data using the real transformer
            const clickupPayload = transformAiResponseToClickupPayload(aiResponse);


            // 2. Send Data to ClickUp Backend using the real API client
            const result = await createClickupTicket(clickupPayload);


            // 3. Handle Response from the real API client
            if (result.success && result.data) {
                // Map the successful response data to the local SubmissionResult state type
                const successData: SubmissionResult = {
                    message: result.data.message,
                    taskId: result.data.task_id,
                    taskUrl: result.data.url
                };
                setSubmissionResult(successData); // Store success details locally
                onSubmissionComplete(successData); // Report success upwards to WizardContainer
            } else {
                // Store submission-specific error locally (includes validation errors from result.error)
                setSubmissionError(result.error || "An unknown error occurred during ClickUp submission.");
            }


        } catch (error) {
            // Catch unexpected client-side errors during the process
            console.error("Error during ClickUp submission process:", error);
            const message = error instanceof Error ? error.message : "An unexpected client-side error occurred.";
            setSubmissionError(`Submission failed: ${message}`); // Show specific error
            onError(`Submission failed: ${message}`); // Also report unexpected errors globally
        } finally {
            setIsLoading(false); // Ensure loading state is turned off
        }
    };


    // Helper function to render the preview pane based on aiResponse
    const renderPreview = () => {
        if (!aiResponse) return <p className="text-muted-foreground">No AI data available for preview.</p>;


        // Attempt to extract common fields, provide defaults/fallbacks
        const name = aiResponse?.name || <span className="text-muted-foreground italic">Not specified (default will be used)</span>;
        const description = aiResponse?.description || aiResponse?.details || <span className="text-muted-foreground italic">Not specified (full AI output might be used)</span>;
        const priorityMap: { [key: number]: string } = { 1: "Urgent", 2: "High", 3: "Normal", 4: "Low" };
        let priorityValue = 3; // Default
         try {
            const parsed = parseInt(String(aiResponse?.priority), 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) {
                 priorityValue = parsed;
             }
         } catch { /* ignore parsing errors, use default */ }
        const priorityText = priorityMap[priorityValue] || "Normal";
        const status = aiResponse?.status || <span className="text-muted-foreground italic">Not specified (default 'To Do' will be used)</span>;


        return (
            <div className="space-y-2 text-sm border p-4 rounded-md bg-secondary/30 dark:bg-gray-700 dark:border-gray-600">
                <h4 className="font-semibold text-base mb-2">ClickUp Task Preview (Estimated)</h4>
                <p><strong>Name:</strong> {typeof name === 'string' ? name : name}</p>
                <p><strong>Priority:</strong> {priorityText} ({priorityValue})</p>
                <p><strong>Status:</strong> {typeof status === 'string' ? status : status}</p>
                <p><strong>Description:</strong></p>
                <div className="pl-2 max-h-32 overflow-y-auto text-xs bg-background dark:bg-gray-800 p-2 rounded border dark:border-gray-500">
                    <pre className="whitespace-pre-wrap break-words">{typeof description === 'string' ? description : description}</pre>
                </div>
            </div>
        );
    };


    // --- Component Render ---
    return (
        <div className="space-y-6">
            {/* Display Areas: Raw JSON and Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Raw JSON Output Section */}
                 <div className="space-y-2">
                    <h4 className="font-semibold text-base">Raw AI Output</h4>
                    <div className="p-3 border rounded-md bg-secondary/30 dark:bg-gray-700 dark:border-gray-600 max-h-96 overflow-auto text-sm">
                        {aiResponse ? (
                            // Use the corrected <JsonView /> tag
                            <JsonView data={aiResponse} />
                        ) : (
                             <p className="text-muted-foreground">No AI response data available.</p>
                        )}
                    </div>
                 </div>
                {/* User-Friendly Preview Section */}
                 {renderPreview()}
            </div>


            {/* Submission Status Messages Area */}
            {/* Display local submission error if present */}
            {submissionError && (
                 <Alert variant="destructive" className="mt-4 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                     <Terminal className="h-4 w-4" />
                     <AlertTitle>Submission Error</AlertTitle>
                     <AlertDescription>{submissionError}</AlertDescription> {/* Display the error message */}
                 </Alert>
            )}
            {/* Display local submission success if present */}
            {submissionResult && (
                <Alert variant="success" className="mt-4 bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <AlertTitle className="font-semibold text-lg">Task Created Successfully!</AlertTitle>
                    <AlertDescription className="mt-2">
                        {submissionResult.message ?? 'Your task has been created in ClickUp.'}
                        <br />
                        Task ID: <strong>{submissionResult.taskId ?? 'N/A'}</strong>
                        {submissionResult.taskUrl && (
                            <a
                                href={submissionResult.taskUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 block mt-1 font-medium text-green-700 dark:text-green-400 underline hover:text-green-800 dark:hover:text-green-300"
                            >
                                View Task in ClickUp →
                            </a>
                        )}
                    </AlertDescription>
                </Alert>
            )}




            {/* Action Buttons Area */}
            {/* Show Back/Send buttons ONLY if submission hasn't successfully completed */}
            {!submissionResult ? (
                <div className="flex justify-between mt-6">
                    {/* Back Button: always enabled unless actively loading */}
                    <Button
                        variant="outline"
                        onClick={onPrevStep}
                        disabled={isLoading}
                    >
                        Back
                    </Button>
                    {/* Send Button: enabled only if not loading AND aiResponse exists */}
                    <Button
                        onClick={handleSendToClickup}
                        disabled={isLoading || !aiResponse}
                    >
                        {isLoading ? 'Sending to ClickUp...' : 'Send to ClickUp'}
                    </Button>
                </div>
            ) : (
                // Show ONLY Start Over button after successful submission
                <div className="flex justify-center mt-6 pt-4 border-t dark:border-gray-600"> {/* Center and add top border */}
                    <Button
                        onClick={onResetWizard}
                        size="lg" // Make button larger for emphasis
                    >
                        Create Another Task (Start Over)
                    </Button>
                </div>
            )}
        </div> // End of main component div
    );
}

