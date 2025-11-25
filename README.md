# AWS DevOps Interview Master

A production-ready, three-tier web application for practicing AWS and DevOps interview questions, scenarios, and architecture puzzles.

## 🏗️ Architecture

This application follows a strict three-tier architecture:

- **Presentation Tier**: Next.js frontend with React, Tailwind CSS, and Zustand
- **Application Tier**: Node.js + Express backend with RESTful APIs
- **Data Tier**: PostgreSQL database with Redis caching

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Running with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/aws-devops-interview-master.git
   cd aws-devops-interview-master
   ```
2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
3. **Start all services**
   ```bash
   docker-compose up -d
   ```
4. **Run database migrations and seed data**
   ```bash
   docker-compose exec backend npm run migrate
   docker-compose exec backend npm run seed
   ```
5. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001`
   - API Documentation: `http://localhost:3001/api-docs`
   - PgAdmin: `http://localhost:5050` (dev profile only)

### Local Development

1. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```
2. **Start PostgreSQL and Redis**
   ```bash
   docker-compose up -d postgres redis
   ```
3. **Run migrations and seed**
   ```bash
   cd backend
   npm run migrate
   npm run seed
   ```
4. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## 📁 Project Structure

```
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # Data access layer
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── validators/     # Input validation
│   │   ├── engines/        # Quiz/Scenario/Puzzle engines
│   │   └── utils/          # Utilities
│   ├── tests/              # Test files
│   ├── migrations/         # Database migrations
│   └── seeds/              # Seed data
│
├── frontend/               # Next.js React application
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # React components
│   │   ├── store/         # Zustand state management
│   │   ├── services/      # API services
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utilities
│   │   └── lib/           # Utility functions (cn, etc.)
│   └── public/            # Static assets
│
├── nginx/                  # Nginx configuration
├── docker-compose.yml      # Docker Compose configuration
└── README.md
```

## 🔧 Environment Variables

### Backend (`.env`)

```
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interview_master
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## 📚 API Documentation

API documentation is available at `/api-docs` when running the backend server.

### Key Endpoints

| Method | Endpoint                             | Description            |
| ------ | ------------------------------------ | ---------------------- |
| POST   | `/api/v1/auth/signup`                | Register new user      |
| POST   | `/api/v1/auth/login`                 | Login user             |
| GET    | `/api/v1/quizzes`                    | List quizzes           |
| POST   | `/api/v1/quizzes/:id/start`          | Start quiz attempt     |
| POST   | `/api/v1/quizzes/attempts/:id/submit`| Submit quiz            |
| GET    | `/api/v1/scenarios`                  | List scenarios         |
| POST   | `/api/v1/scenarios/:id/start`        | Start scenario         |
| GET    | `/api/v1/puzzles`                    | List puzzles           |
| POST   | `/api/v1/puzzles/:id/start`          | Start puzzle           |
| GET    | `/api/v1/leaderboard`                | Get leaderboard        |

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚢 Deployment

### AWS Deployment (Future)

This application is designed to be easily deployed to AWS:

- ECS/Fargate for containerized workloads
- RDS PostgreSQL for database
- ElastiCache Redis for caching
- Application Load Balancer for traffic distribution
- CloudFront for CDN
- S3 for static assets

### Production Checklist

- Set strong JWT secrets
- Enable HTTPS with SSL certificates
- Configure proper CORS origins
- Set up database backups
- Configure CloudWatch logging
- Enable rate limiting
- Set up monitoring and alerts

## 📦 Adding New Content

### Adding Quiz Questions

1. Create or update JSON file in `seeds/data/`
2. Run seeder: `npm run seed`

### Adding Scenarios

1. Add scenario to `seeds/data/scenarios.json`
2. Include steps with correct/incorrect options
3. Run seeder

### Adding Puzzles

1. Add puzzle to `seeds/data/puzzles.json`
2. Define components and expected positions
3. Run seeder

## 🔌 External Data Enrichment (Future)

The application includes stub code for enriching the question bank:

```javascript
// backend/src/services/enrichment.service.js
// Configure with GEMINI_API_KEY or OPENAI_API_KEY
```

## 🤝 Contributing

- Fork the repository
- Create a feature branch
- Make your changes
- Run tests
- Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- AWS Documentation
- Kubernetes Documentation
- DevOps Community
