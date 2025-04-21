from pydantic import BaseModel, Field, validator
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime

class DocumentBase(BaseModel):
    """ Base document model with common fields"""
    description : Optional[str] = None 
class DocumentCreate(DocumentBase):
    """ Model for docuement creation request """
    pass 

class DocumentResponse(DocumentBase):
    """ Model for document response """
    document_id: UUID = Field(default_factory=uuid4)
    filename: str 
    storage_location: str
    size_bytes: int 
    content_type: str
    upload_date: datetime = Field(default_factory=datetime.now)
    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "filename": "example.pdf",
                "description": "Invoice document for March 2025",
                "storage_location": "pdfs/3fa85f64-5717-4562-b3fc-2c963f66afa6.pdf",
                "size_bytes": 125000,
                "content_type": "application/pdf",
                "upload_date": "2025-03-12T14:30:15.123Z"
            }
        }


class HealthResponse(BaseModel):
    """Model for health check responses"""
    status: str
    timestamp: datetime = Field(default_factory=datetime.now)
    dependencies: dict[str, str]

    class Config:
        json_schema_extra = {
            "example": {
                "status": "ok",
                "timestamp": "2025-03-12T14:30:15.123Z",
                "dependencies": {
                    "minio": "healthy"
                }
            }
        }