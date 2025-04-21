# app/api/routes/documents.py

import os
import uuid # Import uuid module
from typing import List, Optional # Optional needed for error cases
from uuid import UUID

from fastapi import (
    APIRouter,
    # Depends, # Removed Depends
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

# Configuration
from app.core.config import settings
# Removed security import: from app.core.security import get_current_user

# Services
from app.services.storage import storage_service
from app.services.pdf_extractor import (
    pdf_extractor_service,
    PdfNotFoundError,
    PdfExtractionError,
)
from app.services.ai_processor import ai_processor_service, AIProcessingError, AIConfigurationError

# Models
from app.models.document import (
    # DocumentCreate,
    DocumentResponse,
    HealthResponse,
)
from app.models.ai import AIProcessingRequest, AIProcessingResponse # Import AI models

# --- Authentication Removed ---
# Mock authentication function removed
# --- End Authentication Removed ---


router = APIRouter()

@router.post(
    "",
    response_model=AIProcessingResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload PDF, Extract Text, and Process with AI",
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "A required service (Storage or AI) is unavailable"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error during processing"},
        status.HTTP_400_BAD_REQUEST: {"description": "Invalid file type"},
        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: {"description": "File size too large"},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Error processing the PDF content"},
    }
)
async def upload_document_and_process( # Renamed for clarity
    file: UploadFile = File(..., description="The PDF file to upload and process."),
    system_prompt: str = Form(..., description="Instructions for the AI model (e.g., summarization task, data extraction format based on ClickUp ticket)."),
    description: Optional[str] = Form(None, description="Optional description of the document (metadata, not used in AI processing)."),
    # Removed: current_user = Depends(get_current_user),
):
    """
    Uploads a PDF document, stores it, extracts its text content,
    processes the content using an AI model based on the provided system prompt,
    and returns the structured JSON output from the AI.

    - **file**: The PDF file (required).
    - **system_prompt**: The instructions guiding the AI (required).
    - **description**: Optional description for the document (metadata).
    """
    temp_document_id = uuid.uuid4() # Generate an ID for this request lifecycle

    # 1. Validate File Type
    if not file.filename or not file.filename.lower().endswith(tuple(f".{ext}" for ext in settings.ALLOWED_EXTENSIONS)):
        return AIProcessingResponse(
            document_id=temp_document_id,
            status="error",
            error_message=f"Invalid file type. Only {', '.join(settings.ALLOWED_EXTENSIONS)} files are allowed.",
            model_used=settings.AI_MODEL_NAME
        )

    # 2. Validate File Size (Reading content here)
    try:
        file_content = await file.read()
        file_size = len(file_content)
        if file_size > settings.MAX_UPLOAD_SIZE:
             return AIProcessingResponse(
                document_id=temp_document_id,
                status="error",
                error_message=f"File size exceeds maximum allowed ({settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB).",
                model_used=settings.AI_MODEL_NAME
            )
        await file.seek(0) # Reset file pointer
    except Exception as e:
         return AIProcessingResponse(
                document_id=temp_document_id,
                status="error",
                error_message=f"Error reading uploaded file: {str(e)}",
                model_used=settings.AI_MODEL_NAME
            )

    # 3. Store the file in MinIO
    storage_location: Optional[str] = None
    object_name: Optional[str] = None
    actual_doc_uuid: Optional[UUID] = None
    try:
        storage_location, stored_file_size = await storage_service.store_file(file)
        if storage_location:
            object_name = os.path.basename(storage_location)
            try:
                actual_doc_uuid = UUID(object_name.split('.')[0])
            except (ValueError, IndexError):
                 actual_doc_uuid = temp_document_id
        else:
            raise ValueError("Storage service did not return a valid location.")

    except HTTPException as e:
         return AIProcessingResponse(
                document_id=actual_doc_uuid or temp_document_id,
                status="error",
                error_message=f"Storage Error: {e.detail}",
                model_used=settings.AI_MODEL_NAME
            )
    except Exception as e:
         return AIProcessingResponse(
                document_id=actual_doc_uuid or temp_document_id,
                status="error",
                error_message=f"Unexpected error storing document: {str(e)}",
                model_used=settings.AI_MODEL_NAME
            )

    final_document_id = actual_doc_uuid or temp_document_id

    # 4. Extract Text from PDF
    extracted_text: Optional[str] = None
    if object_name:
        try:
            extracted_text = await pdf_extractor_service.extract_text_from_pdf(object_name)
            if extracted_text is None:
                 extracted_text = ""
        except PdfNotFoundError as e:
             return AIProcessingResponse(
                document_id=final_document_id,
                status="error",
                error_message=f"Failed to find stored PDF for extraction: {str(e)}",
                model_used=settings.AI_MODEL_NAME
            )
        except PdfExtractionError as e:
             return AIProcessingResponse(
                document_id=final_document_id,
                status="error",
                error_message=f"Failed to extract text from PDF: {str(e)}",
                model_used=settings.AI_MODEL_NAME
            )
        except HTTPException as e:
             return AIProcessingResponse(
                document_id=final_document_id,
                status="error",
                error_message=f"Storage error during extraction: {e.detail}",
                model_used=settings.AI_MODEL_NAME
            )
        except Exception as e:
             return AIProcessingResponse(
                document_id=final_document_id,
                status="error",
                error_message=f"Unexpected error during text extraction: {str(e)}",
                model_used=settings.AI_MODEL_NAME
            )
    else:
         return AIProcessingResponse(
                document_id=final_document_id,
                status="error",
                error_message="Internal error: Storage location missing after successful upload.",
                model_used=settings.AI_MODEL_NAME
            )

    if not extracted_text:
        return AIProcessingResponse(
            document_id=final_document_id,
            status="success",
            ai_structured_output={"message": "No text content could be extracted from the PDF."},
            model_used=settings.AI_MODEL_NAME,
            error_message="PDF contained no extractable text content."
        )

    # 5. Process Content with AI
    if ai_processor_service is None:
         return AIProcessingResponse(
                document_id=final_document_id,
                status="error",
                error_message="AI processing service is not available (configuration error?). Check server logs.",
                model_used=settings.AI_MODEL_NAME
            )

    ai_request_data = AIProcessingRequest(
        document_id=final_document_id,
        pdf_content=extracted_text,
        system_prompt=system_prompt
    )

    try:
        ai_response = await ai_processor_service.process_content(ai_request_data)
        return ai_response
    except AIConfigurationError as e:
         return AIProcessingResponse(
                document_id=final_document_id,
                status="error",
                error_message=f"AI Service configuration error: {str(e)}",
                model_used=settings.AI_MODEL_NAME
            )
    except Exception as e:
         return AIProcessingResponse(
                document_id=final_document_id,
                status="error",
                error_message=f"Unexpected error calling AI processing service: {str(e)}",
                model_used=settings.AI_MODEL_NAME
            )


# --- Placeholder Endpoints (Require Database Integration) ---

@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document metadata by ID (Placeholder)",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    responses={status.HTTP_404_NOT_FOUND: {"description": "Document not found"}}
)
async def get_document(
    document_id: UUID,
    # Removed: current_user = Depends(get_current_user),
):
    """
    **Note:** This endpoint is a placeholder.
    Retrieves metadata for a specific document by its ID.
    Requires database integration to store and retrieve document details.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Document metadata retrieval requires database integration (not yet implemented)."
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="Delete a document by ID (Placeholder)",
    responses={status.HTTP_404_NOT_FOUND: {"description": "Document not found"}}
)
async def delete_document(
    document_id: UUID,
    # Removed: current_user = Depends(get_current_user),
):
    """
    **Note:** This endpoint is a placeholder.
    Deletes a document by its ID from storage and metadata store.
    Requires database integration.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Document deletion requires database and storage integration (not yet implemented)."
    )


# --- Health Check ---

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Check API and services health",
    tags=["_health"]
)
async def health_check():
    """
    Check the health of the API and its dependencies (MinIO, AI Service).
    """
    minio_healthy = storage_service.check_health()
    minio_status = "healthy" if minio_healthy else "unhealthy"

    ai_service_status = "unavailable"
    if ai_processor_service is not None:
        ai_service_status = "healthy"

    overall_status = "ok"
    if not minio_healthy or ai_processor_service is None:
        overall_status = "degraded"

    return HealthResponse(
        status=overall_status,
        dependencies={
            "storage (minio)": minio_status,
            "ai_service (gemini)": ai_service_status,
        }
    )