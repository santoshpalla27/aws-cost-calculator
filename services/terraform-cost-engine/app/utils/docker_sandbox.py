import docker
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class DockerSandbox:
    """
    Utility class to run Terraform and Infracost commands in isolated Docker containers
    """
    
    def __init__(self):
        try:
            self.client = docker.from_env()
            logger.info("Docker client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {str(e)}")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if Docker is available"""
        return self.client is not None
    
    def run_terraform_command(
        self, 
        command: str, 
        working_dir: str, 
        environment: Optional[Dict[str, str]] = None,
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Run a Terraform command in a Docker container
        
        Args:
            command: The Terraform command to run (e.g., "init", "plan")
            working_dir: The directory containing Terraform files
            environment: Optional environment variables
            timeout: Command timeout in seconds
            
        Returns:
            Dictionary with stdout, stderr, and exit_code
        """
        if not self.is_available():
            raise Exception("Docker is not available")
        
        try:
            # Use official Terraform Docker image
            image = "hashicorp/terraform:latest"
            
            # Prepare volumes
            volumes = {
                working_dir: {'bind': '/workspace', 'mode': 'rw'}
            }
            
            # Prepare environment variables
            env = environment or {}
            
            # Run container
            container = self.client.containers.run(
                image=image,
                command=f"terraform {command}",
                volumes=volumes,
                working_dir="/workspace",
                environment=env,
                detach=True,
                remove=False
            )
            
            # Wait for completion with timeout
            result = container.wait(timeout=timeout)
            
            # Get logs
            stdout = container.logs(stdout=True, stderr=False).decode('utf-8')
            stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
            
            # Remove container
            container.remove()
            
            return {
                'stdout': stdout,
                'stderr': stderr,
                'exit_code': result['StatusCode']
            }
            
        except docker.errors.ContainerError as e:
            logger.error(f"Container error: {str(e)}")
            raise
        except docker.errors.ImageNotFound as e:
            logger.error(f"Image not found: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error running Terraform in Docker: {str(e)}")
            raise
    
    def run_infracost_command(
        self,
        working_dir: str,
        api_key: Optional[str] = None,
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Run Infracost breakdown in a Docker container
        
        Args:
            working_dir: The directory containing Terraform files
            api_key: Infracost API key
            timeout: Command timeout in seconds
            
        Returns:
            Dictionary with stdout, stderr, and exit_code
        """
        if not self.is_available():
            raise Exception("Docker is not available")
        
        try:
            # Use official Infracost Docker image
            image = "infracost/infracost:latest"
            
            # Prepare volumes
            volumes = {
                working_dir: {'bind': '/workspace', 'mode': 'rw'}
            }
            
            # Prepare environment variables
            env = {}
            if api_key:
                env['INFRACOST_API_KEY'] = api_key
            
            # Run container
            container = self.client.containers.run(
                image=image,
                command="breakdown --path /workspace --format json",
                volumes=volumes,
                environment=env,
                detach=True,
                remove=False
            )
            
            # Wait for completion with timeout
            result = container.wait(timeout=timeout)
            
            # Get logs
            stdout = container.logs(stdout=True, stderr=False).decode('utf-8')
            stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
            
            # Remove container
            container.remove()
            
            return {
                'stdout': stdout,
                'stderr': stderr,
                'exit_code': result['StatusCode']
            }
            
        except Exception as e:
            logger.error(f"Error running Infracost in Docker: {str(e)}")
            raise