from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import documents

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for uploading and storing PDF documents",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For PoC only; restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    documents.router,
    prefix=f"{settings.API_V1_STR}/documents",
    tags=["documents"],
)

@app.get("/")
async def root():
    """Root endpoint that redirects to docs"""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": f"{settings.API_V1_STR}/docs"
    }

# Health check endpoint at API root level
@app.get(f"{settings.API_V1_STR}/health")
async def health_check():
    """Alias for the document router's health check"""
    return await documents.health_check()