// components/wizard/PdfUploadStep.tsx
"use client";

import React, { useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Define the props this component expects from WizardContainer
interface PdfUploadStepProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onError: (message: string | null) => void; // Function to report errors back
  onNextStep: () => void; // Function to trigger moving to the next step
}

export function PdfUploadStep({
  selectedFile,
  onFileSelect,
  onError,
  onNextStep,
}: PdfUploadStepProps) {

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Clear previous errors first
      onError(null);

      // Handle rejected files (e.g., wrong type)
      if (fileRejections.length > 0) {
        const errorMessages = fileRejections.map(rejection =>
            `${rejection.file.name}: ${rejection.errors.map(e => e.message).join(', ')}`
        ).join('\n');
        onError(`Invalid file(s) selected. Please select a single PDF file. Details:\n${errorMessages}`);
        return;
      }

      // Handle accepted files
      if (acceptedFiles.length === 1) {
        const file = acceptedFiles[0];
        onFileSelect(file); // Pass the valid file up to the container
      } else if (acceptedFiles.length > 1) {
         onError("Please select only one PDF file at a time.");
      } else {
         // This case might occur if drop resulted in no valid files, but rejections were also empty
         onError("No valid PDF file was selected.");
      }
    },
    [onFileSelect, onError] // Dependencies for useCallback
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"], // Only accept PDF files
    },
    multiple: false, // Ensure only one file can be selected at a time
  });

  return (
    <div className="space-y-4">
      <Label htmlFor="pdf-upload">Select PDF Document</Label>
      <div
        {...getRootProps()}
        id="pdf-upload"
        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md cursor-pointer transition-colors
                   ${isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}
                   ${selectedFile ? "border-green-500 bg-green-50" : ""}`} // Visual feedback for selected file
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-primary">Drop the PDF file here ...</p>
        ) : (
          <p className="text-muted-foreground text-center">
            Drag 'n' drop a PDF file here, or click to select a file
          </p>
        )}
      </div>

      {/* Display selected file name */}
      {selectedFile && (
        <div className="mt-4 text-sm text-green-700">
          Selected file: <strong>{selectedFile.name}</strong>
        </div>
      )}

      {/* Navigation Button */}
      <div className="flex justify-end mt-6"> {/* Aligns button to the right */}
        <Button
          onClick={onNextStep}
          disabled={!selectedFile} // Button is disabled until a file is selected
        >
          Next: Provide AI Instructions
        </Button>
      </div>
    </div>
  );
}