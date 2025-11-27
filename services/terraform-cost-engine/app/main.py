from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import subprocess
import tempfile
import os
import json
import asyncio
from .services.terraform_runner import TerraformRunner
from .services.infracost_runner import InfracostRunner
from .services.git_handler import GitHandler
from .services.cost_parser import CostParser
from .models.cost_report import CostReport
from .config import settings
from .utils.file_handler import FileHandler
from .utils.docker_sandbox import DockerSandbox

app = FastAPI(
    title="Terraform Cost Engine API",
    description="API for estimating Terraform infrastructure costs using Infracost",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TerraformEstimateRequest(BaseModel):
    source: str  # 'files', 'git', 'plan_json'
    gitUrl: Optional[str] = None
    branch: Optional[str] = "main"
    terraformFiles: Optional[Dict[str, str]] = None
    planJson: Optional[str] = None

class TerraformDiffRequest(BaseModel):
    baseConfig: Dict[str, Any]
    newConfig: Dict[str, Any]

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "terraform-cost-engine",
        "version": "1.0.0"
    }

@app.post("/estimate")
async def estimate_costs(request: TerraformEstimateRequest, background_tasks: BackgroundTasks):
    try:
        # Validate request
        if request.source not in ["files", "git", "plan_json"]:
            raise HTTPException(status_code=400, detail="Invalid source type")
        
        if request.source == "git" and not request.gitUrl:
            raise HTTPException(status_code=400, detail="Git URL is required for git source")
        
        if request.source == "files" and not request.terraformFiles:
            raise HTTPException(status_code=400, detail="Terraform files are required for files source")
        
        if request.source == "plan_json" and not request.planJson:
            raise HTTPException(status_code=400, detail="Plan JSON is required for plan_json source")

        # Initialize services
        file_handler = FileHandler()
        terraform_runner = TerraformRunner()
        infracost_runner = InfracostRunner()
        cost_parser = CostParser()

        # Process based on source type
        temp_dir = None
        cost_result = None

        if request.source == "files":
            # Create temporary directory and write files
            temp_dir = file_handler.create_temp_dir()
            for file_path, content in request.terraformFiles.items():
                file_handler.write_file(temp_dir, file_path, content)
            
            # Run terraform init and plan
            terraform_runner.run_init(temp_dir)
            plan_file = terraform_runner.run_plan(temp_dir)
            
            # Run infracost
            infracost_result = infracost_runner.run_infracost(temp_dir, plan_file)
            cost_result = cost_parser.parse_cost_output(infracost_result)
            
        elif request.source == "git":
            # Clone git repository
            temp_dir = GitHandler.clone_repository(request.gitUrl, request.branch)
            
            # Run terraform init and plan
            terraform_runner.run_init(temp_dir)
            plan_file = terraform_runner.run_plan(temp_dir)
            
            # Run infracost
            infracost_result = infracost_runner.run_infracost(temp_dir, plan_file)
            cost_result = cost_parser.parse_cost_output(infracost_result)
            
        elif request.source == "plan_json":
            # Write plan JSON to temporary file
            temp_dir = file_handler.create_temp_dir()
            plan_file_path = os.path.join(temp_dir, "plan.json")
            with open(plan_file_path, 'w') as f:
                f.write(request.planJson)
            
            # Run infracost directly on plan JSON
            infracost_result = infracost_runner.run_infracost_with_plan_json(temp_dir, plan_file_path)
            cost_result = cost_parser.parse_cost_output(infracost_result)

        # Save report to database
        if cost_result:
            report = CostReport(
                name=f"Terraform cost estimate - {request.source}",
                description="Automatically generated cost estimate",
                data=cost_result,
                total_monthly_cost=cost_result.get("totalMonthlyCost", 0)
            )
            # background_tasks.add_task(report.save_to_db)  # Run in background

        # Cleanup temporary directory
        if temp_dir and os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir)

        return cost_result

    except Exception as e:
        if temp_dir and os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=f"Error estimating costs: {str(e)}")

@app.post("/diff")
async def calculate_cost_diff(request: TerraformDiffRequest):
    try:
        # This would implement cost diff between two configurations
        # For now, returning a placeholder
        return {
            "addedCost": 0,
            "deletedCost": 0,
            "modifiedCost": 0,
            "totalDiff": 0,
            "breakdown": {}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating diff: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)