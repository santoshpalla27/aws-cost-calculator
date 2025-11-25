"""Pydantic models for Terraform-related data structures."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ResourceType(str, Enum):
    """Supported Terraform resource types for cost estimation."""
    AWS_INSTANCE = "aws_instance"
    AWS_DB_INSTANCE = "aws_db_instance"
    AWS_EBS_VOLUME = "aws_ebs_volume"
    AWS_LB = "aws_lb"
    AWS_LAMBDA_FUNCTION = "aws_lambda_function"
    AWS_S3_BUCKET = "aws_s3_bucket"
    AWS_NAT_GATEWAY = "aws_nat_gateway"
    AWS_EIP = "aws_eip"


class TerraformResource(BaseModel):
    """Represents a single Terraform resource."""
    address: str = Field(..., description="Full resource address (e.g., aws_instance.web)")
    type: str = Field(..., description="Resource type (e.g., aws_instance)")
    name: str = Field(..., description="Resource name")
    provider: str = Field(default="aws")
    values: Dict[str, Any] = Field(default_factory=dict)


class ResourceCostEstimate(BaseModel):
    """Cost estimate for a single resource."""
    resource: str = Field(..., description="Resource address")
    resource_type: str
    resource_name: str
    instance_type: Optional[str] = None
    region: Optional[str] = None
    price_per_hour: Optional[float] = None
    price_per_month: float
    price_per_year: Optional[float] = None
    currency: str = "USD"
    pricing_details: Optional[Dict[str, Any]] = None
    warnings: List[str] = Field(default_factory=list)


class TerraformScanRequest(BaseModel):
    """Request model for Terraform scanning."""
    skip_init: bool = Field(default=False, description="Skip terraform init")
    target_region: Optional[str] = Field(default=None, description="Override region")


class TerraformScanResponse(BaseModel):
    """Response model for Terraform scan results."""
    success: bool
    resources: List[ResourceCostEstimate]
    total_monthly_cost: float
    total_yearly_cost: float
    currency: str = "USD"
    resource_count: int
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    scan_duration_seconds: float


class TerraformPlanResource(BaseModel):
    """Resource extracted from terraform plan output."""
    address: str
    mode: str  # managed, data
    type: str
    name: str
    provider_name: str
    change: Optional[Dict[str, Any]] = None
    values: Dict[str, Any] = Field(default_factory=dict)


class TerraformPlanOutput(BaseModel):
    """Parsed terraform plan JSON output."""
    format_version: str
    terraform_version: str
    planned_values: Dict[str, Any]
    resource_changes: List[TerraformPlanResource]
    configuration: Optional[Dict[str, Any]] = None