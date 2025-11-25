"""Health check and status endpoints."""

import subprocess
from fastapi import APIRouter

from app.config import get_settings
from app.services.cache import pricing_cache

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    """
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version
    }


@router.get("/health/detailed")
async def detailed_health_check():
    """
    Detailed health check including dependencies.
    """
    checks = {
        "app": {"status": "healthy"},
        "terraform": {"status": "unknown"},
        "aws": {"status": "unknown"},
        "cache": pricing_cache.get_stats()
    }
    
    # Check Terraform installation
    try:
        result = subprocess.run(
            ["terraform", "version", "-json"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            import json
            version_info = json.loads(result.stdout)
            checks["terraform"] = {
                "status": "healthy",
                "version": version_info.get("terraform_version", "unknown")
            }
        else:
            checks["terraform"] = {
                "status": "unhealthy",
                "error": result.stderr
            }
    except Exception as e:
        checks["terraform"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check AWS connectivity
    try:
        from app.services.aws_pricing import aws_pricing_service
        # Try to list services (lightweight call)
        aws_pricing_service.client.describe_services(
            ServiceCode="AmazonEC2",
            MaxResults=1
        )
        checks["aws"] = {"status": "healthy"}
    except Exception as e:
        checks["aws"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Overall status
    all_healthy = all(
        c.get("status") == "healthy"
        for c in [checks["app"], checks["terraform"], checks["aws"]]
    )
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks
    }