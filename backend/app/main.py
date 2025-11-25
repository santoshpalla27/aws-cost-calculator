"""Main FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api.routes import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()


 @asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"AWS Region: {settings.aws_region}")
    logger.info(f"CORS Origins: {settings.cors_origins}")
    
    try:
        from app.services.aws_pricing import aws_pricing_service
        logger.info("Pre-warming instance types cache...")
        aws_pricing_service.get_ec2_instance_types()
        logger.info("Cache pre-warm complete")
    except Exception as e:
        logger.warning(f"Failed to pre-warm cache: {e}")
    
    yield
    
    logger.info("Shutting down application")


app = FastAPI(
    title=settings.app_name,
    description="AWS Cost Estimator API",
    version=settings.app_version,
    lifespan=lifespan
)

# CORS from environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


 @app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred", "type": type(exc).__name__}
    )


 @app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health"
    }
