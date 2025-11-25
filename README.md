# AWS Cost Estimator

A self-hosted tool to estimate AWS infrastructure costs from Terraform code without relying on external APIs like Infracost.

## Features

- 📊 **Terraform Scanning**: Upload Terraform zip files to get instant cost estimates
- 💰 **Live AWS Pricing**: Direct integration with AWS Pricing API
- 🖥️ **Interactive Calculator**: Check prices for individual resources
- 🎨 **Developer-Friendly UI**: Dark theme inspired by modern IDEs

## Supported Resources

- EC2 Instances
- RDS Databases
- EBS Volumes
- Load Balancers (ALB, NLB, CLB)
- NAT Gateways
- Elastic IPs

## Quick Start

### Prerequisites

- Docker and Docker Compose
- AWS credentials with Pricing API access

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/aws-cost-estimator.git
cd aws-cost-estimator
```
2. Create environment file:
```bash
cp .env.example .env
```
3. Edit `.env` with your AWS credentials:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```
4. Start the application:
```bash
docker-compose up -d
```
5. Access the UI at `http://localhost`

### Development Mode
For development with hot-reload:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### AWS IAM Permissions
The application requires the following IAM permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "pricing:GetProducts",
                "pricing:DescribeServices",
                "pricing:GetAttributeValues"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstanceTypes"
            ],
            "Resource": "*"
        }
    ]
}
```

### API Documentation
Once running, access the API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Architecture
```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │    Backend      │
│   (React)       │────▶│   (FastAPI)     │
│   Port: 80      │     │   Port: 8000    │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
               ┌────▼────┐           ┌────────▼────────┐
               │Terraform│           │ AWS Pricing API │
               │ Binary  │           │   (us-east-1)   │
               └─────────┘           └─────────────────┘
```

## License
MIT
