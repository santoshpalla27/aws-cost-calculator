import asyncio
import tempfile
import os
from git import Repo
import logging

logger = logging.getLogger(__name__)

class GitHandler:
    """Handle Git repository operations"""
    
    async def clone_repository(self, git_url: str, branch: str = "main") -&gt; str:
        """Clone Git repository to temporary directory"""
        logger.info(f"Cloning repository: {git_url} (branch: {branch})")
        
        work_dir = tempfile.mkdtemp()
        
        try:
            # Run git clone in executor to avoid blocking
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                self._clone_sync,
                git_url,
                branch,
                work_dir
            )
            
            logger.info(f"Repository cloned to: {work_dir}")
            return work_dir
            
        except Exception as e:
            logger.error(f"Failed to clone repository: {str(e)}")
            raise Exception(f"Git clone failed: {str(e)}")
    
    def _clone_sync(self, git_url: str, branch: str, work_dir: str):
        """Synchronous git clone operation"""
        Repo.clone_from(
            git_url,
            work_dir,
            branch=branch,
            depth=1  # Shallow clone
        )