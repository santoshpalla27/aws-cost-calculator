# OpenCost - AWS Cost Estimator

OpenCost is a comprehensive AWS cost estimation tool that integrates with the AWS Pricing API to provide real-time cost estimates for Terraform infrastructure. The application processes Terraform plan files and provides detailed cost breakdowns for various AWS resources.

## Features

- **Real-time AWS Pricing Integration**: Connects directly to AWS Pricing API for live pricing data
- **Terraform Plan Processing**: Accepts both JSON plan files and .tf configuration files
- **Cost Comparison**: Supports side-by-side cost comparison between different plans
- **Comprehensive Resource Support**: EC2, RDS, S3, Lambda, DynamoDB, Load Balancers, EKS, ElastiCache, CloudFront, Route53
- **Caching & Retry Logic**: In-memory caching and exponential backoff for improved performance
- **SSE Logging**: Server-sent events for real-time processing feedback

## Architecture

The application consists of two main components:

### Backend
- Node.js/Express server that connects to AWS Pricing API
- Handles Terraform plan generation and processing
- Implements caching and retry logic for robust pricing API calls
- Exposes API endpoints for pricing and plan processing

### Frontend
- React application with cost visualization
- Supports single plan analysis and plan comparison views
- Interactive charts for cost distribution
- Real-time log display for Terraform operations

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- AWS credentials with pricing API access

## Setup

1. Clone the repository
2. Create a `.env` file based on `.env.example` and provide your AWS credentials:

```bash
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
```

3. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Running with Docker

To run the entire application using Docker Compose:

```bash
docker-compose up --build
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3001`.

## Running Locally

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Usage

1. Upload a Terraform plan JSON file or a folder containing Terraform configuration files
2. The application will process the files and fetch real-time pricing from AWS
3. View the cost breakdown and resource details
4. For comparison, upload two different plans to see cost differences

## Supported Resources

- EC2 Instances (compute and storage)
- RDS Databases (instances and storage)
- S3 Buckets (various storage classes)
- Lambda Functions (requests and compute)
- DynamoDB Tables (provisioned and on-demand)
- Load Balancers (ALB, NLB, GWB)
- NAT Gateways
- EKS Clusters
- ElastiCache Clusters
- CloudFront Distributions
- Route53 Hosted Zones

## API Endpoints

- `POST /api/pricing` - Fetch pricing from AWS Pricing API
- `POST /api/generate-plan` - Generate Terraform plan from configuration files
- `GET /api/jobs/:jobId/stream` - Stream processing logs via SSE
- `GET /health` - Health check with AWS connection test

## Configuration

The application uses environment variables for AWS credentials and configuration. Make sure to set up your `.env` file with proper AWS credentials that have access to the Pricing API.

## Security

- Store AWS credentials securely, never commit them to version control
- The application implements caching to reduce API calls
- All pricing data is fetched on-demand from AWS

## Troubleshooting

- Ensure your AWS credentials have access to the AWS Pricing API
- Check that Terraform CLI is properly installed when running locally
- Review the backend logs for any API access issues