from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "Terraform Cost Engine"
    DEBUG: bool = False
    
    # API settings
    API_PREFIX: str = "/api"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@postgres:5432/infracost_db"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Infracost
    INFRACOST_API_KEY: str = ""
    
    # AWS (optional for Terraform providers)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_DEFAULT_REGION: str = "us-east-1"
    
    # Working directory
    WORK_DIR: str = "/tmp/terraform-work"
    
    # Timeouts (seconds)
    TERRAFORM_TIMEOUT: int = 300
    INFRACOST_TIMEOUT: int = 300
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()