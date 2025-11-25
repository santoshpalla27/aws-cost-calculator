"""Service for mapping Terraform resources to AWS pricing."""

import re
import logging
from typing import List, Dict, Any, Optional

from app.models.terraform import TerraformPlanResource, ResourceCostEstimate
from app.models.pricing import EC2PricingRequest, OperatingSystem
from app.services.aws_pricing import aws_pricing_service

logger = logging.getLogger(__name__)


# Default region if not specified
DEFAULT_REGION = "us-east-1"

# AMI patterns for OS detection
AMI_OS_PATTERNS = {
    "windows": OperatingSystem.WINDOWS,
    "win": OperatingSystem.WINDOWS,
    "rhel": OperatingSystem.RHEL,
    "red hat": OperatingSystem.RHEL,
    "suse": OperatingSystem.SUSE,
    "sles": OperatingSystem.SUSE,
}


class ResourceMapper:
    """Maps Terraform resources to AWS pricing."""
    
    def __init__(self):
        self.pricing_service = aws_pricing_service
    
    def estimate_resources(
        self,
        resources: List[TerraformPlanResource],
        target_region: str = None
    ) -> List[ResourceCostEstimate]:
        """
        Estimate costs for a list of Terraform resources.
        
        Args:
            resources: List of parsed Terraform resources
            target_region: Override region for all resources
            
        Returns:
            List of ResourceCostEstimate objects
        """
        estimates = []
        
        for resource in resources:
            estimate = self._estimate_resource(resource, target_region)
            if estimate:
                estimates.append(estimate)
        
        return estimates
    
    def _estimate_resource(
        self,
        resource: TerraformPlanResource,
        target_region: str = None
    ) -> Optional[ResourceCostEstimate]:
        """
        Estimate cost for a single resource.
        
        Args:
            resource: Terraform resource to estimate
            target_region: Override region
            
        Returns:
            ResourceCostEstimate or None if not supported
        """
        resource_type = resource.type
        
        # Route to appropriate estimator based on resource type
        estimators = {
            "aws_instance": self._estimate_ec2_instance,
            "aws_db_instance": self._estimate_rds_instance,
            "aws_ebs_volume": self._estimate_ebs_volume,
            "aws_lb": self._estimate_load_balancer,
            "aws_alb": self._estimate_load_balancer,
            "aws_elb": self._estimate_classic_lb,
            "aws_nat_gateway": self._estimate_nat_gateway,
            "aws_eip": self._estimate_eip,
        }
        
        estimator = estimators.get(resource_type)
        
        if estimator:
            try:
                return estimator(resource, target_region)
            except Exception as e:
                logger.error(f"Error estimating {resource.address}: {e}")
                return ResourceCostEstimate(
                    resource=resource.address,
                    resource_type=resource.type,
                    resource_name=resource.name,
                    price_per_month=0,
                    warnings=[f"Failed to estimate: {str(e)}"]
                )
        
        # Return None for unsupported resources
        logger.debug(f"Unsupported resource type: {resource_type}")
        return None
    
    def _estimate_ec2_instance(
        self,
        resource: TerraformPlanResource,
        target_region: str = None
    ) -> ResourceCostEstimate:
        """Estimate cost for an EC2 instance."""
        values = resource.values
        
        # Extract instance type
        instance_type = values.get("instance_type", "t3.micro")
        
        # Determine region from provider or values
        region = target_region or self._extract_region(values) or DEFAULT_REGION
        
        # Detect OS from AMI
        ami = values.get("ami", "")
        operating_system = self._detect_os_from_ami(ami)
        
        # Query AWS Pricing API
        pricing_request = EC2PricingRequest(
            instance_type=instance_type,
            region=region,
            operating_system=operating_system
        )
        
        pricing_response = self.pricing_service.get_ec2_price(pricing_request)
        
        if pricing_response:
            return ResourceCostEstimate(
                resource=resource.address,
                resource_type=resource.type,
                resource_name=resource.name,
                instance_type=instance_type,
                region=region,
                price_per_hour=pricing_response.price_per_hour,
                price_per_month=pricing_response.price_per_month,
                price_per_year=pricing_response.price_per_month * 12,
                currency="USD",
                pricing_details={
                    "operating_system": operating_system.value,
                    "on_demand": True
                }
            )
        
        # Return with warning if pricing not found
        return ResourceCostEstimate(
            resource=resource.address,
            resource_type=resource.type,
            resource_name=resource.name,
            instance_type=instance_type,
            region=region,
            price_per_month=0,
            warnings=[f"Pricing not found for {instance_type} in {region}"]
        )
    
    def _estimate_rds_instance(
        self,
        resource: TerraformPlanResource,
        target_region: str = None
    ) -> ResourceCostEstimate:
        """Estimate cost for an RDS instance."""
        values = resource.values
        
        instance_class = values.get("instance_class", "db.t3.micro")
        engine = values.get("engine", "mysql")
        multi_az = values.get("multi_az", False)
        region = target_region or self._extract_region(values) or DEFAULT_REGION
        
        # Map engine names
        engine_map = {
            "mysql": "MySQL",
            "postgres": "PostgreSQL",
            "mariadb": "MariaDB",
            "oracle-se": "Oracle",
            "oracle-se1": "Oracle",
            "oracle-se2": "Oracle",
            "oracle-ee": "Oracle",
            "sqlserver-se": "SQL Server",
            "sqlserver-ee": "SQL Server",
            "sqlserver-ex": "SQL Server",
            "sqlserver-web": "SQL Server",
        }
        
        engine_name = engine_map.get(engine.lower(), "MySQL")
        deployment = "Multi-AZ" if multi_az else "Single-AZ"
        
        pricing = self.pricing_service.get_rds_price(
            instance_type=instance_class,
            region=region,
            engine=engine_name,
            deployment=deployment
        )
        
        if pricing:
            return ResourceCostEstimate(
                resource=resource.address,
                resource_type=resource.type,
                resource_name=resource.name,
                instance_type=instance_class,
                region=region,
                price_per_hour=pricing["price_per_hour"],
                price_per_month=pricing["price_per_month"],
                price_per_year=pricing["price_per_month"] * 12,
                currency="USD",
                pricing_details={
                    "engine": engine_name,
                    "deployment": deployment
                }
            )
        
        return ResourceCostEstimate(
            resource=resource.address,
            resource_type=resource.type,
            resource_name=resource.name,
            instance_type=instance_class,
            region=region,
            price_per_month=0,
            warnings=[f"Pricing not found for {instance_class}"]
        )
    
    def _estimate_ebs_volume(
        self,
        resource: TerraformPlanResource,
        target_region: str = None
    ) -> ResourceCostEstimate:
        """Estimate cost for an EBS volume."""
        values = resource.values
        
        volume_type = values.get("type", "gp3")
        size = values.get("size", 8)  # Default 8 GB
        region = target_region or self._extract_region(values) or DEFAULT_REGION
        iops = values.get("iops")
        throughput = values.get("throughput")
        
        pricing = self.pricing_service.get_ebs_price(volume_type, region)
        
        if pricing:
            # Base storage cost
            monthly_cost = pricing["price_per_gb_month"] * size
            
            # Add IOPS cost for io1/io2
            if volume_type in ["io1", "io2"] and iops:
                # Approximate IOPS pricing
                iops_price_per_month = 0.065  # Varies by type and region
                monthly_cost += iops * iops_price_per_month
            
            # Add throughput cost for gp3
            if volume_type == "gp3" and throughput and throughput > 125:
                # Extra throughput beyond 125 MB/s
                extra_throughput = throughput - 125
                throughput_price = 0.04  # Per MB/s per month
                monthly_cost += extra_throughput * throughput_price
            
            return ResourceCostEstimate(
                resource=resource.address,
                resource_type=resource.type,
                resource_name=resource.name,
                region=region,
                price_per_month=round(monthly_cost, 2),
                price_per_year=round(monthly_cost * 12, 2),
                currency="USD",
                pricing_details={
                    "volume_type": volume_type,
                    "size_gb": size,
                    "iops": iops,
                    "throughput_mbps": throughput
                }
            )
        
        return ResourceCostEstimate(
            resource=resource.address,
            resource_type=resource.type,
            resource_name=resource.name,
            region=region,
            price_per_month=0,
            warnings=[f"Pricing not found for {volume_type}"]
        )
    
    def _estimate_load_balancer(
        self,
        resource: TerraformPlanResource,
        target_region: str = None
    ) -> ResourceCostEstimate:
        """Estimate cost for an ALB/NLB."""
        values = resource.values
        
        lb_type = values.get("load_balancer_type", "application")
        region = target_region or self._extract_region(values) or DEFAULT_REGION
        
        # ALB/NLB base hourly rates (approximate)
        hourly_rates = {
            "application": 0.0225,  # ALB
            "network": 0.0225,      # NLB
            "gateway": 0.0125       # GLB
        }
        
        hourly_rate = hourly_rates.get(lb_type, 0.0225)
        monthly_cost = hourly_rate * 730
        
        # Note: LCU costs are usage-based and can't be estimated from Terraform
        return ResourceCostEstimate(
            resource=resource.address,
            resource_type=resource.type,
            resource_name=resource.name,
            region=region,
            price_per_hour=hourly_rate,
            price_per_month=round(monthly_cost, 2),
            price_per_year=round(monthly_cost * 12, 2),
            currency="USD",
            pricing_details={
                "load_balancer_type": lb_type
            },
            warnings=["LCU costs not included - usage dependent"]
        )
    
    def _estimate_classic_lb(
        self,
        resource: TerraformPlanResource,
        target_region: str = None
    ) -> ResourceCostEstimate:
        """Estimate cost for a Classic ELB."""
        region = target_region or self._extract_region(resource.values) or DEFAULT_REGION
        
        # Classic ELB hourly rate (approximate)
        hourly_rate = 0.025
        monthly_cost = hourly_rate * 730
        
        return ResourceCostEstimate(
            resource=resource.address,
            resource_type=resource.type,
            resource_name=resource.name,
            region=region,
            price_per_hour=hourly_rate,
            price_per_month=round(monthly_cost, 2),
            price_per_year=round(monthly_cost * 12, 2),
            currency="USD",
            warnings=["Data processing costs not included"]
        )
    
    def _estimate_nat_gateway(
        self,
        resource: TerraformPlanResource,
        target_region: str = None
    ) -> ResourceCostEstimate:
        """Estimate cost for a NAT Gateway."""
        region = target_region or self._extract_region(resource.values) or DEFAULT_REGION
        
        pricing = self.pricing_service.get_nat_gateway_price(region)
        
        return ResourceCostEstimate(
            resource=resource.address,
            resource_type=resource.type,
            resource_name=resource.name,
            region=region,
            price_per_hour=pricing["hourly"],
            price_per_month=pricing["monthly_base"],
            price_per_year=pricing["monthly_base"] * 12,
            currency="USD",
            pricing_details={
                "data_processing_per_gb": pricing["per_gb"]
            },
            warnings=["Data processing costs not included - usage dependent"]
        )
    
    def _estimate_eip(
        self,
        resource: TerraformPlanResource,
        target_region: str = None
    ) -> ResourceCostEstimate:
        """Estimate cost for an Elastic IP."""
        region = target_region or self._extract_region(resource.values) or DEFAULT_REGION
        
        # EIPs are free when attached to running instances
        # Charge $0.005/hour when not attached (as of recent pricing)
        hourly_rate = 0.005
        monthly_cost = hourly_rate * 730
        
        return ResourceCostEstimate(
            resource=resource.address,
            resource_type=resource.type,
            resource_name=resource.name,
            region=region,
            price_per_hour=hourly_rate,
            price_per_month=round(monthly_cost, 2),
            currency="USD",
            warnings=["Free when attached to running instance"]
        )
    
    def _extract_region(self, values: Dict[str, Any]) -> Optional[str]:
        """Extract region from resource values."""
        # Check for explicit region
        if "region" in values:
            return values["region"]
        
        # Check for availability_zone and extract region
        az = values.get("availability_zone", "")
        if az:
            # e.g., us-east-1a -> us-east-1
            match = re.match(r'^([a-z]{2}-[a-z]+-\d+)', az)
            if match:
                return match.group(1)
        
        return None
    
    def _detect_os_from_ami(self, ami: str) -> OperatingSystem:
        """Detect operating system from AMI ID or name."""
        ami_lower = ami.lower()
        
        for pattern, os_type in AMI_OS_PATTERNS.items():
            if pattern in ami_lower:
                return os_type
        
        # Default to Linux
        return OperatingSystem.LINUX


# Singleton instance
resource_mapper = ResourceMapper()