# app/services/pdf_extractor.py

import io
from typing import List

# PDF Extraction Library
from pypdf import PdfReader
from pypdf.errors import PdfReadError

# MinIO Integration
from minio.error import S3Error, MinioException
from .storage import storage_service  # Import the singleton instance
from app.core.config import settings

# Error Handling & Logging
import logging
from fastapi import HTTPException, status

# --- Custom Exceptions for Clarity ---
class PdfExtractionError(Exception):
    """Custom exception for PDF text extraction failures."""
    pass

class PdfNotFoundError(Exception):
     """Custom exception when PDF object is not found in storage."""
     pass
# --- End Custom Exceptions ---

logger = logging.getLogger(__name__)

class PdfExtractorService:
    """
    Service responsible for retrieving PDF files from object storage
    and extracting their text content.
    """

    async def extract_text_from_pdf(self, object_name: str) -> str:
        """
        Retrieves a PDF from MinIO storage and extracts its text content.

        Args:
            object_name: The name of the PDF object within the MinIO bucket
                         (e.g., "a1b2c3d4-uuid.pdf").

        Returns:
            The extracted text content as a single string.

        Raises:
            PdfNotFoundError: If the specified object_name is not found in MinIO.
            PdfExtractionError: If the PDF file is corrupted, password-protected
                                (and cannot be decrypted), or cannot be read.
            HTTPException: For underlying storage connection issues or unexpected errors.
                           (Could refine to use custom exceptions more broadly).
        """
        logger.info(f"Attempting to extract text from PDF object: {object_name}")
        pdf_data = None
        response = None
        try:
            # 1. Fetch PDF bytes from MinIO
            response = storage_service.client.get_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name
            )
            pdf_data = response.read()
            logger.debug(f"Successfully retrieved {len(pdf_data)} bytes for {object_name}")

        except S3Error as e:
            if e.code == 'NoSuchKey':
                logger.warning(f"PDF object not found in MinIO: {object_name}")
                raise PdfNotFoundError(f"PDF object '{object_name}' not found in bucket '{settings.MINIO_BUCKET_NAME}'.")
            else:
                logger.error(f"S3 error retrieving PDF {object_name}: {e}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Storage error retrieving PDF: {e.code}"
                )
        except MinioException as e:
            logger.error(f"MinIO connection error retrieving PDF {object_name}: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Storage service connection error: {e}"
            )
        except Exception as e: # Catch unexpected errors during fetch
             logger.error(f"Unexpected error retrieving PDF {object_name}: {e}", exc_info=True)
             raise HTTPException(
                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                 detail=f"Unexpected error retrieving PDF file."
             )
        finally:
            # IMPORTANT: Ensure the MinIO connection is released
            if response:
                response.close()
                response.release_conn()

        if not pdf_data:
             # Should have been caught by exceptions, but as a safeguard
             logger.error(f"PDF data was empty for {object_name} despite no fetch error.")
             raise PdfExtractionError(f"Failed to retrieve valid data for PDF '{object_name}'.")

        # 2. Prepare Bytes for pypdf
        pdf_stream = io.BytesIO(pdf_data)

        # 3. Extract Text using pypdf
        extracted_texts: List[str] = []
        try:
            reader = PdfReader(pdf_stream)

            # Check for encryption (pypdf handles basic password attempts if needed,
            # but we'll explicitly fail if encrypted without a password mechanism)
            if reader.is_encrypted:
                 # Attempt decryption with an empty password, fails for most protected PDFs
                 try:
                     # You could add password handling logic here if needed
                     if not reader.decrypt(''):
                         logger.warning(f"PDF {object_name} is encrypted.")
                         raise PdfExtractionError(f"PDF '{object_name}' is encrypted and password protected.")
                     else:
                          logger.info(f"PDF {object_name} was encrypted but decrypted successfully (likely no password).")
                 except NotImplementedError:
                     # Some encryption types aren't supported by pypdf
                     logger.warning(f"PDF {object_name} uses unsupported encryption.")
                     raise PdfExtractionError(f"PDF '{object_name}' uses unsupported encryption.")


            # Iterate through pages and extract text
            num_pages = len(reader.pages)
            logger.debug(f"Reading {num_pages} pages from {object_name}...")
            for i, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text: # Add text only if content exists
                        extracted_texts.append(page_text.strip())
                    # else:
                    #     logger.debug(f"Page {i+1}/{num_pages} of {object_name} had no extractable text.")
                except Exception as page_error:
                     # Log error for specific page but try to continue
                     logger.warning(f"Could not extract text from page {i+1} of {object_name}: {page_error}")


        except PdfReadError as e:
            logger.error(f"Failed to read PDF structure for {object_name}: {e}", exc_info=True)
            raise PdfExtractionError(f"Failed to read PDF '{object_name}'. It might be corrupted or not a valid PDF. Error: {e}")
        except Exception as e: # Catch unexpected pypdf errors
            logger.error(f"Unexpected error during PDF parsing for {object_name}: {e}", exc_info=True)
            raise PdfExtractionError(f"Unexpected error processing PDF '{object_name}': {e}")
        finally:
             pdf_stream.close() # Close the BytesIO stream


        # 4. Combine and Return Text
        if not extracted_texts:
            logger.warning(f"No text could be extracted from PDF {object_name} (possibly image-based or empty).")
            # Decide whether to return empty string or raise error - empty string seems reasonable
            return ""

        full_text = "\n\n".join(extracted_texts) # Join pages with double newline for readability
        logger.info(f"Successfully extracted ~{len(full_text)} characters from {object_name}.")
        return full_text

# Create a singleton instance for easy use in other parts of the application
pdf_extractor_service = PdfExtractorService()