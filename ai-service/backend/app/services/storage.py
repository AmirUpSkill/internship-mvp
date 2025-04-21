import io
import uuid
from typing import BinaryIO, Tuple

from fastapi import HTTPException, UploadFile
from minio import Minio
from minio.error import MinioException, S3Error

from app.core.config import settings




class MinioStorageService:
    """ Service for interfacing with MinIO object """
    def __init__(self):
        self.client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        # Ensure bucket exists on initialization
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """ Create the bucket if it doesn't exist  """
        try: 
            if not self.client.bucket_exists(settings.MINIO_BUCKET_NAME):
                self.client.make_bucket(settings.MINIO_BUCKET_NAME)
                print(f"Bucket '{settings.MINIO_BUCKET_NAME}' created successfully.")   
            else:
                print(f"Bucket '{settings.MINIO_BUCKET_NAME}' already exists.")
        except S3Error as err:
            print(f"Error checking/creating bucket: {err}")
            raise HTTPException(
                status_code=500,
                detail=f"Storage service error: {str(err)}"
            )

    async def store_file(self, file: UploadFile) -> Tuple[str, int]:
        """ 
        Store a file in MinIO 

        Args: 
            file (UploadFile): The file to be stored.
        Returns:
            Tuple containing the storage path and file size 
        Raises: 
            HttpException : If the file cannot be stored.
        """
        # this will help you generate a unique object name 
        file_extension = file.filename.split(".")[-1] if file.filename else "pdf"
        object_name = f"{uuid.uuid4()}.{file_extension}"
        storage_path = f"{settings.MINIO_BUCKET_NAME}/{object_name}"

        # Read file content 
        file_content = await file.read()
        file_size = len(file_content)

        try:
            # Store file in MinIO
            self.client.put_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                data=io.BytesIO(file_content),  # Fixed typo: 'date' to 'data'
                length=file_size,
                content_type=file.content_type or "application/pdf"
            )
            return storage_path, file_size
        except MinioException as err:
            raise HTTPException(
                status_code=500,
                detail=f"Storage service error: {str(err)}"
            )

    def check_health(self) -> bool:
        """Check if MinIO is reachable and the bucket exists"""
        try:
            # Simple operation to verify connection
            self.client.bucket_exists(settings.MINIO_BUCKET_NAME)
            return True
        except Exception as e:
            print(f"MinIO health check failed: {e}")
            return False


# Create a singleton instance
storage_service = MinioStorageService()