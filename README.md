# InfraCost Analyzer Pro

A comprehensive infrastructure cost analysis platform with Terraform cost estimation and AWS pricing calculators.

## 🚀 Features

1. **Terraform Cost Estimation** - Using Infracost to analyze Terraform configurations
2. **AWS Live Cost Calculator** - Interactive calculators for EC2, RDS, S3, EKS
3. **Complete Web UI** - Modern React/Next.js interface
4. **Microservices Architecture** - Scalable and maintainable design
5. **Authentication & RBAC** - JWT-based authentication with role-based access
6. **Reporting & History** - Save and track cost estimates over time

## 🏗️ Architecture

The application follows a microservices architecture with the following services:

- **API Gateway** - Entry point and routing
- **Auth Service** - User authentication and authorization
- **Terraform Cost Engine** - Processes Terraform configurations and runs Infracost
- **AWS Pricing Service** - Interactive pricing calculators
- **Reports Service** - Cost history and reporting
- **Database** - PostgreSQL for data storage
- **Frontend** - Next.js web application

## 🛠️ Tech Stack

- **Backend**: Node.js, Python (FastAPI)
- **Frontend**: Next.js 14+, TypeScript
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose
- **Authentication**: JWT
- **Monitoring**: Winston logging
- **API Documentation**: Swagger

## 📁 Project Structure

```
infracost-analyzer-pro/
├── README.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── architecture/
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── terraform-cost-engine/
│   ├── aws-pricing-service/
│   └── reports-service/
├── frontend/
├── database/
├── terraform-examples/
├── nginx/
└── docs/
```

## 🚀 Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your environment variables
3. Run `docker-compose up` to start the services
4. Access the application at `http://localhost:3000`

## 📄 API Documentation

API documentation is available at `/api-docs` when running the application.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines.

## 📄 License

This project is licensed under the MIT License.