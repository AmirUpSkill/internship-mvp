// components/wizard/WizardContainer.tsx
"use client";

import React, { useState } from "react";
import { PdfUploadStep } from "./PdfUploadStep";
// Assuming AiPromptStep is the correct filename based on previous steps
import { AiPromptStep, AiProcessingResult } from './AiPromptStep';
import { ClickupPreviewStep } from './ClickupPreviewStep';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Import Button if used in Step 4
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Ensure Alert components are imported
import { Terminal } from "lucide-react"; // Assuming Terminal is used for Alert icon

// Define the steps
type WizardStep = 1 | 2 | 3 | 4; // Added step 4 for final status display

// Define a type for the result structure expected from ClickupPreviewStep's onSubmissionComplete
// This should align with the 'SubmissionResult' interface in ClickupPreviewStep
interface SubmissionResult {
    message: string;
    taskId: string;
    taskUrl: string;
    // We add a success flag based on whether taskId/taskUrl are present or if an error occurred previously
    success: boolean;
}

// Define a type for storing the final outcome in the container state
interface ContainerSubmissionOutcome {
    success: boolean;
    message: string;
    taskId?: string;
    taskUrl?: string;
}


export function WizardContainer() {
    const [currentStep, setCurrentStep] = useState<WizardStep>(1);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    // State from Step 2
    const [aiResponse, setAiResponse] = useState<any | null>(null);
    const [documentId, setDocumentId] = useState<string | null>(null); // Keep track if needed

    // State for final result after Step 3 submission attempt
    const [submissionOutcome, setSubmissionOutcome] = useState<ContainerSubmissionOutcome | null>(null);

    // --- Handler Functions ---

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        setError(null);
        setAiResponse(null);
        setDocumentId(null);
        setSubmissionOutcome(null); // Clear outcome if file changes
        // Stay on Step 1
    };

    const handleSetError = (message: string | null) => {
        setError(message);
        // Clear final outcome if a new global error occurs
        if (message) {
            setSubmissionOutcome(null);
        }
    };

    const handleAiProcessingComplete = (result: AiProcessingResult) => {
        setAiResponse(result.ai_structured_output);
        setDocumentId(result.document_id); // Store if needed
        setError(null);
        setSubmissionOutcome(null); // Clear previous submission outcome
        setCurrentStep(3); // Move to Preview step
    };

    // Handler for when ClickUp submission attempt finishes
    // Called by ClickupPreviewStep via the onSubmissionComplete prop
    const handleSubmissionComplete = (result: SubmissionResult) => {
         console.log("WizardContainer received submission result:", result);
         // Store the final outcome
         const outcome: ContainerSubmissionOutcome = {
            success: result.success, // Rely on success flag passed from child
            message: result.message,
            taskId: result.taskId,
            taskUrl: result.taskUrl
         };
         setSubmissionOutcome(outcome);

         if (outcome.success) {
             setError(null); // Clear any lingering errors on success
             // Optionally move to a final "Done" step:
             // setCurrentStep(4); // Uncomment this if you want to use Step 4 screen
         } else {
             // If submission failed, the error message is already in the outcome.
             // We might not need to set the global 'error' state here,
             // as ClickupPreviewStep displays its own submissionError.
             // setError(outcome.message || "ClickUp submission failed."); // Optional: Set global error too
         }
         // NOTE: Stay on Step 3 by default to show the success/error message within ClickupPreviewStep
         // unless you uncomment setCurrentStep(4) above.
     };

    const handleNextStep = () => {
        // Only advance from step 1 to 2 using this generic handler
        if (currentStep === 1 && selectedFile) {
            setError(null);
            setCurrentStep(2);
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setError(null); // Clear errors when navigating back
            // Clear submission outcome if going back from step 3 (or 4)
            if (currentStep === 3 || currentStep === 4) {
                 setSubmissionOutcome(null);
            }
            setCurrentStep((prevStep) => (prevStep - 1) as WizardStep);
        }
    };

    // Function to reset the entire wizard state
    // Called by ClickupPreviewStep via the onResetWizard prop
    const handleStartOver = () => {
        setCurrentStep(1);
        setSelectedFile(null);
        setError(null);
        setAiResponse(null);
        setDocumentId(null);
        setSubmissionOutcome(null);
    };


    // --- Render Logic ---

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <PdfUploadStep
                        selectedFile={selectedFile}
                        onFileSelect={handleFileSelect}
                        onError={handleSetError}
                        onNextStep={handleNextStep}
                    />
                );
            case 2:
                return (
                   <AiPromptStep // Ensure this matches your actual filename
                      selectedFile={selectedFile}
                      onProcessingComplete={handleAiProcessingComplete}
                      onError={handleSetError}
                      onPrevStep={handlePrevStep}
                    />
                );
            case 3:
                 // Ensure all required props are passed to ClickupPreviewStep
                 return (
                   <ClickupPreviewStep
                     aiResponse={aiResponse}
                     onError={handleSetError} // Pass global error handler
                     onPrevStep={handlePrevStep} // Pass back navigation handler
                     // --- FIX: Pass the correct handlers ---
                     onSubmissionComplete={handleSubmissionComplete} // Pass submission result handler
                     onResetWizard={handleStartOver} // Pass reset handler (matching child's prop name 'onResetWizard')
                   />
                 );
            // Optional Case 4: Simple "Done" screen (if you enable setCurrentStep(4))
            case 4:
                return (
                    <div className="text-center space-y-4">
                        <h2 className="text-xl font-semibold">
                            {submissionOutcome?.success ? "Task Created Successfully!" : "Submission Attempt Finished"}
                        </h2>
                        {submissionOutcome?.message && (
                            <Alert variant={submissionOutcome.success ? 'success' : 'destructive'} className="text-left">
                                <AlertTitle>{submissionOutcome.success ? 'Success' : 'Result'}</AlertTitle>
                                <AlertDescription>{submissionOutcome.message}</AlertDescription>
                            </Alert>
                        )}
                        {submissionOutcome?.success && submissionOutcome.taskUrl && (
                             <Button asChild variant="link">
                                <a href={submissionOutcome.taskUrl} target="_blank" rel="noopener noreferrer">View Task in ClickUp</a>
                            </Button>
                        )}
                        <Button variant="outline" onClick={handleStartOver}>
                            Start Over
                        </Button>
                    </div>
                );
            default:
                 handleStartOver(); // Reset if state is invalid
                 return <div>Invalid step detected. Resetting wizard...</div>;
        }
    };

    // Determine the title based on the step
    const getTitle = () => {
        switch(currentStep) {
            case 1: return "Step 1: Select PDF";
            case 2: return "Step 2: Provide AI Instructions";
            case 3: return "Step 3: Preview & Send to ClickUp";
            case 4: return "Wizard Finished"; // Title for optional step 4
            default: return "PDF-to-ClickUp Task Wizard";
        }
    };

    return (
        <Card className="w-full max-w-3xl mx-auto my-8 shadow-lg dark:bg-gray-800">
            <CardHeader className="pb-4">
                <CardTitle className="text-center text-xl font-semibold">
                    {getTitle()}
                </CardTitle>
                 {/* Example Progress Bar - adjust steps count if using Step 4 */}
                 {/* <Progress value={((currentStep -1) / 3) * 100} className="mt-2" /> */}
                 {/* <p className="text-center text-sm text-muted-foreground mt-1">Step {currentStep} of {currentStep === 4 ? 4: 3}</p> */}
            </CardHeader>
            <CardContent className="p-6">
                {/* Global error display area - hide if on step 4 or if a submission outcome exists */}
                {error && !submissionOutcome && currentStep !== 4 && (
                    <Alert variant="destructive" className="mb-4">
                        <Terminal className="h-4 w-4" />
                         <AlertTitle>Error</AlertTitle>
                         <AlertDescription>{error}</AlertDescription>
                     </Alert>
                )}
                {/* Render the active step component */}
                {renderCurrentStep()}
            </CardContent>
        </Card>
    );
}

// Export necessary types if they are used by child components directly
// (It's often better to define these in types/api.ts or types/wizard.ts)
// export type { AiProcessingResult, SubmissionResult }; // Example export