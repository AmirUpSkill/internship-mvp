// components/wizard/AiPromptStep.tsx
"use client";


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// --- FIX 1: Corrected the import path for Input ---
import { Input } from '@/components/ui/input';
import { processPdfWithPrompt } from '@/lib/api/pdfProcessorApi'; // Import the API function
// --- FIX 2: Removed redundant self-import (interface is defined below) ---
// import { AiProcessingResult } from './AiPromptStep';


// Interface definition for the data structure expected on successful processing
// This is exported so WizardContainer can use it if it imports directly from this file
export interface AiProcessingResult {
    ai_structured_output: any; // Use 'any' for now, refine later if possible
    document_id: string;       // Assuming backend returns a string ID
}


// Define the props this component expects from WizardContainer
interface AiPromptStepProps {
    selectedFile: File | null; // The file needed for the API call
    onProcessingComplete: (result: AiProcessingResult) => void; // Callback on success
    onError: (message: string | null) => void; // Callback for errors
    onPrevStep: () => void; // Callback to go back
}


// Ensure the main component function is exported
export function AiPromptStep({
    selectedFile,
    onProcessingComplete,
    onError,
    onPrevStep,
}: AiPromptStepProps) {
    // --- Local State ---
    const [systemPrompt, setSystemPrompt] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false); // State for API call loading


    const handleProcessClick = async () => {
        // 1. Basic Validation
        if (!selectedFile) {
            onError("No file selected. Please go back and select a PDF.");
            return;
        }
        if (!systemPrompt.trim()) {
            onError("AI Instructions (System Prompt) cannot be empty.");
            return;
        }


        // 2. Set Loading State and Clear Previous Errors
        setIsLoading(true);
        onError(null); // Clear errors before new attempt


        try {
            // 3. Call API
            const result = await processPdfWithPrompt(
                selectedFile,
                systemPrompt,
                description.trim() || undefined // Pass description only if it has content
            );


            // 4. Handle Result
            if (result.success && result.data) {
                // Call the success handler passed from WizardContainer
                onProcessingComplete({
                     ai_structured_output: result.data.ai_structured_output,
                     document_id: result.data.document_id
                });
            } else {
                // Call the error handler passed from WizardContainer
                onError(result.error || "An unknown error occurred during processing.");
            }
        } catch (error) {
             // This catch block is more for unexpected client-side errors,
             // as processPdfWithPrompt should handle API/network errors internally.
             console.error("Unexpected error in handleProcessClick:", error);
             onError("An unexpected client-side error occurred.");
        } finally {
            // 5. Reset Loading State
            setIsLoading(false);
        }
    };


    // --- Return JSX ---
    // Make sure to include all necessary props on Textarea and Input
    return (
         <div className="space-y-4">
            {/* Display selected file info for context */}
            {selectedFile && (
                 <p className="text-sm text-muted-foreground">
                    Processing file: <strong>{selectedFile.name}</strong>
                </p>
            )}


            {/* System Prompt Input */}
            <div>
                <Label htmlFor="system-prompt">
                    AI Instructions (System Prompt) <span className="text-red-500">*</span>
                </Label>
                <Textarea
                    id="system-prompt"
                    placeholder="e.g., Extract the invoice number, total amount, and due date. Format as JSON: { 'invoice_number': ..., 'total_amount': ..., 'due_date': ... }"
                    rows={5}
                    value={systemPrompt} // Bind value to state
                    onChange={(e) => setSystemPrompt(e.target.value)} // Update state on change
                    disabled={isLoading} // Disable when loading
                    required
                    className="mt-1"
                />
                 <p className="text-xs text-muted-foreground mt-1">
                    Provide clear instructions for the AI. Specify the desired output format (JSON is recommended).
                </p>
            </div>


            {/* Optional Description Input */}
            <div>
                <Label htmlFor="description">Optional Description</Label>
                <Input
                    id="description"
                    placeholder="e.g., Meeting notes from project kickoff"
                    value={description} // Bind value to state
                    onChange={(e) => setDescription(e.target.value)} // Update state on change
                    disabled={isLoading} // Disable when loading
                    className="mt-1"
                />
                 <p className="text-xs text-muted-foreground mt-1">
                    A brief note about the document or prompt purpose (sent to backend).
                </p>
            </div>


            {/* Loading/Error display area (Global errors shown in WizardContainer) */}


            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
                <Button
                    variant="outline"
                    onClick={onPrevStep}
                    disabled={isLoading} // Disable when loading
                >
                    Back
                </Button>
                <Button
                    onClick={handleProcessClick}
                    disabled={isLoading || !systemPrompt.trim() || !selectedFile} // Disable if loading, no prompt, or no file
                >
                    {isLoading ? 'Processing...' : 'Process Document'} {/* Dynamic button text */}
                </Button>
            </div>
        </div>
    );
}

