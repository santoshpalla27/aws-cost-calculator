# InfraCost Analyzer Pro - Setup Guide

## Prerequisites

- Docker and Docker Compose
- Node.js (v18 or higher)
- npm or yarn
- Python 3.11 (for Terraform Cost Engine)
- AWS account (for pricing data)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd infracost-analyzer-pro
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file to configure:

- JWT secret key
- AWS credentials (for pricing service)
- Database credentials
- Infracost API key (optional)

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

The application will be available at `http://localhost:80`.

## Manual Setup (Alternative)

### 1. Backend Services

For each service in the `services/` directory, install dependencies and start:

```bash
# API Gateway
cd services/api-gateway
npm install
npm run dev

# Auth Service
cd services/auth-service
npm install
npm run dev

# Terraform Cost Engine
cd services/terraform-cost-engine
pip install -r requirements.txt
uvicorn app.main:app --reload

# AWS Pricing Service
cd services/aws-pricing-service
npm install
npm run dev

# Reports Service
cd services/reports-service
npm install
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Database

The application uses PostgreSQL. Make sure you have a PostgreSQL instance running and update the connection string in the environment variables.

## Configuration

### Environment Variables

- `JWT_SECRET`: Secret key for JWT tokens (change in production!)
- `AWS_ACCESS_KEY_ID`: AWS access key for pricing API
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_REGION`: AWS region for pricing API
- `INFRACOST_API_KEY`: Infracost API key (optional)
- `POSTGRES_HOST`: PostgreSQL host
- `POSTGRES_PORT`: PostgreSQL port
- `POSTGRES_USER`: PostgreSQL username
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_DB`: PostgreSQL database name

## Database Setup

The application uses PostgreSQL. The database schema will be automatically created on first run, but you can also manually apply the migration scripts in `database/migrations/`.

## Services Overview

The application consists of the following microservices:

1. **API Gateway**: Entry point for all API requests
2. **Auth Service**: User authentication and authorization
3. **Terraform Cost Engine**: Processes Terraform configurations and estimates costs
4. **AWS Pricing Service**: Provides real-time AWS pricing calculations
5. **Reports Service**: Manages cost reports and exports
6. **Frontend**: Next.js web application

Each service can be scaled independently based on demand.