# System Architecture Diagram

## High-Level Architecture

                                Internet
                                   │
                        ┌──────────▼──────────┐
                        │   Load Balancer     │
                        │     (Nginx)         │
                        │    Port: 80/443     │
                        └──────────┬──────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
        ┌───────▼────────┐  ┌─────▼──────┐  ┌───────▼────────┐
        │   Frontend      │  │ API Gateway │  │ API Docs       │
        │   (Next.js)     │  │ (Express)   │  │ (Swagger)      │
        │   Port: 3001    │  │ Port: 3000  │  │                │
        └─────────────────┘  └─────┬───────┘  └────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
        ┌───────▼────────┐  ┌──────▼──────┐  ┌──────▼──────┐
        │  Auth Service  │  │  Terraform  │  │     AWS     │
        │  (Express)     │  │ Cost Engine │  │   Pricing   │
        │  Port: 3002    │  │  (FastAPI)  │  │  (Express)  │
        └───────┬────────┘  │  Port: 8000 │  │ Port: 3003  │
                │           └──────┬──────┘  └──────┬──────┘
                │                  │                │
                │           ┌──────▼──────┐  ┌──────▼──────┐
                │           │   Reports   │  │    Redis    │
                │           │   Service   │  │   Cache     │
                │           │ Port: 3004  │  │ Port: 6379  │
                │           └──────┬──────┘  └─────────────┘
                │                  │
                └──────────────────┼──────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   PostgreSQL DB     │
                        │    Port: 5432       │
                        └─────────────────────┘

## Microservices Communication

┌─────────────────────────────────────────────────────────────┐
│ Request Flow Example                                        │
├─────────────────────────────────────────────────────────────┤
│ User → Frontend → Nginx → API Gateway                       │
│ │                                                           │
│ └──→ Auth Service (Validate)                                │
│ │   ├──→ Terraform Engine                                  │
│ │   │   ├──→ Run Terraform                                 │
│ │   │   └──→ Run Infracost                                 │
│ │   ├──→ AWS Pricing Service                               │
│ │   │   ├──→ AWS Pricing API                               │
│ │   │   └──→ Redis Cache                                   │
│ │   └──→ Reports Service                                   │
│ │       ├──→ Generate PDF/CSV                              │
│ │       └──→ Save to DB                                    │
│ └──→ PostgreSQL                                            │
└─────────────────────────────────────────────────────────────┘

## Data Flow

### Terraform Cost Estimation Flow

1. User uploads Terraform files via Frontend
2. Frontend sends to API Gateway
3. API Gateway validates JWT with Auth Service
4. API Gateway forwards to Terraform Cost Engine
5. Terraform Cost Engine:
   - Saves files to temp directory
   - Runs `terraform init`
   - Runs `terraform plan`
   - Runs `terraform show -json`
   - Runs `infracost breakdown`
   - Parses results
6. Results returned to API Gateway
7. API Gateway saves report via Reports Service
8. Response sent back to Frontend
9. Frontend displays cost breakdown

### AWS Calculator Flow

1. User inputs configuration in Frontend
2. Frontend sends to API Gateway
3. API Gateway validates request
4. API Gateway forwards to AWS Pricing Service
5. AWS Pricing Service:
   - Checks Redis cache
   - If miss, queries AWS Pricing API
   - Calculates costs
   - Stores in Redis cache
6. Results returned to API Gateway
7. API Gateway saves calculation via Reports Service
8. Response sent back to Frontend
9. Frontend displays cost estimate