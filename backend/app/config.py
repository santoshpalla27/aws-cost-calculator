"""Application configuration management."""

from functools import lru_cache
from typing import Optional, List
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "AWS Cost Estimator"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # AWS Configuration
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"
    aws_pricing_region: str = "us-east-1"
    
    # Terraform
    terraform_work_dir: str = "/tmp/terraform_workspaces"
    terraform_timeout: int = 300
    
    # Cache
    cache_ttl: int = 3600
    cache_max_size: int = 10000
    
    # CORS - will be parsed from env
    allowed_origins: str = "*"
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse allowed_origins string into a list."""
        origins = os.getenv("ALLOWED_ORIGINS", self.allowed_origins)
        if not origins or origins == "*":
            return ["*"]
        return [origin.strip() for origin in origins.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
