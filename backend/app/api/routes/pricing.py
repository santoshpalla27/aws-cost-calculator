"""API routes for AWS pricing queries."""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.pricing import (
    EC2PricingRequest, EC2PricingResponse, GenericPricingRequest,
    GenericPricingResponse, InstanceTypeInfo, InstanceTypesResponse,
    AWSService, OperatingSystem, Tenancy
)
from app.services.aws_pricing import aws_pricing_service, REGION_NAME_MAP
from app.services.cache import pricing_cache

router = APIRouter(prefix="/pricing", tags=["pricing"])
logger = logging.getLogger(__name__)


@router.get("/regions")
async def get_regions():
    """
    Get list of supported AWS regions.
    
    Returns region codes mapped to their full names.
    """
    return {
        "regions": [
            {"code": code, "name": name}
            for code, name in sorted(REGION_NAME_MAP.items())
        ]
    }


@router.get("/ec2/types", response_model=InstanceTypesResponse)
async def get_ec2_instance_types(
    region: str = Query("us-east-1", description="AWS region code")
):
    """
    Get all available EC2 instance types.
    
    This list is cached for 24 hours to improve performance.
    The list includes basic instance specifications like vCPU and memory.
    """
    try:
        instance_types = aws_pricing_service.get_ec2_instance_types(region)
        
        return InstanceTypesResponse(
            instance_types=instance_types,
            total_count=len(instance_types),
            cached=True  # Always cached after first call
        )
        
    except Exception as e:
        logger.error(f"Error fetching instance types: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch instance types: {str(e)}"
        )


@router.get("/ec2/price", response_model=EC2PricingResponse)
async def get_ec2_price(
    instance_type: str = Query(..., description="EC2 instance type (e.g., t3.micro)"),
    region: str = Query(..., description="AWS region code (e.g., us-east-1)"),
    operating_system: OperatingSystem = Query(
        OperatingSystem.LINUX,
        description="Operating system"
    ),
    tenancy: Tenancy = Query(Tenancy.SHARED, description="Tenancy type")
):
    """
    Get on-demand pricing for a specific EC2 instance configuration.
    
    Returns hourly and monthly (730 hours) pricing.
    Results are cached for 1 hour.
    """
    try:
        request = EC2PricingRequest(
            instance_type=instance_type,
            region=region,
            operating_system=operating_system,
            tenancy=tenancy
        )
        
        response = aws_pricing_service.get_ec2_price(request)
        
        if not response:
            raise HTTPException(
                status_code=404,
                detail=f"Pricing not found for {instance_type} in {region}"
            )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching EC2 price: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch pricing: {str(e)}"
        )


@router.post("/estimate", response_model=GenericPricingResponse)
async def estimate_price(request: GenericPricingRequest):
    """
    Generic pricing estimation endpoint.
    
    Supports multiple AWS services with service-specific parameters.
    
    Supported services:
    - AmazonEC2: requires instance_type parameter
    - AmazonRDS: requires instance_type, engine parameters
    - AmazonS3: returns storage pricing tiers
    """
    try:
        if request.service == AWSService.EC2:
            # Extract EC2 parameters
            instance_type = request.parameters.get("instance_type", "t3.micro")
            operating_system = request.parameters.get("operating_system", "Linux")
            
            os_enum = OperatingSystem(operating_system) if operating_system in [e.value for e in OperatingSystem] else OperatingSystem.LINUX
            
            ec2_request = EC2PricingRequest(
                instance_type=instance_type,
                region=request.region,
                operating_system=os_enum
            )
            
            response = aws_pricing_service.get_ec2_price(ec2_request)
            
            if response:
                return GenericPricingResponse(
                    service=request.service.value,
                    region=request.region,
                    price_per_unit=response.price_per_hour,
                    unit="hour",
                    monthly_estimate=response.price_per_month,
                    currency="USD",
                    parameters=request.parameters
                )
        
        elif request.service == AWSService.RDS:
            instance_type = request.parameters.get("instance_type", "db.t3.micro")
            engine = request.parameters.get("engine", "MySQL")
            deployment = request.parameters.get("deployment", "Single-AZ")
            
            pricing = aws_pricing_service.get_rds_price(
                instance_type=instance_type,
                region=request.region,
                engine=engine,
                deployment=deployment
            )
            
            if pricing:
                return GenericPricingResponse(
                    service=request.service.value,
                    region=request.region,
                    price_per_unit=pricing["price_per_hour"],
                    unit="hour",
                    monthly_estimate=pricing["price_per_month"],
                    currency="USD",
                    parameters=request.parameters
                )
        
        elif request.service == AWSService.EBS:
            volume_type = request.parameters.get("volume_type", "gp3")
            size_gb = request.parameters.get("size_gb", 100)
            
            pricing = aws_pricing_service.get_ebs_price(volume_type, request.region)
            
            if pricing:
                monthly_cost = pricing["price_per_gb_month"] * size_gb
                return GenericPricingResponse(
                    service=request.service.value,
                    region=request.region,
                    price_per_unit=pricing["price_per_gb_month"],
                    unit="GB-month",
                    monthly_estimate=monthly_cost,
                    currency="USD",
                    parameters=request.parameters
                )
        
        raise HTTPException(
            status_code=404,
            detail=f"Pricing not found for the specified configuration"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in pricing estimation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Pricing estimation failed: {str(e)}"
        )


@router.get("/cache/stats")
async def get_cache_stats():
    """
    Get cache statistics.
    
    Returns hit rate, size, and other cache metrics.
    """
    return pricing_cache.get_stats()


@router.post("/cache/clear")
async def clear_cache():
    """
    Clear the pricing cache.
    
    Use this to force fresh pricing data from AWS.
    """
    pricing_cache.clear()
    return {"message": "Cache cleared successfully"}