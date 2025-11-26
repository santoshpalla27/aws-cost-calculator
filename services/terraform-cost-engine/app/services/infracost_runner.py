import asyncio
import json
import tempfile
import os
from typing import Dict, Any
import logging

from app.config import settings

logger = logging.getLogger(__name__)

class InfracostRunner:
    """Service to run Infracost commands"""
    
    def __init__(self):
        self.api_key = settings.INFRACOST_API_KEY
        if not self.api_key:
            logger.warning("INFRACOST_API_KEY not set - using default pricing")
    
    async def breakdown(self, work_dir: str) -&gt; Dict[str, Any]:
        """Run infracost breakdown"""
        logger.info(f"Running infracost breakdown in {work_dir}")
        
        env = os.environ.copy()
        if self.api_key:
            env['INFRACOST_API_KEY'] = self.api_key
        
        process = await asyncio.create_subprocess_exec(
            'infracost', 'breakdown',
            '--path', work_dir,
            '--format', 'json',
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=settings.INFRACOST_TIMEOUT
        )
        
        if process.returncode != 0:
            error_msg = stderr.decode()
            logger.error(f"Infracost breakdown failed: {error_msg}")
            raise Exception(f"Infracost breakdown failed: {error_msg}")
        
        result = json.loads(stdout.decode())
        logger.info("Infracost breakdown completed successfully")
        return result
    
    async def run_from_plan_json(self, plan_json: Dict[str, Any]) -&gt; Dict[str, Any]:
        """Run infracost from Terraform plan JSON"""
        logger.info("Running infracost from plan JSON")
        
        # Save plan JSON to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(plan_json, f)
            plan_file = f.name
        
        try:
            env = os.environ.copy()
            if self.api_key:
                env['INFRACOST_API_KEY'] = self.api_key
            
            process = await asyncio.create_subprocess_exec(
                'infracost', 'breakdown',
                '--path', plan_file,
                '--format', 'json',
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=settings.INFRACOST_TIMEOUT
            )
            
            if process.returncode != 0:
                error_msg = stderr.decode()
                logger.error(f"Infracost breakdown failed: {error_msg}")
                raise Exception(f"Infracost breakdown failed: {error_msg}")
            
            result = json.loads(stdout.decode())
            logger.info("Infracost breakdown from plan JSON completed")
            return result
            
        finally:
            os.unlink(plan_file)
    
    async def diff(self, baseline: Dict[str, Any], compare: Dict[str, Any]) -&gt; Dict[str, Any]:
        """Run infracost diff between two configurations"""
        logger.info("Running infracost diff")
        
        # Save baseline and compare to temp files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(baseline, f)
            baseline_file = f.name
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(compare, f)
            compare_file = f.name
        
        try:
            env = os.environ.copy()
            if self.api_key:
                env['INFRACOST_API_KEY'] = self.api_key
            
            process = await asyncio.create_subprocess_exec(
                'infracost', 'diff',
                '--path', baseline_file,
                '--compare-to', compare_file,
                '--format', 'json',
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=settings.INFRACOST_TIMEOUT
            )
            
            if process.returncode != 0:
                error_msg = stderr.decode()
                logger.error(f"Infracost diff failed: {error_msg}")
                raise Exception(f"Infracost diff failed: {error_msg}")
            
            result = json.loads(stdout.decode())
            logger.info("Infracost diff completed successfully")
            return result
            
        finally:
            os.unlink(baseline_file)
            os.unlink(compare_file)