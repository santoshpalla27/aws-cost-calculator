import tempfile
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class FileHandler:
    def __init__(self):
        pass

    def create_temp_dir(self) -> str:
        """
        Create a temporary directory for processing
        """
        try:
            temp_dir = tempfile.mkdtemp(prefix="terraform_processing_")
            logger.info(f"Created temporary directory: {temp_dir}")
            return temp_dir
        except Exception as e:
            logger.error(f"Error creating temporary directory: {str(e)}")
            raise

    def write_file(self, base_dir: str, file_path: str, content: str) -> str:
        """
        Write content to a file in the specified directory
        """
        try:
            # Ensure the directory exists
            full_path = os.path.join(base_dir, file_path)
            directory = os.path.dirname(full_path)
            
            if directory:
                os.makedirs(directory, exist_ok=True)
            
            # Write the file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            logger.info(f"Written file: {full_path}")
            return full_path
            
        except Exception as e:
            logger.error(f"Error writing file {file_path}: {str(e)}")
            raise

    def write_files(self, base_dir: str, files: dict) -> None:
        """
        Write multiple files to the specified directory
        """
        for file_path, content in files.items():
            self.write_file(base_dir, file_path, content)

    def read_file(self, file_path: str) -> str:
        """
        Read content from a file
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {str(e)}")
            raise

    def cleanup_temp_dir(self, temp_dir: str) -> bool:
        """
        Remove a temporary directory and all its contents
        """
        try:
            import shutil
            shutil.rmtree(temp_dir)
            logger.info(f"Cleaned up temporary directory: {temp_dir}")
            return True
        except Exception as e:
            logger.error(f"Error cleaning up temporary directory {temp_dir}: {str(e)}")
            return False

    def validate_file_size(self, file_path: str, max_size: int) -> bool:
        """
        Validate that a file is not larger than the maximum allowed size
        """
        try:
            size = os.path.getsize(file_path)
            return size <= max_size
        except Exception:
            return False