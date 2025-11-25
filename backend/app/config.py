"""Application configuration management."""

from functools import lru_cache
from typing import Optional
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
    aws_pricing_region: str = "us-east-1"  # Pricing API only available here
    
    # Terraform
    terraform_work_dir: str = "/tmp/terraform_workspaces"
    terraform_timeout: int = 300  # seconds
    
    # Cache
    cache_ttl: int = 3600  # 1 hour
    cache_max_size: int = 10000
    
    # CORS
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()