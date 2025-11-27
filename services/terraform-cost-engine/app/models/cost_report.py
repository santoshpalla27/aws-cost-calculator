from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import json
from typing import Dict, Any

Base = declarative_base()

class CostReport(Base):
    __tablename__ = "cost_reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    data = Column(Text)  # JSON data as text
    total_monthly_cost = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __init__(self, name: str, description: str, data: Dict[str, Any], total_monthly_cost: float):
        self.name = name
        self.description = description
        self.data = json.dumps(data)
        self.total_monthly_cost = total_monthly_cost

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "data": json.loads(self.data) if self.data else {},
            "total_monthly_cost": self.total_monthly_cost,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }