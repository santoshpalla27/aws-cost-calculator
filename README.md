# InfraCost Analyzer Pro

&gt; **Complete Infrastructure Cost Analysis Platform**

A production-ready, enterprise-grade platform for analyzing and estimating infrastructure costs using Terraform and AWS pricing APIs.

## 🌟 Features

- ✅ **Terraform Cost Estimation** - Analyze Terraform configurations using Infracost
- ✅ **AWS Cost Calculators** - Interactive calculators for EC2, RDS, S3, EKS
- ✅ **Real-time Pricing** - Direct integration with AWS Pricing API
- ✅ **Cost History &amp; Reports** - Track costs over time with PDF/CSV exports
- ✅ **Role-based Access Control** - Admin, User, and Viewer roles
- ✅ **REST API** - Full OpenAPI/Swagger documentation
- ✅ **Microservices Architecture** - Scalable and maintainable
- ✅ **Docker &amp; Kubernetes Ready** - Complete containerization
- ✅ **Production Grade** - Logging, monitoring, error handling

## 📋 Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🏗️ Architecture

### System Overview

┌─────────────────────────────────────────────────────────────┐ │ Load Balancer (Nginx) │ └─────────────────────────────────────────────────────────────┘ │ ┌────────────┴────────────┐ │ │ ┌───────▼──────┐ ┌──────▼──────┐ │ Frontend │ │ API Gateway │ │ (Next.js) │ │ (Node.js) │ └──────────────┘ └──────┬──────┘ │ ┌────────────────┼────────────────┐ │ │ │ ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐ │ Terraform │ │ AWS │ │ Reports │ │ Cost Engine │ │ Pricing │ │ Service │ │ (Python) │ │ (Node.js) │ │ (Node.js) │ └──────┬───────┘ └─────┬──────┘ └─────┬──────┘ │ │ │ └───────────────┼──────────────┘ │ ┌──────────▼──────────┐ │ PostgreSQL + Redis │ └─────────────────────┘


### Technology Stack

**Frontend:**
- Next.js 14 (React 18)
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Chart.js

**Backend Services:**
- Node.js/Express (API Gateway, Auth, AWS Pricing, Reports)
- Python/FastAPI (Terraform Cost Engine)
- PostgreSQL 15
- Redis 7

**Infrastructure:**
- Docker &amp; Docker Compose
- Nginx
- Terraform
- Infracost

## 📦 Prerequisites

### Required Software

- **Docker** &gt;= 20.10
- **Docker Compose** &gt;= 2.0
- **Node.js** &gt;= 20.x (for local development)
- **Python** &gt;= 3.11 (for local development)
- **Git**

### Required API Keys

1. **Infracost API Key** (Free tier available)
   - Sign up at: https://www.infracost.io/
   - Get API key from dashboard

2. **AWS Credentials**
   - AWS Access Key ID
   - AWS Secret Access Key
   - Permissions: `pricing:GetProducts` (read-only)

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/infracost-analyzer-pro.git
cd infracost-analyzer-pro
2. Environment Configuration
cp .env.example .env
Edit
.env
and add your credentials:

# Required
INFRACOST_API_KEY=ico-xxxxxxxxxxxxx
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Security (CHANGE THESE!)
JWT_SECRET=\$(openssl rand -base64 32)
JWT_REFRESH_SECRET=\$(openssl rand -base64 32)

# Database (default for dev)
DB_PASSWORD=postgres
3. Start All Services
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
4. Access the Application
Frontend: http://localhost:3001
API Gateway: http://localhost:3000
API Documentation: http://localhost:3000/api-docs
5. Default Login
Email: admin@infracost.com
Password: Admin@123
⚠️ Change default password immediately!

💻 Development Setup
Local Development (Without Docker)
1. Install Dependencies
# API Gateway
cd services/api-gateway
npm install

# Auth Service
cd ../auth-service
npm install

# AWS Pricing Service
cd ../aws-pricing-service
npm install

# Reports Service
cd ../reports-service
npm install

# Terraform Cost Engine
cd ../terraform-cost-engine
pip install -r requirements.txt

# Frontend
cd ../../frontend
npm install
2. Start PostgreSQL & Redis
docker-compose up -d postgres redis
3. Initialize Database
docker exec -i infracost-postgres psql -U postgres -d infracost_db &lt; database/init.sql
4. Start Services
Terminal 1 - API Gateway:

cd services/api-gateway
npm run dev
Terminal 2 - Auth Service:

cd services/auth-service
npm run dev
Terminal 3 - Terraform Cost Engine:

cd services/terraform-cost-engine
uvicorn app.main:app --reload --port 8000
Terminal 4 - AWS Pricing Service:

cd services/aws-pricing-service
npm run dev
Terminal 5 - Reports Service:

cd services/reports-service
npm run dev
Terminal 6 - Frontend:

cd frontend
npm run dev
Hot Reload
All services support hot reload in development mode:

Node.js services use
ts-node-dev
Python service uses
uvicorn --reload
Next.js has built-in fast refresh
🌐 Production Deployment
Option 1: Docker Compose (Single Server)
1. Production Environment File
cp .env.example .env.production
Edit
.env.production
:

NODE_ENV=production

# Strong secrets
JWT_SECRET=\$(openssl rand -base64 64)
JWT_REFRESH_SECRET=\$(openssl rand -base64 64)

# Production database
DB_HOST=postgres
DB_USER=infracost_user
DB_PASSWORD=\$(openssl rand -base64 32)
DB_NAME=infracost_prod

# Redis password
REDIS_PASSWORD=\$(openssl rand -base64 32)

# API Keys
INFRACOST_API_KEY=your_production_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Domain
API_URL=https://api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com
2. Deploy
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale api-gateway=3 --scale aws-pricing-service=2
3. SSL/TLS Configuration
# Install certbot
sudo apt-get install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
Update
nginx/nginx.conf
:

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of config
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://\$server_name\$request_uri;
}
Option 2: Kubernetes Deployment
k8s/deployment.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: infracost-analyzer

---
apiVersion: v1
kind: Secret
metadata:
  name: infracost-secrets
  namespace: infracost-analyzer
type: Opaque
stringData:
  jwt-secret: "your-jwt-secret"
  db-password: "your-db-password"
  infracost-api-key: "your-infracost-key"
  aws-access-key: "your-aws-access-key"
  aws-secret-key: "your-aws-secret-key"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: infracost-analyzer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: your-registry/infracost-api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: infracost-secrets
              key: jwt-secret
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: infracost-analyzer
spec:
  selector:
    app: api-gateway
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: infracost-analyzer
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "infracost_db"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: infracost-secrets
              key: db-password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 20Gi
Deploy to Kubernetes:

# Apply configurations
kubectl apply -f k8s/

# Check status
kubectl get pods -n infracost-analyzer

# View logs
kubectl logs -f deployment/api-gateway -n infracost-analyzer

# Scale deployment
kubectl scale deployment api-gateway --replicas=5 -n infracost-analyzer
📚 API Documentation
Authentication
All API endpoints (except
/auth/login
and
/auth/register
) require JWT authentication.

Get Access Token:

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@infracost.com",
    "password": "Admin@123"
  }'
Response:

{
  "user": {
    "id": "uuid",
    "email": "admin@infracost.com",
    "role": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
Use Token in Requests:

curl -X GET http://localhost:3000/api/reports \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
Core Endpoints
1. Terraform Cost Estimation
Estimate from Git Repository:

curl -X POST http://localhost:3000/api/terraform/estimate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "git",
    "gitUrl": "https://github.com/username/terraform-repo.git",
    "branch": "main",
    "awsAccessKey": "YOUR_AWS_KEY",
    "awsSecretKey": "YOUR_AWS_SECRET"
  }'
Estimate from Uploaded Files:

curl -X POST http://localhost:3000/api/terraform/estimate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "files",
    "files": {
      "main.tf": "resource \"aws_instance\" \"web\" { ... }",
      "variables.tf": "variable \"region\" { ... }"
    },
    "awsAccessKey": "YOUR_AWS_KEY",
    "awsSecretKey": "YOUR_AWS_SECRET"
  }'
Response:

{
  "success": true,
  "totalMonthlyCost": 145.50,
  "totalHourlyCost": 0.1993,
  "currency": "USD",
  "resources": [
    {
      "name": "aws_instance.web",
      "type": "aws_instance",
      "monthlyCost": 45.50,
      "hourlyCost": 0.0623,
      "costComponents": [
        {
          "name": "Instance usage (Linux/UNIX, on-demand, t3.medium)",
          "unit": "hours",
          "monthlyCost": 30.40,
          "price": 0.0416
        },
        {
          "name": "EBS Volume (gp3, 30 GB)",
          "unit": "GB-months",
          "monthlyCost": 2.40,
          "price": 0.08
        }
      ]
    }
  ],
  "summary": {
    "totalResources": 5,
    "resourcesByType": {
      "aws_instance": 2,
      "aws_db_instance": 1,
      "aws_s3_bucket": 2
    },
    "costByService": {
      "EC2": 91.00,
      "RDS": 45.50,
      "S3": 9.00
    }
  }
}
2. AWS EC2 Calculator
curl -X POST http://localhost:3000/api/aws/ec2/calculate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceType": "t3.medium",
    "region": "us-east-1",
    "osType": "Linux",
    "tenancy": "Shared",
    "pricingModel": "OnDemand",
    "quantity": 2,
    "hoursPerMonth": 730,
    "ebsVolumes": [
      {
        "type": "gp3",
        "size": 100
      }
    ],
    "awsAccessKey": "YOUR_AWS_KEY",
    "awsSecretKey": "YOUR_AWS_SECRET"
  }'
Response:

{
  "instanceCost": {
    "hourly": 0.0832,
    "monthly": 60.74,
    "unit": "USD"
  },
  "ebsCost": {
    "monthly": 20.00,
    "breakdown": [
      {
        "type": "gp3",
        "size": 100,
        "cost": 10.00
      }
    ]
  },
  "totalMonthlyCost": 80.74,
  "totalHourlyCost": 0.1106,
  "breakdown": {
    "instanceType": "t3.medium",
    "quantity": 2,
    "osType": "Linux",
    "region": "us-east-1",
    "hoursPerMonth": 730,
    "pricePerHour": 0.0416
  }
}
3. AWS RDS Calculator
curl -X POST http://localhost:3000/api/aws/rds/calculate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "engine": "PostgreSQL",
    "instanceClass": "db.t3.medium",
    "region": "us-east-1",
    "storageType": "gp3",
    "storageSize": 100,
    "multiAZ": true,
    "backupStorage": 50,
    "awsAccessKey": "YOUR_AWS_KEY",
    "awsSecretKey": "YOUR_AWS_SECRET"
  }'
4. Reports Management
Get All Reports:

curl -X GET "http://localhost:3000/api/reports?limit=10&amp;type=terraform" \
  -H "Authorization: Bearer YOUR_TOKEN"
Export Report as PDF:

curl -X GET http://localhost:3000/api/reports/{report_id}/export/pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o report.pdf
Export Report as CSV:

curl -X GET http://localhost:3000/api/reports/{report_id}/export/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o report.csv
Get Cost Trends:

curl -X GET "http://localhost:3000/api/reports/trends?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
Interactive API Documentation
Access Swagger UI at: http://localhost:3000/api-docs

⚙️ Configuration
Environment Variables Reference
Variable	Description	Default	Required
NODE_ENV
Environment (development/production)	development	No
JWT_SECRET
Secret for JWT signing	-	Yes
DB_HOST
PostgreSQL host	postgres	Yes
DB_PASSWORD
PostgreSQL password	-	Yes
INFRACOST_API_KEY
Infracost API key	-	Yes
AWS_ACCESS_KEY_ID
AWS access key	-	Yes
AWS_SECRET_ACCESS_KEY
AWS secret key	-	Yes
REDIS_URL
Redis connection URL	redis://redis:6379	No
CORS_ORIGINS
Allowed CORS origins	http://localhost:3001	No
Service Ports
Service	Port	Description
Frontend	3001	Next.js application
API Gateway	3000	Main API entry point
Auth Service	3002	Authentication service
AWS Pricing	3003	AWS pricing calculator
Reports Service	3004	Report generation
Terraform Engine	8000	Terraform cost estimation
Nginx	80/443	Reverse proxy
PostgreSQL	5432	Database
Redis	6379	Cache
🧪 Testing
Unit Tests
# API Gateway
cd services/api-gateway
npm test

# Auth Service
cd services/auth-service
npm test

# Terraform Cost Engine
cd services/terraform-cost-engine
pytest
Integration Tests
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration
Load Testing
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Ubuntu

# Run load test
k6 run tests/load/api-load-test.js
tests/load/api-load-test.js
:

import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  let response = http.get('http://localhost:3000/health');
  
  check(response, {
    'status is 200': (r) =&gt; r.status === 200,
    'response time &lt; 200ms': (r) =&gt; r.timings.duration &lt; 200,
  });
  
  sleep(1);
}
🔍 Monitoring & Logging
View Logs
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway

# Last 100 lines
docker-compose logs --tail=100 terraform-cost-engine
Log Locations
API Gateway:
services/api-gateway/logs/
Application logs:
stdout
(captured by Docker)
Nginx access:
/var/log/nginx/access.log
Nginx error:
/var/log/nginx/error.log
Monitoring (Production)
Prometheus + Grafana Setup:

# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3005:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  prometheus_data:
  grafana_data:
🐛 Troubleshooting
Common Issues
1. Port Already in Use

# Check what's using the port
lsof -i :3000

# Kill the process
kill -9 <span><span style="color: rgb(150, 34, 73); font-weight: bold;">&lt;pid&gt;</span><span style="color: black; font-weight: normal;">
2. Database Connection Failed

# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
3. Terraform Cost Engine Timeout

# Increase timeout in .env
TERRAFORM_TIMEOUT=600
INFRACOST_TIMEOUT=600

# Restart service
docker-compose restart terraform-cost-engine
4. Out of Memory

# Check resource usage
docker stats

# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory
5. Permission Denied

# Fix file permissions
sudo chown -R \$USER:\$USER .

# Fix Docker permissions
sudo usermod -aG docker \$USER
newgrp docker
Debug Mode
Enable debug logging:

# Set in .env
DEBUG=true
LOG_LEVEL=debug

# Restart services
docker-compose restart
Health Checks
# Check all services
curl http://localhost:3000/health
curl http://localhost:3001/api/health
curl http://localhost:8000/health

# Database connectivity
docker exec -it infracost-postgres psql -U postgres -c "SELECT 1"

# Redis connectivity
docker exec -it infracost-redis redis-cli ping
📖 Additional Resources
Infracost Documentation
AWS Pricing API
Terraform Documentation
Docker Compose Documentation
🤝 Contributing
Contributions are welcome! Please read our Contributing Guide first.

📄 License
This project is licensed under the MIT License - see LICENSE file.

👥 Support
Documentation: docs/
Issues: GitHub Issues
Email: support@infracost-analyzer.com
Built with ❤️ for DevOps and FinOps Engineers


---

## 11. Architecture Diagrams

**`architecture/diagrams/system-architecture.md`**

```markdown
# System Architecture

## High-Level Architecture

┌─────────────────────────────────────────────────────────────────────┐ │ Internet │ └──────────────────────────────┬──────────────────────────────────────┘ │ ┌──────────▼──────────┐ │ Load Balancer │ │ (Nginx) │ └──────────┬──────────┘ │ ┌──────────────┼──────────────┐ │ │ │ ┌────────▼────────┐ │ ┌────────▼────────┐ │ Frontend App │ │ │ API Gateway │ │ (Next.js) │ │ │ (Express) │ │ Port: 3001 │ │ │ Port: 3000 │ └──────────────────┘ │ └────────┬────────┘ │ │ │ ┌────────┼────────┐ │ │ │ │ ┌────▼────▼──┐ ┌──▼────┐ ┌─▼──────┐ │ Auth Service│ │ TF │ │ AWS │ │ Port: 3002 │ │Engine │ │Pricing │ └─────────────┘ │8000 │ │3003 │ └───────┘ └────────┘ │ ┌──────────▼──────────┐ │ Data Layer │ │ ┌──────┐ ┌──────┐ │ │ │ PSQL │ │Redis │ │ │ │ 5432 │ │ 6379 │ │ │ └──────┘ └──────┘ │ └─────────────────────┘


## Microservices Details

### API Gateway
- Routes all external requests
- JWT validation
- Rate limiting
- Request/response logging
- Service discovery

### Auth Service
- User registration/login
- JWT token generation
- Token refresh
- Role-based access control

### Terraform Cost Engine
- Terraform plan execution
- Infracost integration
- Cost calculation
- Git repository handling

### AWS Pricing Service
- Real-time AWS pricing
- Service-specific calculators
- Caching layer (Redis)
- Multi-region support

### Reports Service
- Report generation
- PDF/CSV export
- Cost trend analysis
- Historical data storage

## Data Flow

### Cost Estimation Flow

User → Frontend → API Gateway → Auth Service (validate) → Terraform Engine → Infracost → AWS Pricing API → Reports Service (save) → PostgreSQL (persist) ← Frontend ← API Gateway ← Response


## Security Architecture

┌─────────────────────────────────────┐ │ Security Layers │ ├─────────────────────────────────────┤ │ 1. TLS/SSL Encryption │ │ 2. JWT Authentication │ │ 3. Rate Limiting │ │ 4. Input Validation │ │ 5. CORS Policy │ │ 6. SQL Injection Prevention │ │ 7. XSS Protection │ │ 8. CSRF Protection │ └─────────────────────────────────────┘

architecture/diagrams/sequence-diagrams.md

# Sequence Diagrams

## User Login Flow

User Frontend API Gateway Auth Service Database │ │ │ │ │ │─── login ────→│ │ │ │ │ │──── POST ────→│ │ │ │ │ /auth/ │ │ │ │ │ login │ │ │ │ │ │─── verify ──→│ │ │ │ │ credentials │ │ │ │ │ │─── query ───→│ │ │ │ │ user │ │ │ │ │←─── user ────│ │ │ │ │ data │ │ │ │←─── JWT ─────│ │ │ │ │ tokens │ │ │ │←──── tokens ──│ │ │ │←── success ───│ │ │ │ │ + tokens │ │ │ │


## Terraform Cost Estimation Flow

User Frontend API Gateway TF Engine Infracost Database │ │ │ │ │ │ │─upload──→│ │ │ │ │ │ files │ │ │ │ │ │ │──POST────→│ │ │ │ │ │ estimate │ │ │ │ │ │ │────────────→│ │ │ │ │ │ process TF │ │ │ │ │ │ │─init─────→│ │ │ │ │ │ │ │ │ │ │ │←─ready────│ │ │ │ │ │ │ │ │ │ │ │─plan─────→│ │ │ │ │ │ │ │ │ │ │ │←─plan.json│ │ │ │ │ │ │ │ │ │ │ │────────breakdown──────→│ │ │ │ │ (run) │ │ │ │ │←────costs──────────── │ │ │ │ │ │ │ │ │←───costs───│ │ │ │ │ + breakdown │ │ │ │────────────────save report─────────→│ │ │ │ │ │ │←──result──│ │ │←─display─│ │ │ │ costs │ │ │


## AWS Cost Calculator Flow

User Frontend API Gateway AWS Service AWS API Redis Database │ │ │ │ │ │ │ │─config──→│ │ │ │ │ │ │ │──POST────→│ │ │ │ │ │ │ calculate │ │ │ │ │ │ │ │─────────────→│ │ │ │ │ │ │ EC2 params │ │ │ │ │ │ │ │───check───→│ │ │ │ │ │ │ cache │ │ │ │ │ │ │←──miss────│ │ │ │ │ │ │ │ │ │ │ │ │ │────get pricing────→│ │ │ │ │ │ │ │ │ │ │ │←───prices──────────│ │ │ │ │ │ │ │ │ │ │───cache───→│ │ │ │ │ │ result │ │ │ │ │ │ │ │ │ │←───result───│ │ │ │ │─────────────────save calculation──────────→│ │ │←──costs───│ │ │←─display─│ │ │

12. Final Setup Script
scripts/setup.sh

#!/bin/bash

# InfraCost Analyzer Pro - Setup Script
# This script automates the initial setup process

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║   InfraCost Analyzer Pro - Setup Wizard       ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

command -v docker &gt;/dev/null 2&gt;&amp;1 || { 
    echo -e "\${RED}✗ Docker is not installed\${NC}" 
    exit 1
}
echo -e "\${GREEN}✓ Docker found\${NC}"

command -v docker-compose &gt;/dev/null 2&gt;&amp;1 || { 
    echo -e "\${RED}✗ Docker Compose is not installed\${NC}" 
    exit 1
}
echo -e "\${GREEN}✓ Docker Compose found\${NC}"

# Create .env file
echo ""
echo "Creating environment configuration..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "\${GREEN}✓ Created .env file\${NC}"
    
    # Generate secrets
    JWT_SECRET=\$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=\$(openssl rand -base64 32)
    
    # Update .env with generated secrets
    sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=\${JWT_SECRET}|g" .env
    sed -i.bak "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=\${JWT_REFRESH_SECRET}|g" .env
    rm .env.bak
    
    echo -e "\${GREEN}✓ Generated secure JWT secrets\${NC}"
else
    echo -e "\${YELLOW}⚠ .env file already exists\${NC}"
fi

# Prompt for API keys
echo ""
echo "Please enter your API credentials:"
echo "(Press Enter to skip and configure later)"
echo ""

read -p "Infracost API Key: " INFRACOST_KEY
read -p "AWS Access Key ID: " AWS_KEY
read -sp "AWS Secret Access Key: " AWS_SECRET
echo ""

if [ -n "\$INFRACOST_KEY" ]; then
    sed -i.bak "s|INFRACOST_API_KEY=.*|INFRACOST_API_KEY=\${INFRACOST_KEY}|g" .env
    rm .env.bak
fi

if [ -n "\$AWS_KEY" ]; then
    sed -i.bak "s|AWS_ACCESS_KEY_ID=.*|AWS_ACCESS_KEY_ID=\${AWS_KEY}|g" .env
    rm .env.bak
fi

if [ -n "\$AWS_SECRET" ]; then
    sed -i.bak "s|AWS_SECRET_ACCESS_KEY=.*|AWS_SECRET_ACCESS_KEY=\${AWS_SECRET}|g" .env
    rm .env.bak
fi

# Build Docker images
echo ""
echo "Building Docker images..."
docker-compose build

echo -e "\${GREEN}✓ Docker images built successfully\${NC}"

# Start services
echo ""
echo "Starting services..."
docker-compose up -d

echo -e "\${GREEN}✓ Services started\${NC}"

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service health
SERVICES=("postgres" "redis" "api-gateway" "frontend")
for service in "\${SERVICES[@]}"; do
    if docker-compose ps | grep -q "\$service.*Up"; then
        echo -e "\${GREEN}✓ \$service is running\${NC}"
    else
        echo -e "\${RED}✗ \$service failed to start\${NC}"
    fi
done

# Initialize database
echo ""
echo "Initializing database..."
docker exec -i infracost-postgres psql -U postgres -d infracost_db &lt; database/init.sql 2&gt;/dev/null || true
echo -e "\${GREEN}✓ Database initialized\${NC}"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║           Setup Complete! 🎉                   ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Access the application:"
echo ""
echo "  Frontend:       http://localhost:3001"
echo "  API Gateway:    http://localhost:3000"
echo "  API Docs:       http://localhost:3000/api-docs"
echo ""
echo "Default credentials:"
echo "  Email:    admin@infracost.com"
echo "  Password: Admin@123"
echo ""
echo -e "\${YELLOW}⚠ IMPORTANT: Change the default password immediately!\${NC}"
echo ""
echo "View logs:"
echo "  docker-compose logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose down"
echo ""
Make it executable:

chmod +x scripts/setup.sh
./scripts/setup.sh