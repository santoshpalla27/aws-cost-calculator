import json
from typing import Dict, Any, List
from decimal import Decimal

class CostParser:
    def __init__(self):
        pass

    def parse_cost_output(self, infracost_output: dict) -> dict:
        """
        Parse the infracost output and return structured cost data
        """
        try:
            # Extract resources from infracost output
            resources = []
            total_monthly_cost = Decimal('0')
            total_hourly_cost = Decimal('0')
            
            # Process the breakdown section of the infracost output
            breakdown = infracost_output.get('projects', [])
            
            for project in breakdown:
                project_resources = project.get('breakdown', {}).get('resources', [])
                
                for resource in project_resources:
                    resource_name = resource.get('name', 'unknown')
                    resource_type = resource.get('metadata', {}).get('resourceType', 'unknown')
                    
                    # Calculate costs
                    monthly_cost = Decimal(str(resource.get('monthlyCost', '0') or '0'))
                    hourly_cost = monthly_cost / Decimal('730')  # 730 hours in a month
                    
                    # Add resource to list
                    resources.append({
                        'name': resource_name,
                        'type': resource_type,
                        'monthlyCost': float(monthly_cost),
                        'hourlyCost': float(hourly_cost),
                        'details': resource
                    })
                    
                    total_monthly_cost += monthly_cost
                    total_hourly_cost += hourly_cost
            
            # Group resources by service
            services = self._group_resources_by_service(resources)
            
            return {
                'totalMonthlyCost': float(total_monthly_cost),
                'totalHourlyCost': float(total_hourly_cost),
                'resources': resources,
                'services': services,
                'breakdown': infracost_output
            }
            
        except Exception as e:
            raise Exception(f"Error parsing cost output: {str(e)}")

    def _group_resources_by_service(self, resources: List[dict]) -> List[dict]:
        """
        Group resources by service type (e.g., EC2, RDS, S3)
        """
        service_mapping = {
            'aws_instance': 'EC2',
            'aws_db_instance': 'RDS',
            'aws_s3_bucket': 'S3',
            'aws_eks_cluster': 'EKS',
            'aws_lb': 'ELB',
            'aws_nat_gateway': 'NAT Gateway',
            'aws_elasticache_cluster': 'ElastiCache',
            'aws_lambda_function': 'Lambda',
            'aws_api_gateway_rest_api': 'API Gateway',
            'aws_cloudwatch_log_group': 'CloudWatch',
            'aws_dynamodb_table': 'DynamoDB',
        }
        
        services_map = {}
        
        for resource in resources:
            resource_type = resource['type']
            service_name = 'Other'
            
            # Determine service name based on resource type
            for resource_pattern, service in service_mapping.items():
                if resource_type.startswith(resource_pattern):
                    service_name = service
                    break
            
            # Initialize service in map if not present
            if service_name not in services_map:
                services_map[service_name] = {
                    'name': service_name,
                    'monthlyCost': 0,
                    'resources': []
                }
            
            # Add resource to service
            services_map[service_name]['resources'].append(resource)
            services_map[service_name]['monthlyCost'] += resource['monthlyCost']
        
        return list(services_map.values())

    def parse_cost_diff(self, infracost_diff_output: dict) -> dict:
        """
        Parse the infracost diff output and return cost difference data
        """
        try:
            # Extract the diff information
            diff_breakdown = infracost_diff_output.get('diff', {})
            
            # Calculate cost differences
            added_cost = 0
            deleted_cost = 0
            modified_cost = 0
            total_diff = 0
            
            # Process resources in the diff
            projects = infracost_diff_output.get('projects', [])
            for project in projects:
                diff_resources = project.get('diff', {}).get('resources', [])
                
                for resource in diff_resources:
                    # Extract cost changes for this resource
                    hourly_cost_diff = float(resource.get('hourlyCost', 0) or 0)
                    monthly_cost_diff = float(resource.get('monthlyCost', 0) or 0)
                    
                    # Classify the change type
                    if monthly_cost_diff > 0:
                        added_cost += monthly_cost_diff
                    elif monthly_cost_diff < 0:
                        deleted_cost += abs(monthly_cost_diff)
                    else:
                        modified_cost += abs(monthly_cost_diff)
                    
                    total_diff += monthly_cost_diff
            
            return {
                'addedCost': added_cost,
                'deletedCost': deleted_cost,
                'modifiedCost': modified_cost,
                'totalDiff': total_diff,
                'breakdown': infracost_diff_output
            }
            
        except Exception as e:
            raise Exception(f"Error parsing cost diff output: {str(e)}")