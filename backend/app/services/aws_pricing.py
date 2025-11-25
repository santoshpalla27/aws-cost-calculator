"""AWS Pricing API service for fetching live pricing data."""

import boto3
from botocore.exceptions import ClientError, BotoCoreError
from typing import Optional, List, Dict, Any
import json
import logging

from app.config import get_settings
from app.models.pricing import (
    InstanceTypeInfo, EC2PricingRequest, EC2PricingResponse,
    OperatingSystem, Tenancy, AWSService
)
from app.services.cache import cached, pricing_cache, instance_types_cache

settings = get_settings()
logger = logging.getLogger(__name__)


# AWS Region name mapping (for Pricing API location filter)
REGION_NAME_MAP = {
    "us-east-1": "US East (N. Virginia)",
    "us-east-2": "US East (Ohio)",
    "us-west-1": "US West (N. California)",
    "us-west-2": "US West (Oregon)",
    "af-south-1": "Africa (Cape Town)",
    "ap-east-1": "Asia Pacific (Hong Kong)",
    "ap-south-1": "Asia Pacific (Mumbai)",
    "ap-south-2": "Asia Pacific (Hyderabad)",
    "ap-southeast-1": "Asia Pacific (Singapore)",
    "ap-southeast-2": "Asia Pacific (Sydney)",
    "ap-southeast-3": "Asia Pacific (Jakarta)",
    "ap-southeast-4": "Asia Pacific (Melbourne)",
    "ap-northeast-1": "Asia Pacific (Tokyo)",
    "ap-northeast-2": "Asia Pacific (Seoul)",
    "ap-northeast-3": "Asia Pacific (Osaka)",
    "ca-central-1": "Canada (Central)",
    "eu-central-1": "EU (Frankfurt)",
    "eu-central-2": "EU (Zurich)",
    "eu-west-1": "EU (Ireland)",
    "eu-west-2": "EU (London)",
    "eu-west-3": "EU (Paris)",
    "eu-south-1": "EU (Milan)",
    "eu-south-2": "EU (Spain)",
    "eu-north-1": "EU (Stockholm)",
    "me-south-1": "Middle East (Bahrain)",
    "me-central-1": "Middle East (UAE)",
    "sa-east-1": "South America (Sao Paulo)",
}


class AWSPricingService:
    """Service for interacting with AWS Pricing API."""
    
    def __init__(self):
        """Initialize the AWS Pricing client."""
        # Pricing API is only available in us-east-1 and ap-south-1
        self.client = boto3.client(
            'pricing',
            region_name=settings.aws_pricing_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key
        )
        self.ec2_client = boto3.client(
            'ec2',
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key
        )
    
    def _get_region_name(self, region_code: str) -> str:
        """Convert region code to full region name for Pricing API."""
        return REGION_NAME_MAP.get(region_code, region_code)
    
    def _parse_price_from_product(self, product_json: str) -> Optional[float]:
        """Extract on-demand hourly price from product JSON."""
        try:
            product = json.loads(product_json)
            terms = product.get("terms", {}).get("OnDemand", {})
            
            for term_key, term_value in terms.items():
                price_dimensions = term_value.get("priceDimensions", {})
                for dim_key, dim_value in price_dimensions.items():
                    price_per_unit = dim_value.get("pricePerUnit", {})
                    usd_price = price_per_unit.get("USD")
                    if usd_price:
                        return float(usd_price)
            return None
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.error(f"Error parsing product price: {e}")
            return None
    
    @cached(pricing_cache)
    def get_ec2_price(self, request: EC2PricingRequest) -> Optional[EC2PricingResponse]:
        """
        Get EC2 on-demand pricing for a specific instance type and region.
        
        Args:
            request: EC2 pricing request parameters
            
        Returns:
            EC2PricingResponse with pricing details or None if not found
        """
        region_name = self._get_region_name(request.region)
        
        # Build filters for the Pricing API
        filters = [
            {"Type": "TERM_MATCH", "Field": "ServiceCode", "Value": "AmazonEC2"},
            {"Type": "TERM_MATCH", "Field": "instanceType", "Value": request.instance_type},
            {"Type": "TERM_MATCH", "Field": "location", "Value": region_name},
            {"Type": "TERM_MATCH", "Field": "operatingSystem", "Value": request.operating_system.value},
            {"Type": "TERM_MATCH", "Field": "tenancy", "Value": request.tenancy.value},
            {"Type": "TERM_MATCH", "Field": "preInstalledSw", "Value": request.pre_installed_sw},
            {"Type": "TERM_MATCH", "Field": "capacitystatus", "Value": "Used"},
        ]
        
        try:
            response = self.client.get_products(
                ServiceCode="AmazonEC2",
                Filters=filters,
                MaxResults=10
            )
            
            price_list = response.get("PriceList", [])
            
            if not price_list:
                logger.warning(
                    f"No pricing found for {request.instance_type} in {request.region}"
                )
                return None
            
            # Parse the first matching product
            hourly_price = self._parse_price_from_product(price_list[0])
            
            if hourly_price is None:
                return None
            
            # Calculate monthly cost (730 hours)
            monthly_price = hourly_price * 730
            
            return EC2PricingResponse(
                instance_type=request.instance_type,
                region=request.region,
                operating_system=request.operating_system.value,
                price_per_hour=round(hourly_price, 6),
                price_per_month=round(monthly_price, 2),
                currency="USD",
                on_demand=True,
                details={
                    "tenancy": request.tenancy.value,
                    "pre_installed_sw": request.pre_installed_sw,
                    "region_name": region_name
                }
            )
            
        except ClientError as e:
            logger.error(f"AWS API error getting EC2 price: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting EC2 price: {e}")
            raise
    
    @cached(instance_types_cache)
    def get_ec2_instance_types(self, region: str = None) -> List[InstanceTypeInfo]:
        """
        Get all available EC2 instance types.
        
        Args:
            region: Optional region to filter by
            
        Returns:
            List of InstanceTypeInfo objects
        """
        instance_types = []
        
        try:
            # Use EC2 describe_instance_types for comprehensive list
            paginator = self.ec2_client.get_paginator('describe_instance_types')
            
            for page in paginator.paginate():
                for instance_type in page.get('InstanceTypes', []):
                    info = InstanceTypeInfo(
                        instance_type=instance_type['InstanceType'],
                        vcpu=instance_type.get('VCpuInfo', {}).get('DefaultVCpus'),
                        memory_gib=instance_type.get('MemoryInfo', {}).get('SizeInMiB', 0) / 1024,
                        network_performance=instance_type.get('NetworkInfo', {}).get('NetworkPerformance'),
                        storage=self._format_storage_info(instance_type.get('InstanceStorageInfo'))
                    )
                    instance_types.append(info)
            
            # Sort by instance type name
            instance_types.sort(key=lambda x: x.instance_type)
            
            return instance_types
            
        except ClientError as e:
            logger.error(f"AWS API error getting instance types: {e}")
            # Return a fallback list of common instance types
            return self._get_fallback_instance_types()
        except Exception as e:
            logger.error(f"Unexpected error getting instance types: {e}")
            return self._get_fallback_instance_types()
    
    def _format_storage_info(self, storage_info: Optional[Dict]) -> Optional[str]:
        """Format instance storage information."""
        if not storage_info:
            return "EBS only"
        
        total_size = storage_info.get('TotalSizeInGB', 0)
        disks = storage_info.get('Disks', [])
        
        if disks:
            disk_info = disks[0]
            disk_type = disk_info.get('Type', 'Unknown')
            return f"{total_size} GB {disk_type}"
        
        return f"{total_size} GB"
    
    def _get_fallback_instance_types(self) -> List[InstanceTypeInfo]:
        """Return a fallback list of common instance types."""
        common_types = [
            "t3.nano", "t3.micro", "t3.small", "t3.medium", "t3.large", "t3.xlarge", "t3.2xlarge",
            "t3a.nano", "t3a.micro", "t3a.small", "t3a.medium", "t3a.large", "t3a.xlarge",
            "m5.large", "m5.xlarge", "m5.2xlarge", "m5.4xlarge", "m5.8xlarge",
            "m6i.large", "m6i.xlarge", "m6i.2xlarge", "m6i.4xlarge",
            "c5.large", "c5.xlarge", "c5.2xlarge", "c5.4xlarge",
            "c6i.large", "c6i.xlarge", "c6i.2xlarge", "c6i.4xlarge",
            "r5.large", "r5.xlarge", "r5.2xlarge", "r5.4xlarge",
            "r6i.large", "r6i.xlarge", "r6i.2xlarge", "r6i.4xlarge",
        ]
        return [InstanceTypeInfo(instance_type=t) for t in common_types]
    
    @cached(pricing_cache)
    def get_ebs_price(self, volume_type: str, region: str) -> Optional[Dict[str, float]]:
        """
        Get EBS pricing for a specific volume type and region.
        
        Args:
            volume_type: EBS volume type (gp2, gp3, io1, io2, st1, sc1)
            region: AWS region code
            
        Returns:
            Dictionary with pricing details
        """
        region_name = self._get_region_name(region)
        
        # Map volume types to product families
        volume_family_map = {
            "gp2": "General Purpose",
            "gp3": "General Purpose",
            "io1": "Provisioned IOPS",
            "io2": "Provisioned IOPS",
            "st1": "Throughput Optimized HDD",
            "sc1": "Cold HDD",
            "standard": "Magnetic"
        }
        
        product_family = volume_family_map.get(volume_type, "General Purpose")
        
        filters = [
            {"Type": "TERM_MATCH", "Field": "ServiceCode", "Value": "AmazonEC2"},
            {"Type": "TERM_MATCH", "Field": "productFamily", "Value": "Storage"},
            {"Type": "TERM_MATCH", "Field": "volumeApiName", "Value": volume_type},
            {"Type": "TERM_MATCH", "Field": "location", "Value": region_name},
        ]
        
        try:
            response = self.client.get_products(
                ServiceCode="AmazonEC2",
                Filters=filters,
                MaxResults=10
            )
            
            price_list = response.get("PriceList", [])
            
            if not price_list:
                logger.warning(f"No EBS pricing found for {volume_type} in {region}")
                return None
            
            gb_month_price = self._parse_price_from_product(price_list[0])
            
            return {
                "volume_type": volume_type,
                "region": region,
                "price_per_gb_month": gb_month_price,
                "currency": "USD"
            }
            
        except ClientError as e:
            logger.error(f"AWS API error getting EBS price: {e}")
            raise
    
    @cached(pricing_cache)
    def get_rds_price(
        self,
        instance_type: str,
        region: str,
        engine: str = "MySQL",
        deployment: str = "Single-AZ"
    ) -> Optional[Dict[str, Any]]:
        """
        Get RDS pricing for a specific configuration.
        
        Args:
            instance_type: RDS instance type (e.g., db.t3.micro)
            region: AWS region code
            engine: Database engine (MySQL, PostgreSQL, etc.)
            deployment: Deployment option (Single-AZ, Multi-AZ)
            
        Returns:
            Dictionary with pricing details
        """
        region_name = self._get_region_name(region)
        
        filters = [
            {"Type": "TERM_MATCH", "Field": "ServiceCode", "Value": "AmazonRDS"},
            {"Type": "TERM_MATCH", "Field": "instanceType", "Value": instance_type},
            {"Type": "TERM_MATCH", "Field": "location", "Value": region_name},
            {"Type": "TERM_MATCH", "Field": "databaseEngine", "Value": engine},
            {"Type": "TERM_MATCH", "Field": "deploymentOption", "Value": deployment},
        ]
        
        try:
            response = self.client.get_products(
                ServiceCode="AmazonRDS",
                Filters=filters,
                MaxResults=10
            )
            
            price_list = response.get("PriceList", [])
            
            if not price_list:
                return None
            
            hourly_price = self._parse_price_from_product(price_list[0])
            
            if hourly_price is None:
                return None
            
            return {
                "instance_type": instance_type,
                "region": region,
                "engine": engine,
                "deployment": deployment,
                "price_per_hour": round(hourly_price, 6),
                "price_per_month": round(hourly_price * 730, 2),
                "currency": "USD"
            }
            
        except ClientError as e:
            logger.error(f"AWS API error getting RDS price: {e}")
            raise
    
    def get_nat_gateway_price(self, region: str) -> Optional[Dict[str, float]]:
        """Get NAT Gateway pricing for a region."""
        region_name = self._get_region_name(region)
        
        filters = [
            {"Type": "TERM_MATCH", "Field": "ServiceCode", "Value": "AmazonEC2"},
            {"Type": "TERM_MATCH", "Field": "productFamily", "Value": "NAT Gateway"},
            {"Type": "TERM_MATCH", "Field": "location", "Value": region_name},
        ]
        
        try:
            response = self.client.get_products(
                ServiceCode="AmazonEC2",
                Filters=filters,
                MaxResults=10
            )
            
            price_list = response.get("PriceList", [])
            
            if not price_list:
                # Return default pricing
                return {
                    "hourly": 0.045,
                    "per_gb": 0.045,
                    "monthly_base": 32.85,
                    "currency": "USD"
                }
            
            hourly_price = self._parse_price_from_product(price_list[0])
            
            return {
                "hourly": hourly_price or 0.045,
                "per_gb": 0.045,  # Data processing cost
                "monthly_base": (hourly_price or 0.045) * 730,
                "currency": "USD"
            }
            
        except ClientError as e:
            logger.error(f"AWS API error getting NAT Gateway price: {e}")
            return {"hourly": 0.045, "per_gb": 0.045, "monthly_base": 32.85, "currency": "USD"}


# Singleton instance
aws_pricing_service = AWSPricingService()