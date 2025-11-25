"""Main FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api.routes import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"AWS Region: {settings.aws_region}")
    logger.info(f"Debug mode: {settings.debug}")
    
    # Pre-warm cache with instance types
    try:
        from app.services.aws_pricing import aws_pricing_service
        logger.info("Pre-warming instance types cache...")
        aws_pricing_service.get_ec2_instance_types()
        logger.info("Cache pre-warm complete")
    except Exception as e:
        logger.warning(f"Failed to pre-warm cache: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="""
    AWS Cost Estimator API - Estimate AWS infrastructure costs from Terraform code.
    
    ## Features
    
    * **Terraform Scanning**: Upload Terraform code to get cost estimates
    * **Live AWS Pricing**: Query current AWS pricing directly from the Pricing API
    * **Multi-Service Support**: EC2, RDS, EBS, Load Balancers, and more
    
    ## Usage
    
    1. Upload a zip file of your Terraform code to `/api/terraform/scan`
    2. Or query specific pricing via `/api/pricing/ec2/price`
    """,
    version=settings.app_version,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred",
            "type": type(exc).__name__
        }
    )


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health"
    }