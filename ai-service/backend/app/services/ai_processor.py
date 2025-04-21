# app/services/ai_processor.py

import os
import json
import logging
from typing import Dict, List, Any, Optional
from uuid import UUID

# LangChain & Google GenAI Imports
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
# Import exceptions if needed for more granular error handling, e.g., from google.api_core.exceptions import GoogleAPIError

# Application Imports
from app.core.config import settings
from app.models.ai import AIProcessingRequest, AIProcessingResponse # Use the models we defined

# --- Custom Exceptions ---
class AIConfigurationError(Exception):
    """Custom exception for AI service configuration issues."""
    pass

class AIProcessingError(Exception):
    """Custom exception for failures during AI processing."""
    pass
# --- End Custom Exceptions ---

logger = logging.getLogger(__name__)

class AIProcessorService:
    """
    Service responsible for interacting with the configured Google Generative AI model
    via LangChain to process text based on a system prompt.
    """
    def __init__(self):
        """
        Initializes the AI Processor Service, configuring the LLM.
        """
        if not settings.GOOGLE_API_KEY:
            logger.error("GOOGLE_API_KEY is missing. AI Service cannot be initialized.")
            # This ensures the service won't even load if the key is missing.
            raise AIConfigurationError("GOOGLE_API_KEY environment variable not set.")

        try:
            self.llm = ChatGoogleGenerativeAI(
                model=settings.AI_MODEL_NAME,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=settings.AI_TEMPERATURE,
                # max_tokens=None, # Often better to let the model decide unless hitting limits
                # timeout=None,    # Default timeout
                max_retries=settings.AI_MAX_RETRIES,
                convert_system_message_to_human=True # Good practice for some models
            )
            logger.info(f"AI Processor Service initialized successfully with model: {settings.AI_MODEL_NAME}")
        except Exception as e:
            logger.error(f"Failed to initialize ChatGoogleGenerativeAI: {e}", exc_info=True)
            raise AIConfigurationError(f"Failed to configure the AI model: {e}")

    def _clean_json_string(self, raw_string: str) -> str:
        """ Helper to remove potential markdown backticks and surrounding whitespace. """
        cleaned = raw_string.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[len("```json"):].strip()
        elif cleaned.startswith("```"):
             cleaned = cleaned[len("```"):].strip()

        if cleaned.endswith("```"):
            cleaned = cleaned[:-len("```")].strip()
        return cleaned

    async def process_content(self, request_data: AIProcessingRequest) -> AIProcessingResponse:
        """
        Processes the extracted PDF content using the AI model based on the system prompt.

        Args:
            request_data: An AIProcessingRequest object containing document_id,
                          pdf_content, and system_prompt.

        Returns:
            An AIProcessingResponse object containing the status, structured output (if successful),
            and any error messages.
        """
        logger.info(f"Starting AI processing for document_id: {request_data.document_id}")

        # 1. Construct the prompt using LangChain templates
        # We combine the user-provided system prompt with the actual PDF content
        # Note: Some models work better if the system instructions are part of the first "human" message or use convert_system_message_to_human=True
        messages = [
            SystemMessage(content=request_data.system_prompt),
            HumanMessage(content=f"Here is the document content to process:\n\n---\n\n{request_data.pdf_content}\n\n---")
        ]
        # Alternative: If convert_system_message_to_human=False or model prefers combined prompt:
        # combined_prompt_text = f"{request_data.system_prompt}\n\nDocument Content:\n{request_data.pdf_content}"
        # messages = [HumanMessage(content=combined_prompt_text)]


        # 2. Invoke the LLM
        try:
            logger.debug(f"Invoking AI model '{settings.AI_MODEL_NAME}'...")
            # Use .ainvoke for async compatibility if LangChain supports it well for this provider
            # response = await self.llm.ainvoke(messages)
            # For simplicity and broader compatibility initially, use synchronous invoke
            # Ensure your FastAPI route allows for potentially longer synchronous operations or run in a thread pool executor later if needed
            response = self.llm.invoke(messages)
            raw_ai_output = response.content.strip()
            logger.debug(f"Received raw response from AI (length: {len(raw_ai_output)} chars)")
            # logger.debug(f"Raw AI Output: {raw_ai_output[:500]}...") # Log snippet for debugging

        # --- Specific Error Handling (Example - needs testing with actual API errors) ---
        # except GoogleAPIError as e: # Catch specific Google API errors if needed
        #     logger.error(f"Google API error during AI processing for doc {request_data.document_id}: {e}", exc_info=True)
        #     return AIProcessingResponse(
        #         document_id=request_data.document_id,
        #         status="error",
        #         model_used=settings.AI_MODEL_NAME,
        #         error_message=f"AI service API error: {e.message}"
        #     )
        # --- General Error Handling ---
        except Exception as e:
            logger.error(f"Error during AI model invocation for doc {request_data.document_id}: {e}", exc_info=True)
            return AIProcessingResponse(
                document_id=request_data.document_id,
                status="error",
                model_used=settings.AI_MODEL_NAME,
                error_message=f"Failed to get response from AI model: {str(e)}"
            )

        # 3. Parse the AI response (expecting JSON as per system prompt)
        structured_output: Optional[Dict | List | Any] = None
        error_message: Optional[str] = None
        status = "success" # Assume success unless parsing fails

        cleaned_output = self._clean_json_string(raw_ai_output)
        try:
            structured_output = json.loads(cleaned_output)
            logger.info(f"Successfully parsed JSON output from AI for doc {request_data.document_id}")

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse AI response as JSON for doc {request_data.document_id}. Error: {e}", exc_info=True)
            logger.warning(f"Cleaned AI Output that failed parsing: {cleaned_output[:500]}...") # Log snippet
            status = "error"
            error_message = f"AI model response was not valid JSON. Parse Error: {e}. Raw (cleaned) start: '{cleaned_output[:100]}...'"
            # Optionally, you could include the raw (cleaned) output in the response if needed for debugging
            # structured_output = {"raw_output": cleaned_output} # Or add a separate field

        except Exception as e: # Catch unexpected parsing errors
             logger.error(f"Unexpected error parsing AI response for doc {request_data.document_id}: {e}", exc_info=True)
             status = "error"
             error_message = f"Unexpected error parsing AI output: {str(e)}"


        # 4. Return the structured response
        return AIProcessingResponse(
            document_id=request_data.document_id,
            status=status,
            ai_structured_output=structured_output,
            model_used=settings.AI_MODEL_NAME,
            error_message=error_message
        )


# Create a singleton instance for easy use
try:
    ai_processor_service = AIProcessorService()
except AIConfigurationError as e:
    # If the service can't be initialized (e.g., missing key), log it and set the instance to None.
    # Code using this service will need to check if it's None.
    logger.critical(f"AI Processor Service failed to initialize: {e}. AI functionality will be unavailable.")
    ai_processor_service = None