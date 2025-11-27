from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class TerraformEstimateRequest(BaseModel):
    source: str  # 'files', 'git', 'plan_json'
    gitUrl: Optional[str] = None
    branch: Optional[str] = "main"
    terraformFiles: Optional[Dict[str, str]] = None
    planJson: Optional[str] = None

class ResourceCost(BaseModel):
    name: str
    type: str
    monthlyCost: Optional[float] = 0
    hourlyCost: Optional[float] = 0
    details: Optional[Dict[str, Any]] = {}

class ServiceCost(BaseModel):
    name: str
    monthlyCost: float
    resources: List[ResourceCost]

class CostEstimateResponse(BaseModel):
    totalMonthlyCost: float
    totalHourlyCost: float
    resources: List[ResourceCost]
    services: List[ServiceCost]
    breakdown: Dict[str, Any]

class TerraformDiffRequest(BaseModel):
    baseConfig: Dict[str, Any]
    newConfig: Dict[str, Any]

class CostDiffResponse(BaseModel):
    addedCost: float
    deletedCost: float
    modifiedCost: float
    totalDiff: float
    breakdown: Dict[str, Any]