"""API routes initialization."""

from fastapi import APIRouter
from .terraform import router as terraform_router
from .pricing import router as pricing_router
from .health import router as health_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(terraform_router, prefix="/api")
api_router.include_router(pricing_router, prefix="/api")