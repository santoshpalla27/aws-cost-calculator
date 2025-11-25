"""Pydantic models for pricing-related data structures."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class AWSService(str, Enum):
    """Supported AWS services for pricing."""
    EC2 = "AmazonEC2"
    RDS = "AmazonRDS"
    S3 = "AmazonS3"
    LAMBDA = "AWSLambda"
    EBS = "AmazonEC2"  # EBS is part of EC2 pricing
    ELB = "AWSELB"
    CLOUDFRONT = "AmazonCloudFront"


class OperatingSystem(str, Enum):
    """EC2 Operating Systems."""
    LINUX = "Linux"
    WINDOWS = "Windows"
    RHEL = "RHEL"
    SUSE = "SUSE"


class Tenancy(str, Enum):
    """EC2 Tenancy options."""
    SHARED = "Shared"
    DEDICATED = "Dedicated"
    HOST = "Host"


class PricingUnit(str, Enum):
    """Pricing units."""
    HOURS = "Hrs"
    GB_MONTH = "GB-Mo"
    REQUESTS = "Requests"
    GB = "GB"


class InstanceTypeInfo(BaseModel):
    """Information about an EC2 instance type."""
    instance_type: str
    vcpu: Optional[int] = None
    memory_gib: Optional[float] = None
    network_performance: Optional[str] = None
    storage: Optional[str] = None


class PriceDetails(BaseModel):
    """Detailed pricing information."""
    price_per_unit: float
    unit: str
    currency: str = "USD"
    effective_date: Optional[str] = None
    description: Optional[str] = None


class EC2PricingRequest(BaseModel):
    """Request model for EC2 pricing lookup."""
    instance_type: str = Field(..., description="EC2 instance type (e.g., t3.micro)")
    region: str = Field(..., description="AWS region code (e.g., us-east-1)")
    operating_system: OperatingSystem = Field(default=OperatingSystem.LINUX)
    tenancy: Tenancy = Field(default=Tenancy.SHARED)
    pre_installed_sw: str = Field(default="NA", description="Pre-installed software")


class EC2PricingResponse(BaseModel):
    """Response model for EC2 pricing."""
    instance_type: str
    region: str
    operating_system: str
    price_per_hour: float
    price_per_month: float = Field(description="Based on 730 hours/month")
    currency: str = "USD"
    on_demand: bool = True
    details: Optional[Dict[str, Any]] = None


class RDSPricingRequest(BaseModel):
    """Request model for RDS pricing lookup."""
    instance_type: str
    region: str
    database_engine: str = Field(default="MySQL")
    deployment_option: str = Field(default="Single-AZ")


class EBSPricingRequest(BaseModel):
    """Request model for EBS pricing lookup."""
    volume_type: str = Field(default="gp3")
    region: str
    size_gb: int = Field(default=100)
    iops: Optional[int] = None
    throughput_mbps: Optional[int] = None


class GenericPricingRequest(BaseModel):
    """Generic pricing request for any service."""
    service: AWSService
    region: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class GenericPricingResponse(BaseModel):
    """Generic pricing response."""
    service: str
    region: str
    price_per_unit: float
    unit: str
    monthly_estimate: Optional[float] = None
    currency: str = "USD"
    parameters: Dict[str, Any] = Field(default_factory=dict)


class InstanceTypesResponse(BaseModel):
    """Response containing list of instance types."""
    instance_types: List[InstanceTypeInfo]
    total_count: int
    cached: bool = False