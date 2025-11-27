# Getting Started with InfraCost Analyzer Pro

## Prerequisites

1. **Docker & Docker Compose**
   - Docker >= 20.10
   - Docker Compose >= 2.0

2. **API Keys Required**
   - Infracost API Key (free tier available at https://www.infracost.io/)
   - AWS Access Key & Secret (with pricing API read permissions)

## Quick Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd infracost-analyzer-pro
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your API keys
nano .env  # or use your preferred editor
```

### 3. Start Application
```bash
# Using quick start script
./scripts/quick-start.sh

# OR manually
docker-compose up -d
```

### 4. Access Application
- Frontend: http://localhost:80
- API Documentation: http://localhost:3000/api-docs

### 5. Default Credentials
- Email: admin@infracost.com
- Password: Admin@123

⚠️ **IMPORTANT**: Change these credentials immediately after first login!