from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import Optional, Dict, Any
import logging

from app.api.schemas import (
    TerraformEstimateRequest,
    TerraformEstimateResponse,
    TerraformDiffRequest,
    TerraformDiffResponse
)
from app.services.terraform_runner import TerraformRunner
from app.services.infracost_runner import InfracostRunner
from app.services.git_handler import GitHandler
from app.services.cost_parser import CostParser

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/estimate", response_model=TerraformEstimateResponse)
async def estimate_terraform_cost(
    request: TerraformEstimateRequest,
    background_tasks: BackgroundTasks
):
    """
    Estimate infrastructure costs from Terraform configuration
    
    Supports three input methods:
    1. Terraform files (uploaded)
    2. Git repository URL
    3. Terraform plan JSON
    """
    try:
        logger.info(f"Received cost estimation request: source={request.source}")
        
        terraform_runner = TerraformRunner()
        infracost_runner = InfracostRunner()
        cost_parser = CostParser()
        
        # Handle different input sources
        if request.source == "git":
            if not request.gitUrl:
                raise HTTPException(status_code=400, detail="Git URL is required")
            
            git_handler = GitHandler()
            work_dir = await git_handler.clone_repository(
                request.gitUrl,
                request.branch or "main"
            )
            
        elif request.source == "files":
            if not request.files:
                raise HTTPException(status_code=400, detail="Files are required")
            
            work_dir = await terraform_runner.save_files(request.files)
            
        elif request.source == "plan_json":
            if not request.planJson:
                raise HTTPException(status_code=400, detail="Plan JSON is required")
            
            # Use plan JSON directly with Infracost
            result = await infracost_runner.run_from_plan_json(request.planJson)
            parsed_result = cost_parser.parse_infracost_output(result)
            
            return TerraformEstimateResponse(
                success=True,
                totalMonthlyCost=parsed_result["totalMonthlyCost"],
                totalHourlyCost=parsed_result["totalHourlyCost"],
                currency=parsed_result["currency"],
                resources=parsed_result["resources"],
                summary=parsed_result["summary"]
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid source type")
        
        # Run Terraform init and plan
        logger.info(f"Running Terraform in directory: {work_dir}")
        await terraform_runner.init(work_dir)
        plan_file = await terraform_runner.plan(work_dir)
        plan_json = await terraform_runner.show_json(work_dir, plan_file)
        
        # Run Infracost
        logger.info("Running Infracost breakdown")
        infracost_result = await infracost_runner.breakdown(work_dir)
        
        # Parse results
        parsed_result = cost_parser.parse_infracost_output(infracost_result)
        
        # Cleanup in background
        background_tasks.add_task(terraform_runner.cleanup, work_dir)
        
        logger.info(f"Cost estimation completed: total=\${parsed_result['totalMonthlyCost']}")
        
        return TerraformEstimateResponse(
            success=True,
            totalMonthlyCost=parsed_result["totalMonthlyCost"],
            totalHourlyCost=parsed_result["totalHourlyCost"],
            currency=parsed_result["currency"],
            resources=parsed_result["resources"],
            summary=parsed_result["summary"],
            breakdown=parsed_result.get("breakdown", {})
        )
        
    except Exception as e:
        logger.error(f"Error in cost estimation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/diff", response_model=TerraformDiffResponse)
async def diff_terraform_costs(
    request: TerraformDiffRequest,
    background_tasks: BackgroundTasks
):
    """
    Compare costs between two Terraform configurations
    """
    try:
        logger.info("Received cost diff request")
        
        infracost_runner = InfracostRunner()
        cost_parser = CostParser()
        
        # Run Infracost diff
        diff_result = await infracost_runner.diff(
            request.baseline,
            request.compare
        )
        
        # Parse diff results
        parsed_diff = cost_parser.parse_infracost_diff(diff_result)
        
        logger.info(f"Cost diff completed: change=\${parsed_diff['totalMonthlyCostDiff']}")
        
        return TerraformDiffResponse(
            success=True,
            baselineCost=parsed_diff["baselineCost"],
            compareCost=parsed_diff["compareCost"],
            totalMonthlyCostDiff=parsed_diff["totalMonthlyCostDiff"],
            percentageChange=parsed_diff["percentageChange"],
            resourceChanges=parsed_diff["resourceChanges"]
        )
        
    except Exception as e:
        logger.error(f"Error in cost diff: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))