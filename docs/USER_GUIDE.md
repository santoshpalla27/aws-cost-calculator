# InfraCost Analyzer Pro - User Guide

## Getting Started

Welcome to InfraCost Analyzer Pro! This guide will help you navigate the application and make the most of its features.

## Authentication

### Registering an Account

1. Navigate to the login page
2. Click on "Register" 
3. Enter your email and password (minimum 8 characters)
4. Your account will be created with the default "user" role
5. For admin access, contact your system administrator

### Logging In

1. Go to the login page
2. Enter your email and password
3. Click "Sign In"
4. You will be redirected to the dashboard

## Terraform Cost Estimation

### Estimating from Terraform Files

1. Go to the "Terraform Estimator" section
2. Choose "Upload Files" as the source
3. Upload your Terraform files (`.tf` files)
4. Click "Estimate Costs"
5. The results will show:
   - Total monthly and hourly costs
   - Costs per resource
   - Costs per service
   - Detailed breakdown

### Estimating from Git Repository

1. In the "Terraform Estimator" section
2. Choose "Git Repository" as the source
3. Enter the Git repository URL
4. Specify the branch (defaults to "main")
5. Click "Estimate Costs"

### Estimating from Plan JSON

1. In the "Terraform Estimator" section
2. Choose "Plan JSON" as the source
3. Paste your Terraform plan JSON
4. Click "Estimate Costs"

## AWS Pricing Calculators

### EC2 Calculator

1. Navigate to "Calculators" → "EC2"
2. Select the instance type (e.g., t3.micro, m5.large)
3. Choose the region
4. Select the operating system
5. Choose the purchase option (On-Demand, Reserved, Spot)
6. Enter the quantity and hours per month
7. Click "Calculate Cost"

### RDS Calculator

1. Navigate to "Calculators" → "RDS"
2. Select the database engine (MySQL, PostgreSQL, etc.)
3. Choose the instance class
4. Select the region
5. Choose the storage type and size
6. Select Multi-AZ if needed
7. Enter backup storage requirements
8. Click "Calculate Cost"

### S3 Calculator

1. Navigate to "Calculators" → "S3"
2. Select the storage class
3. Enter storage size in GB
4. Enter monthly requests
5. Enter monthly data transfer
6. Select the region
7. Click "Calculate Cost"

### EKS Calculator

1. Navigate to "Calculators" → "EKS"
2. Select the region
3. Add node groups by specifying:
   - Instance type
   - Node count
   - Hours per month
4. Click "Calculate Cost"

## Reports and History

### Viewing Reports

1. Go to the "Reports" section
2. Browse through your cost reports
3. Click on a report to view details
4. Use pagination to navigate through reports

### Exporting Reports

1. In the "Reports" section
2. Click on a report to view its details
3. Use the "Export" button to download as PDF or CSV
4. Choose your preferred format

### Cost Trends

1. In the dashboard, view cost trend graphs
2. Filter by date range
3. Compare different periods

## Dashboard

The dashboard provides an overview of:

- Total monthly costs
- Top expensive resources
- Cost trends over time
- Quick access to calculators

## Best Practices

### Cost Optimization

1. Regularly review your resource usage
2. Use reserved instances for predictable workloads
3. Implement automated resource scheduling
4. Monitor and optimize storage usage
5. Use appropriate instance types for your workload

### Terraform Estimation

1. Include all necessary files for accurate estimation
2. Use variables and modules for better structure
3. Regularly update your Terraform configurations
4. Review estimation results for anomalies

## Troubleshooting

### Common Issues

**Terraform Estimation Fails**: 
- Ensure all required files are uploaded
- Check for syntax errors in your Terraform files

**AWS Pricing API Errors**:
- Verify your AWS credentials are correct
- Ensure the regions are supported

**Slow Performance**:
- Large Terraform configurations may take longer to process
- Complex calculations may require more time

### Support

For technical support:
- Check the API documentation
- Contact your system administrator
- Submit an issue in the GitHub repository

## FAQ

**Q: How often is pricing data updated?**
A: AWS pricing data is refreshed regularly and cached for optimal performance.

**Q: Can I integrate this with my CI/CD pipeline?**
A: Yes, the API endpoints can be used for programmatic access.

**Q: Is my data secure?**
A: All data is encrypted in transit and at rest. Access is protected by authentication.