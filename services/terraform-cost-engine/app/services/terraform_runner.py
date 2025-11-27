import subprocess
import os
from typing import Optional
import tempfile
import logging

logger = logging.getLogger(__name__)

class TerraformRunner:
    def __init__(self):
        pass

    def run_init(self, working_dir: str) -> bool:
        """
        Run terraform init in the specified directory
        """
        try:
            result = subprocess.run(
                ["terraform", "init"],
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"Terraform init failed: {result.stderr}")
                return False
            
            logger.info("Terraform init completed successfully")
            return True
            
        except subprocess.TimeoutExpired:
            logger.error("Terraform init timed out")
            return False
        except Exception as e:
            logger.error(f"Error running terraform init: {str(e)}")
            return False

    def run_plan(self, working_dir: str, out_file: Optional[str] = None) -> str:
        """
        Run terraform plan in the specified directory
        """
        try:
            if out_file:
                cmd = ["terraform", "plan", "-out", out_file]
            else:
                # Create a temporary plan file
                out_file = os.path.join(working_dir, "plan.out")
                cmd = ["terraform", "plan", "-out", out_file]
            
            result = subprocess.run(
                cmd,
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"Terraform plan failed: {result.stderr}")
                raise Exception(f"Terraform plan failed: {result.stderr}")
            
            logger.info("Terraform plan completed successfully")
            return out_file
            
        except subprocess.TimeoutExpired:
            logger.error("Terraform plan timed out")
            raise Exception("Terraform plan timed out")
        except Exception as e:
            logger.error(f"Error running terraform plan: {str(e)}")
            raise

    def run_show(self, working_dir: str, plan_file: str) -> str:
        """
        Run terraform show to get JSON output of the plan
        """
        try:
            result = subprocess.run(
                ["terraform", "show", "-json", plan_file],
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"Terraform show failed: {result.stderr}")
                raise Exception(f"Terraform show failed: {result.stderr}")
            
            logger.info("Terraform show completed successfully")
            return result.stdout
            
        except subprocess.TimeoutExpired:
            logger.error("Terraform show timed out")
            raise Exception("Terraform show timed out")
        except Exception as e:
            logger.error(f"Error running terraform show: {str(e)}")
            raise