import asyncio
import os
import json
import tempfile
import shutil
from typing import Dict, Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)

class TerraformRunner:
    """Service to run Terraform commands"""
    
    def __init__(self):
        self.work_dir = settings.WORK_DIR
        os.makedirs(self.work_dir, exist_ok=True)
    
    async def save_files(self, files: Dict[str, str]) -&gt; str:
        """Save uploaded Terraform files to a working directory"""
        work_dir = tempfile.mkdtemp(dir=self.work_dir)
        
        for filename, content in files.items():
            file_path = os.path.join(work_dir, filename)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            with open(file_path, 'w') as f:
                f.write(content)
        
        logger.info(f"Saved {len(files)} files to {work_dir}")
        return work_dir
    
    async def init(self, work_dir: str) -&gt; None:
        """Run terraform init"""
        logger.info(f"Running terraform init in {work_dir}")
        
        process = await asyncio.create_subprocess_exec(
            'terraform', 'init', '-no-color',
            cwd=work_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=settings.TERRAFORM_TIMEOUT
        )
        
        if process.returncode != 0:
            error_msg = stderr.decode()
            logger.error(f"Terraform init failed: {error_msg}")
            raise Exception(f"Terraform init failed: {error_msg}")
        
        logger.info("Terraform init completed successfully")
    
    async def plan(self, work_dir: str) -&gt; str:
        """Run terraform plan and return plan file path"""
        logger.info(f"Running terraform plan in {work_dir}")
        
        plan_file = os.path.join(work_dir, "tfplan")
        
        process = await asyncio.create_subprocess_exec(
            'terraform', 'plan', '-out', plan_file, '-no-color',
            cwd=work_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=settings.TERRAFORM_TIMEOUT
        )
        
        if process.returncode != 0:
            error_msg = stderr.decode()
            logger.error(f"Terraform plan failed: {error_msg}")
            raise Exception(f"Terraform plan failed: {error_msg}")
        
        logger.info("Terraform plan completed successfully")
        return plan_file
    
    async def show_json(self, work_dir: str, plan_file: str) -&gt; Dict:
        """Convert Terraform plan to JSON"""
        logger.info(f"Converting plan to JSON: {plan_file}")
        
        process = await asyncio.create_subprocess_exec(
            'terraform', 'show', '-json', plan_file,
            cwd=work_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=settings.TERRAFORM_TIMEOUT
        )
        
        if process.returncode != 0:
            error_msg = stderr.decode()
            logger.error(f"Terraform show failed: {error_msg}")
            raise Exception(f"Terraform show failed: {error_msg}")
        
        plan_json = json.loads(stdout.decode())
        logger.info("Successfully converted plan to JSON")
        return plan_json
    
    async def cleanup(self, work_dir: str) -&gt; None:
        """Clean up working directory"""
        try:
            if os.path.exists(work_dir):
                shutil.rmtree(work_dir)
                logger.info(f"Cleaned up working directory: {work_dir}")
        except Exception as e:
            logger.error(f"Error cleaning up {work_dir}: {str(e)}")