"""Terraform plan parsing and execution service."""

import os
import json
import shutil
import tempfile
import subprocess
import zipfile
import logging
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from app.config import get_settings
from app.models.terraform import (
    TerraformResource, TerraformPlanResource, TerraformPlanOutput
)

settings = get_settings()
logger = logging.getLogger(__name__)


class TerraformParserError(Exception):
    """Custom exception for Terraform parsing errors."""
    pass


class TerraformParser:
    """Service for parsing and executing Terraform plans."""
    
    def __init__(self, work_dir: str = None):
        self.work_dir = work_dir or settings.terraform_work_dir
        self.timeout = settings.terraform_timeout
        os.makedirs(self.work_dir, exist_ok=True)
    
    def _run_command(
        self,
        cmd: List[str],
        cwd: str,
        env: Dict[str, str] = None
    ) -> Tuple[str, str, int]:
        """
        Run a shell command and return output.
        
        Args:
            cmd: Command and arguments as list
            cwd: Working directory
            env: Environment variables
            
        Returns:
            Tuple of (stdout, stderr, return_code)
        """
        full_env = os.environ.copy()
        if env:
            full_env.update(env)
        
        # Disable interactive prompts
        full_env["TF_INPUT"] = "false"
        full_env["TF_IN_AUTOMATION"] = "true"
        
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=self.timeout,
                env=full_env
            )
            return result.stdout, result.stderr, result.returncode
        except subprocess.TimeoutExpired:
            raise TerraformParserError(
                f"Command timed out after {self.timeout} seconds: {' '.join(cmd)}"
            )
        except Exception as e:
            raise TerraformParserError(f"Command execution failed: {e}")
    
    def extract_zip(self, zip_content: bytes) -> str:
        """
        Extract uploaded zip file to a temporary directory.
        
        Args:
            zip_content: Raw bytes of the zip file
            
        Returns:
            Path to the extracted directory
        """
        # Create unique workspace directory
        workspace = tempfile.mkdtemp(dir=self.work_dir, prefix="tf_")
        
        try:
            # Write zip content to temp file
            zip_path = os.path.join(workspace, "terraform.zip")
            with open(zip_path, 'wb') as f:
                f.write(zip_content)
            
            # Extract zip
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(workspace)
            
            # Remove zip file
            os.remove(zip_path)
            
            # Find the directory containing .tf files
            tf_dir = self._find_terraform_dir(workspace)
            
            if not tf_dir:
                raise TerraformParserError(
                    "No Terraform files (.tf) found in the uploaded archive"
                )
            
            return tf_dir
            
        except zipfile.BadZipFile:
            shutil.rmtree(workspace, ignore_errors=True)
            raise TerraformParserError("Invalid zip file uploaded")
        except Exception as e:
            shutil.rmtree(workspace, ignore_errors=True)
            raise TerraformParserError(f"Failed to extract zip file: {e}")
    
    def _find_terraform_dir(self, root_dir: str) -> Optional[str]:
        """Find directory containing Terraform files."""
        # Check root directory first
        if any(f.endswith('.tf') for f in os.listdir(root_dir)):
            return root_dir
        
        # Check subdirectories
        for item in os.listdir(root_dir):
            item_path = os.path.join(root_dir, item)
            if os.path.isdir(item_path):
                if any(f.endswith('.tf') for f in os.listdir(item_path)):
                    return item_path
        
        return None
    
    def terraform_init(self, workspace: str) -> None:
        """
        Run terraform init in the workspace.
        
        Args:
            workspace: Path to Terraform workspace
        """
        logger.info(f"Running terraform init in {workspace}")
        
        stdout, stderr, code = self._run_command(
            ["terraform", "init", "-no-color", "-input=false"],
            cwd=workspace
        )
        
        if code != 0:
            logger.error(f"terraform init failed: {stderr}")
            raise TerraformParserError(f"terraform init failed: {stderr}")
        
        logger.info("terraform init completed successfully")
    
    def terraform_plan(self, workspace: str) -> str:
        """
        Run terraform plan and save to file.
        
        Args:
            workspace: Path to Terraform workspace
            
        Returns:
            Path to the plan file
        """
        plan_file = os.path.join(workspace, "tfplan")
        
        logger.info(f"Running terraform plan in {workspace}")
        
        stdout, stderr, code = self._run_command(
            ["terraform", "plan", "-out=tfplan", "-no-color", "-input=false"],
            cwd=workspace
        )
        
        if code != 0:
            logger.error(f"terraform plan failed: {stderr}")
            raise TerraformParserError(f"terraform plan failed: {stderr}")
        
        logger.info("terraform plan completed successfully")
        return plan_file
    
    def terraform_show_json(self, workspace: str) -> Dict[str, Any]:
        """
        Run terraform show -json to get plan as JSON.
        
        Args:
            workspace: Path to Terraform workspace
            
        Returns:
            Parsed JSON plan output
        """
        logger.info(f"Running terraform show -json in {workspace}")
        
        stdout, stderr, code = self._run_command(
            ["terraform", "show", "-json", "tfplan"],
            cwd=workspace
        )
        
        if code != 0:
            logger.error(f"terraform show failed: {stderr}")
            raise TerraformParserError(f"terraform show failed: {stderr}")
        
        try:
            plan_json = json.loads(stdout)
            logger.info("terraform show completed successfully")
            return plan_json
        except json.JSONDecodeError as e:
            raise TerraformParserError(f"Failed to parse terraform plan JSON: {e}")
    
    def parse_plan_output(self, plan_json: Dict[str, Any]) -> List[TerraformPlanResource]:
        """
        Parse terraform plan JSON output into resource objects.
        
        Args:
            plan_json: Raw terraform plan JSON
            
        Returns:
            List of TerraformPlanResource objects
        """
        resources = []
        
        # Extract resources from planned_values
        planned_values = plan_json.get("planned_values", {})
        root_module = planned_values.get("root_module", {})
        
        # Parse root module resources
        for resource in root_module.get("resources", []):
            resources.append(self._parse_resource(resource))
        
        # Parse child module resources
        for child_module in root_module.get("child_modules", []):
            for resource in child_module.get("resources", []):
                resources.append(self._parse_resource(resource))
        
        # Also check resource_changes for more details
        for change in plan_json.get("resource_changes", []):
            # Skip data sources
            if change.get("mode") == "data":
                continue
            
            # Find matching resource and update with change info
            for res in resources:
                if res.address == change.get("address"):
                    res.change = change.get("change", {})
                    # Get values from 'after' in change
                    after_values = change.get("change", {}).get("after", {})
                    if after_values:
                        res.values.update(after_values)
        
        return resources
    
    def _parse_resource(self, resource_dict: Dict[str, Any]) -> TerraformPlanResource:
        """Parse a single resource from plan output."""
        return TerraformPlanResource(
            address=resource_dict.get("address", ""),
            mode=resource_dict.get("mode", "managed"),
            type=resource_dict.get("type", ""),
            name=resource_dict.get("name", ""),
            provider_name=resource_dict.get("provider_name", ""),
            values=resource_dict.get("values", {})
        )
    
    def cleanup_workspace(self, workspace: str) -> None:
        """
        Clean up a Terraform workspace directory.
        
        Args:
            workspace: Path to workspace to clean up
        """
        try:
            if workspace.startswith(self.work_dir):
                shutil.rmtree(workspace, ignore_errors=True)
                logger.info(f"Cleaned up workspace: {workspace}")
        except Exception as e:
            logger.warning(f"Failed to clean up workspace {workspace}: {e}")
    
    def process_terraform_zip(
        self,
        zip_content: bytes,
        skip_init: bool = False
    ) -> Tuple[List[TerraformPlanResource], str]:
        """
        Full pipeline: extract, init, plan, parse.
        
        Args:
            zip_content: Raw zip file bytes
            skip_init: Skip terraform init (if already initialized)
            
        Returns:
            Tuple of (parsed resources, workspace path)
        """
        workspace = None
        
        try:
            # Extract zip
            workspace = self.extract_zip(zip_content)
            logger.info(f"Extracted terraform to: {workspace}")
            
            # Run terraform init
            if not skip_init:
                self.terraform_init(workspace)
            
            # Run terraform plan
            self.terraform_plan(workspace)
            
            # Get plan JSON
            plan_json = self.terraform_show_json(workspace)
            
            # Parse resources
            resources = self.parse_plan_output(plan_json)
            
            return resources, workspace
            
        except TerraformParserError:
            if workspace:
                self.cleanup_workspace(workspace)
            raise
        except Exception as e:
            if workspace:
                self.cleanup_workspace(workspace)
            raise TerraformParserError(f"Unexpected error processing Terraform: {e}")


# Singleton instance
terraform_parser = TerraformParser()