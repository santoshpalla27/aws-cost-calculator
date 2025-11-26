from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum

class SourceType(str, Enum):
    FILES = "files"
    GIT = "git"
    PLAN_JSON = "plan_json"

class TerraformEstimateRequest(BaseModel):
    source: SourceType
    gitUrl: Optional[str] = None
    branch: Optional[str] = "main"
    files: Optional[Dict[str, str]] = None
    planJson: Optional[Dict[str, Any]] = None
    awsRegion: Optional[str] = "us-east-1"
    awsAccessKey: Optional[str] = None
    awsSecretKey: Optional[str] = None

class ResourceCost(BaseModel):
    name: str
    type: str
    monthlyCost: float
    hourlyCost: float
    costComponents: List[Dict[str, Any]]

class CostSummary(BaseModel):
    totalResources: int
    resourcesByType: Dict[str, int]
    costByService: Dict[str, float]

class TerraformEstimateResponse(BaseModel):
    success: bool
    totalMonthlyCost: float
    totalHourlyCost: float
    currency: str = "USD"
    resources: List[ResourceCost]
    summary: CostSummary
    breakdown: Optional[Dict[str, Any]] = None

class TerraformDiffRequest(BaseModel):
    baseline: Dict[str, Any]
    compare: Dict[str, Any]

class ResourceChange(BaseModel):
    name: str
    type: str
    changeType: str  # added, removed, modified
    baselineCost: float
    compareCost: float
    costDiff: float

class TerraformDiffResponse(BaseModel):
    success: bool
    baselineCost: float
    compareCost: float
    totalMonthlyCostDiff: float
    percentageChange: float
    resourceChanges: List[ResourceChange]