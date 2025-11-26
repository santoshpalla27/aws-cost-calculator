from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class CostParser:
    """Parse Infracost output into structured format"""
    
    def parse_infracost_output(self, infracost_result: Dict[str, Any]) -&gt; Dict[str, Any]:
        """Parse Infracost breakdown output"""
        try:
            projects = infracost_result.get('projects', [])
            if not projects:
                raise ValueError("No projects found in Infracost output")
            
            total_monthly_cost = 0.0
            total_hourly_cost = 0.0
            all_resources = []
            resource_counts = {}
            cost_by_service = {}
            
            for project in projects:
                breakdown = project.get('breakdown', {})
                resources = breakdown.get('resources', [])
                
                for resource in resources:
                    resource_name = resource.get('name', 'unknown')
                    resource_type = resource.get('resourceType', 'unknown')
                    monthly_cost = float(resource.get('monthlyCost', 0) or 0)
                    hourly_cost = float(resource.get('hourlyCost', 0) or 0)
                    
                    cost_components = []
                    for component in resource.get('costComponents', []):
                        cost_components.append({
                            'name': component.get('name'),
                            'unit': component.get('unit'),
                            'monthlyCost': float(component.get('monthlyCost', 0) or 0),
                            'price': float(component.get('price', 0) or 0)
                        })
                    
                    all_resources.append({
                        'name': resource_name,
                        'type': resource_type,
                        'monthlyCost': monthly_cost,
                        'hourlyCost': hourly_cost,
                        'costComponents': cost_components
                    })
                    
                    total_monthly_cost += monthly_cost
                    total_hourly_cost += hourly_cost
                    
                    # Count by type
                    resource_counts[resource_type] = resource_counts.get(resource_type, 0) + 1
                    
                    # Sum by service
                    service = self._extract_service_name(resource_type)
                    cost_by_service[service] = cost_by_service.get(service, 0.0) + monthly_cost
            
            return {
                'totalMonthlyCost': round(total_monthly_cost, 2),
                'totalHourlyCost': round(total_hourly_cost, 4),
                'currency': 'USD',
                'resources': all_resources,
                'summary': {
                    'totalResources': len(all_resources),
                    'resourcesByType': resource_counts,
                    'costByService': cost_by_service
                },
                'breakdown': infracost_result
            }
            
        except Exception as e:
            logger.error(f"Error parsing Infracost output: {str(e)}")
            raise
    
    def parse_infracost_diff(self, diff_result: Dict[str, Any]) -&gt; Dict[str, Any]:
        """Parse Infracost diff output"""
        try:
            projects = diff_result.get('projects', [])
            if not projects:
                raise ValueError("No projects found in Infracost diff output")
            
            baseline_cost = 0.0
            compare_cost = 0.0
            resource_changes = []
            
            for project in projects:
                diff = project.get('diff', {})
                resources = diff.get('resources', [])
                
                for resource in resources:
                    name = resource.get('name')
                    resource_type = resource.get('resourceType')
                    
                    baseline = float(resource.get('pastMonthlyCost', 0) or 0)
                    compare = float(resource.get('monthlyCost', 0) or 0)
                    
                    baseline_cost += baseline
                    compare_cost += compare
                    
                    change_type = 'modified'
                    if baseline == 0:
                        change_type = 'added'
                    elif compare == 0:
                        change_type = 'removed'
                    
                    resource_changes.append({
                        'name': name,
                        'type': resource_type,
                        'changeType': change_type,
                        'baselineCost': baseline,
                        'compareCost': compare,
                        'costDiff': compare - baseline
                    })
            
            total_diff = compare_cost - baseline_cost
            percentage_change = (total_diff / baseline_cost * 100) if baseline_cost &gt; 0 else 0
            
            return {
                'baselineCost': round(baseline_cost, 2),
                'compareCost': round(compare_cost, 2),
                'totalMonthlyCostDiff': round(total_diff, 2),
                'percentageChange': round(percentage_change, 2),
                'resourceChanges': resource_changes
            }
            
        except Exception as e:
            logger.error(f"Error parsing Infracost diff: {str(e)}")
            raise
    
    def _extract_service_name(self, resource_type: str) -&gt; str:
        """Extract AWS service name from resource type"""
        # e.g., aws_instance -&gt; EC2, aws_db_instance -&gt; RDS
        service_map = {
            'aws_instance': 'EC2',
            'aws_db_instance': 'RDS',
            'aws_s3_bucket': 'S3',
            'aws_eks_cluster': 'EKS',
            'aws_lambda_function': 'Lambda',
            'aws_dynamodb_table': 'DynamoDB',
            'aws_elb': 'ELB',
            'aws_lb': 'ALB/NLB',
            'aws_nat_gateway': 'VPC',
            'aws_vpc': 'VPC'
        }
        
        for key, value in service_map.items():
            if resource_type.startswith(key):
                return value
        
        return 'Other'