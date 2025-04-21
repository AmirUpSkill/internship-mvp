"""
FastAPI Backend for ClickUp Integration

This module provides a REST API interface to create tickets in ClickUp.
It uses FastAPI framework for the API implementation and integrates with ClickUp's API.

Key Components:
- FastAPI application setup with CORS middleware
- ClickUp API integration
- Ticket creation endpoint
- Data validation using Pydantic models

Requirements:
- Python 3.7+
- FastAPI
- httpx
- python-dotenv
- pydantic
"""

from fastapi import FastAPI, HTTPException
# Removed duplicate FastAPI, HTTPException import here
from pydantic import BaseModel, constr, Field
from typing import Optional # Removed unused List import
import httpx
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI application
app = FastAPI()

# Configure CORS middleware to allow requests from NextJS frontend
# FIX: Removed angle brackets < > from the origin string
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins temporarily for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ClickUp API configuration
# FIX: Removed angle brackets < > from the URL string
CLICKUP_API_URL = "https://api.clickup.com/api/v2/list/{list_id}/task"
API_KEY = os.getenv("CLICKUP_API_KEY", "pk_72163060_S0KYNR7YCXM2R75LNCMVPERJLOJUJHTU")  # Fallback for PoC
LIST_ID = "901208496477"  # ClickUp List ID where tasks will be created
# Ensure API_KEY is valid and has access to the LIST_ID
if not API_KEY:
    print("Warning: CLICKUP_API_KEY environment variable not set. Using fallback.")
    # Consider raising an error if fallback is not desired in production

HEADERS = {"Authorization": API_KEY, "Content-Type": "application/json"}

class TicketCreate(BaseModel):
    """
    Pydantic model for validating ticket creation requests.
    Defines the structure and validation rules for new tickets.
    """
    name: constr(max_length=250) = Field(..., description="The title of the ticket (required, max 250 chars)")
    description: Optional[str] = Field(None, description="The ticket description (optional, supports Markdown)")
    priority: Optional[int] = Field(3, ge=1, le=4, description="Priority: 1=Urgent, 2=High, 3=Normal, 4=Low")
    status: Optional[str] = Field("To Do", description="Task status (must match List's workflow)")

    class Config:
        # Updated to match Pydantic v2 style if needed, but json_schema_extra is fine for now
        json_schema_extra = {
            "example": {
                "name": "Fix login bug",
                "description": "Users can't log in due to a session timeout issue.",
                "priority": 2,
                "status": "To Do"
            }
        }

@app.get("/")
async def root():
    """Health check endpoint to verify API is running"""
    return {"message": "Hello, ClickUp PoC!"}

@app.post("/create-ticket")
async def create_ticket(ticket: TicketCreate):
    """
    Creates a new ticket in ClickUp.

    Args:
        ticket (TicketCreate): Validated ticket data from request body

    Returns:
        dict: Contains created ticket ID and URL

    Raises:
        HTTPException: If ClickUp API request fails or returns an error status.
    """
    if not API_KEY:
         raise HTTPException(status_code=500, detail="ClickUp API Key is not configured on the server.")

    # Prepare payload for ClickUp API, ensuring None values are handled if necessary
    # (though ClickUp API might ignore nulls, explicit check can be added if needed)
    payload = {
        "name": ticket.name,
        "description": ticket.description,
        "priority": ticket.priority,
        "status": ticket.status
    }

    # Ensure list_id is present before formatting URL
    if not LIST_ID:
        raise HTTPException(status_code=500, detail="ClickUp List ID is not configured on the server.")

    formatted_url = CLICKUP_API_URL.format(list_id=LIST_ID)

    # Send async request to ClickUp API
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                formatted_url,
                headers=HEADERS,
                json=payload
            )
            # Raise HTTP errors for 4xx/5xx responses immediately
            response.raise_for_status()

        except httpx.RequestError as exc:
            # Handle network-related errors (DNS resolution, connection refused, etc.)
            print(f"An error occurred while requesting {exc.request.url!r}: {exc}")
            raise HTTPException(status_code=503, detail=f"Could not connect to ClickUp API: {exc}")
        except httpx.HTTPStatusError as exc:
            # Handle 4xx/5xx errors from ClickUp
            status_code = exc.response.status_code
            # Try to parse error detail from ClickUp response if it's JSON
            try:
                error_detail = exc.response.json()
                # ClickUp error structure might vary, common fields are 'err' and 'ECODE'
                detail_message = error_detail.get('err', f"ClickUp API Error: {exc.response.text}")
            except Exception: # If response is not JSON or parsing fails
                detail_message = f"ClickUp API Error ({status_code}): {exc.response.text}"

            print(f"ClickUp API returned error {status_code}: {detail_message}")
            # Raise an HTTPException with the status code from ClickUp and a parsed detail
            raise HTTPException(status_code=status_code, detail=detail_message)

    # Process successful API response (status_code == 200 or other 2xx)
    try:
        task_data = response.json()
        # Check for expected fields in the successful response
        if "id" not in task_data or "url" not in task_data:
             print(f"ClickUp success response missing expected fields: {task_data}")
             raise HTTPException(status_code=500, detail="Received unexpected success response format from ClickUp.")

        return {"message": "Ticket created successfully", "task_id": task_data["id"], "url": task_data["url"]}
    except Exception as e: # Catch JSON decoding errors or other issues processing success response
        print(f"Error processing successful ClickUp response: {e}")
        raise HTTPException(status_code=500, detail="Failed to process response from ClickUp.")