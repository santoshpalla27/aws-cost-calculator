from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Application settings
    app_name: str = "Terraform Cost Engine"
    debug: bool = False
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Database settings
    database_url: str = "postgresql://postgres:postgres@postgres:5432/infracost_analyzer"
    
    # Infracost settings
    infracost_api_key: Optional[str] = None
    
    # Docker settings
    docker_enabled: bool = True
    docker_timeout: int = 300  # 5 minutes
    
    # File handling settings
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    temp_dir: str = "/tmp/terraform-cost-engine"
    
    class Config:
        env_file = ".env"

settings = Settings()