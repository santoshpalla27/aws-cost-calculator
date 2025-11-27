import subprocess
import tempfile
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class GitHandler:
    @staticmethod
    def clone_repository(repo_url: str, branch: str = "main", depth: int = 1) -> str:
        """
        Clone a git repository to a temporary directory
        """
        try:
            # Create a temporary directory
            temp_dir = tempfile.mkdtemp(prefix="terraform_")
            
            # Clone the repository
            cmd = [
                "git", "clone",
                "--depth", str(depth),
                "--branch", branch,
                repo_url,
                temp_dir
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"Git clone failed: {result.stderr}")
                raise Exception(f"Git clone failed: {result.stderr}")
            
            logger.info(f"Successfully cloned repository to {temp_dir}")
            return temp_dir
            
        except subprocess.TimeoutExpired:
            logger.error("Git clone timed out")
            raise Exception("Git clone timed out")
        except Exception as e:
            logger.error(f"Error cloning git repository: {str(e)}")
            raise

    @staticmethod
    def pull_repository(repo_path: str, branch: str = "main") -> bool:
        """
        Pull the latest changes from a repository
        """
        try:
            cmd = ["git", "pull", "origin", branch]
            
            result = subprocess.run(
                cmd,
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"Git pull failed: {result.stderr}")
                return False
            
            logger.info("Successfully pulled latest changes")
            return True
            
        except subprocess.TimeoutExpired:
            logger.error("Git pull timed out")
            return False
        except Exception as e:
            logger.error(f"Error pulling git repository: {str(e)}")
            return False