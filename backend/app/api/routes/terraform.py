"""API routes for Terraform scanning and cost estimation."""

import time
import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query

from app.models.terraform import (
    TerraformScanRequest, TerraformScanResponse, ResourceCostEstimate
)
from app.services.terraform_parser import terraform_parser, TerraformParserError
from app.services.resource_mapper import resource_mapper

router = APIRouter(prefix="/terraform", tags=["terraform"])
logger = logging.getLogger(__name__)


@router.post("/scan", response_model=TerraformScanResponse)
async def scan_terraform(
    file: UploadFile = File(..., description="Zip file containing Terraform code"),
    skip_init: bool = Query(False, description="Skip terraform init"),
    target_region: str = Query(None, description="Override region for all resources")
):
    """
    Scan Terraform code and estimate AWS costs.
    
    Upload a zip file containing your Terraform configuration files.
    The service will:
    1. Extract the files
    2. Run terraform init and plan
    3. Parse the plan output
    4. Query AWS Pricing API for each resource
    5. Return cost estimates
    
    Supported resources:
    - aws_instance (EC2)
    - aws_db_instance (RDS)
    - aws_ebs_volume (EBS)
    - aws_lb / aws_alb / aws_elb (Load Balancers)
    - aws_nat_gateway
    - aws_eip (Elastic IP)
    """
    start_time = time.time()
    warnings = []
    errors = []
    workspace = None
    
    # Validate file
    if not file.filename.endswith('.zip'):
        raise HTTPException(
            status_code=400,
            detail="File must be a .zip archive containing Terraform files"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        if len(content) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 50MB limit"
            )
        
        # Process Terraform
        logger.info(f"Processing Terraform zip: {file.filename}")
        
        resources, workspace = terraform_parser.process_terraform_zip(
            content, skip_init=skip_init
        )
        
        logger.info(f"Found {len(resources)} resources in Terraform plan")
        
        # Estimate costs
        estimates: List[ResourceCostEstimate] = resource_mapper.estimate_resources(
            resources, target_region=target_region
        )
        
        # Collect warnings from estimates
        for estimate in estimates:
            if estimate.warnings:
                warnings.extend([f"{estimate.resource}: {w}" for w in estimate.warnings])
        
        # Calculate totals
        total_monthly = sum(e.price_per_month for e in estimates)
        total_yearly = total_monthly * 12
        
        duration = time.time() - start_time
        
        return TerraformScanResponse(
            success=True,
            resources=estimates,
            total_monthly_cost=round(total_monthly, 2),
            total_yearly_cost=round(total_yearly, 2),
            currency="USD",
            resource_count=len(estimates),
            warnings=warnings,
            errors=errors,
            scan_duration_seconds=round(duration, 2)
        )
        
    except TerraformParserError as e:
        logger.error(f"Terraform parsing error: {e}")
        duration = time.time() - start_time
        return TerraformScanResponse(
            success=False,
            resources=[],
            total_monthly_cost=0,
            total_yearly_cost=0,
            resource_count=0,
            errors=[str(e)],
            scan_duration_seconds=round(duration, 2)
        )
        
    except Exception as e:
        logger.exception(f"Unexpected error scanning Terraform: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
        
    finally:
        # Cleanup workspace
        if workspace:
            terraform_parser.cleanup_workspace(workspace)


@router.post("/validate")
async def validate_terraform(
    file: UploadFile = File(..., description="Zip file containing Terraform code")
):
    """
    Validate Terraform code without cost estimation.
    
    Quickly check if the Terraform configuration is valid.
    """
    workspace = None
    
    try:
        content = await file.read()
        workspace = terraform_parser.extract_zip(content)
        terraform_parser.terraform_init(workspace)
        
        # Run terraform validate
        from app.services.terraform_parser import terraform_parser as tp
        stdout, stderr, code = tp._run_command(
            ["terraform", "validate", "-json"],
            cwd=workspace
        )
        
        import json
        result = json.loads(stdout)
        
        return {
            "valid": result.get("valid", False),
            "error_count": result.get("error_count", 0),
            "warning_count": result.get("warning_count", 0),
            "diagnostics": result.get("diagnostics", [])
        }
        
    except TerraformParserError as e:
        return {
            "valid": False,
            "error": str(e)
        }
        
    finally:
        if workspace:
            terraform_parser.cleanup_workspace(workspace)