# InfraCost Analyzer Pro - API Documentation

## Overview

The InfraCost Analyzer Pro API provides endpoints for cost estimation, pricing calculations, and report management. All API requests are made to the base URL: `http://localhost:3000/api` (in development) or your production URL.

Authentication is required for all API endpoints using JWT tokens.

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Terraform Cost Estimation

#### POST /api/terraform/estimate

Estimate costs for Terraform configurations.

**Request Body:**
```json
{
  "source": "files",
  "terraformFiles": {
    "main.tf": "resource \"aws_instance\" \"web\" {\n  ami           = \"ami-0c55b159cbfafe1d0\"\n  instance_type = \"t3.micro\"\n}"
  }
}
```

**Response:**
```json
{
  "totalMonthlyCost": 1250.75,
  "totalHourlyCost": 1.71,
  "resources": [...],
  "services": [...],
  "breakdown": {...}
}
```

#### POST /api/terraform/diff

Calculate cost differences between two Terraform configurations.

### AWS Pricing Calculators

#### POST /api/aws/ec2

Calculate EC2 costs.

**Request Body:**
```json
{
  "instanceType": "t3.micro",
  "region": "us-east-1",
  "os": "linux",
  "purchaseOption": "on-demand",
  "quantity": 1,
  "hoursPerMonth": 730
}
```

**Response:**
```json
{
  "monthlyCost": 8.49,
  "hourlyCost": 0.0116,
  "breakdown": {
    "instanceCost": 8.49,
    "ebsCost": 0,
    "dataTransferCost": 0
  }
}
```

#### POST /api/aws/rds

Calculate RDS costs.

#### POST /api/aws/s3

Calculate S3 costs.

#### POST /api/aws/eks

Calculate EKS costs.

### Reports

#### GET /api/reports

Get cost reports.

**Query Parameters:**
- limit (default: 10)
- offset (default: 0)

#### GET /api/reports/{id}

Get a specific cost report.

#### GET /api/reports/export/{id}?format=pdf|csv

Export a cost report in PDF or CSV format.