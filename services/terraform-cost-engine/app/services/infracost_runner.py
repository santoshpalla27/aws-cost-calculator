import subprocess
import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class InfracostRunner:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    def run_infracost(self, working_dir: str, plan_file: Optional[str] = None) -> dict:
        """
        Run infracost breakdown in the specified directory
        """
        try:
            # Set environment variable for API key if provided
            env = os.environ.copy()
            if self.api_key:
                env['INFRACOST_API_KEY'] = self.api_key

            if plan_file:
                cmd = ["infracost", "breakdown", "--path", working_dir, "--format", "json", "--terraform-plan-flags", f"-var-file={plan_file}"]
            else:
                cmd = ["infracost", "breakdown", "--path", working_dir, "--format", "json"]

            result = subprocess.run(
                cmd,
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=600,  # 10 minute timeout
                env=env
            )

            if result.returncode != 0:
                logger.error(f"Infracost breakdown failed: {result.stderr}")
                raise Exception(f"Infracost breakdown failed: {result.stderr}")

            logger.info("Infracost breakdown completed successfully")
            return json.loads(result.stdout)

        except subprocess.TimeoutExpired:
            logger.error("Infracost breakdown timed out")
            raise Exception("Infracost breakdown timed out")
        except json.JSONDecodeError:
            logger.error("Failed to parse Infracost output as JSON")
            raise Exception("Failed to parse Infracost output as JSON")
        except Exception as e:
            logger.error(f"Error running infracost breakdown: {str(e)}")
            raise

    def run_infracost_with_plan_json(self, working_dir: str, plan_json_file: str) -> dict:
        """
        Run infracost breakdown using a plan JSON file
        """
        try:
            # Set environment variable for API key if provided
            env = os.environ.copy()
            if self.api_key:
                env['INFRACOST_API_KEY'] = self.api_key

            cmd = ["infracost", "breakdown", "--path", plan_json_file, "--format", "json", "--terraform-plan-json"]

            result = subprocess.run(
                cmd,
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=600,  # 10 minute timeout
                env=env
            )

            if result.returncode != 0:
                logger.error(f"Infracost breakdown failed: {result.stderr}")
                raise Exception(f"Infracost breakdown failed: {result.stderr}")

            logger.info("Infracost breakdown with plan JSON completed successfully")
            return json.loads(result.stdout)

        except subprocess.TimeoutExpired:
            logger.error("Infracost breakdown timed out")
            raise Exception("Infracost breakdown timed out")
        except json.JSONDecodeError:
            logger.error("Failed to parse Infracost output as JSON")
            raise Exception("Failed to parse Infracost output as JSON")
        except Exception as e:
            logger.error(f"Error running infracost breakdown: {str(e)}")
            raise

    def run_infracost_diff(self, working_dir: str, plan_file: str) -> dict:
        """
        Run infracost diff to compare costs
        """
        try:
            # Set environment variable for API key if provided
            env = os.environ.copy()
            if self.api_key:
                env['INFRACOST_API_KEY'] = self.api_key

            cmd = ["infracost", "diff", "--path", working_dir, "--format", "json", "--terraform-plan-flags", f"-var-file={plan_file}"]

            result = subprocess.run(
                cmd,
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=600,  # 10 minute timeout
                env=env
            )

            if result.returncode != 0:
                logger.error(f"Infracost diff failed: {result.stderr}")
                raise Exception(f"Infracost diff failed: {result.stderr}")

            logger.info("Infracost diff completed successfully")
            return json.loads(result.stdout)

        except subprocess.TimeoutExpired:
            logger.error("Infracost diff timed out")
            raise Exception("Infracost diff timed out")
        except json.JSONDecodeError:
            logger.error("Failed to parse Infracost diff output as JSON")
            raise Exception("Failed to parse Infracost diff output as JSON")
        except Exception as e:
            logger.error(f"Error running infracost diff: {str(e)}")
            raise