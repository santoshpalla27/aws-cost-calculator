# Project Management & Personal Task Tracking Application

🚀 Complete Project Management + Personal Task Tracking + Personal Space App

## Table of Contents
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Setup Instructions](#setup-instructions)
- [Security Implementation](#security-implementation)
- [UI/UX Specifications](#uiux-specifications)

## System Architecture

### Client Layer
- Next.js 14 (App Router) + React 18
- Tailwind CSS + ShadCN UI
- Framer Motion (Animations)
- Recharts (Analytics)
- TipTap/Slate (Rich Text Editor)
- React DnD (Drag & Drop)
- Zustand/Redux (State Management)

### API Gateway / Nginx
- Rate Limiting (Redis)
- Load Balancing
- SSL Termination

### Backend Layer
- NestJS (Node.js Framework)
- REST API Controllers
- GraphQL Resolver (Optional)
- WebSocket Gateway (Real-time)
- Bull Queue (Background Jobs)
- JWT Auth Guards
- RBAC Decorators
- Service Layer

### Database Layer
- PostgreSQL (Primary DB) + Prisma ORM
- Redis (Cache/Queue)
- S3 Compatible Storage (MinIO/AWS S3)

### External Services
- OpenAI API (AI Features)
- SendGrid/AWS SES (Emails)
- Stripe (Payments - Future)
- OAuth Providers (Google, GitHub)

## Database Schema

The application uses a comprehensive schema supporting projects, tasks, personal features, and more:

### Core Entities
- **Users**: Authentication, profiles, preferences
- **Workspaces**: Team collaboration spaces
- **Projects**: Project management with multiple methodologies
- **Epics/Tasks**: Hierarchical task organization
- **Personal Tasks**: Individual task management
- **Habits**: Habit tracking with streaks
- **Journal**: Personal journaling with mood tracking
- **Pages**: Note-taking with block-based editor

### Key Features
- JWT-based authentication with refresh tokens
- OAuth2 support for Google and GitHub
- Role-based access control (RBAC)
- Real-time notifications with WebSockets
- File upload with S3-compatible storage
- Integration with external services (Google Calendar, GitHub, etc.)
- AI-powered features using OpenAI API

## Project Structure

```
project-management-app/
├── frontend/                           # Next.js Frontend
│   ├── app/
│   │   ├── (auth)/                     # Authentication pages
│   │   ├── (dashboard)/                # Main dashboard pages
│   │   ├── api/                        # API routes
│   │   └── layout.tsx
│   ├── components/                     # UI Components
│   │   ├── ui/                         # ShadCN components
│   │   ├── layout/                     # Layout components
│   │   └── features/                   # Feature-specific components
│   ├── lib/
│   │   ├── api/                        # API client
│   │   ├── hooks/                      # Custom hooks
│   │   ├── store/                      # State management
│   │   └── utils/                      # Utilities
│   └── public/
├── backend/                            # NestJS Backend
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── modules/                    # Feature modules
│   │   ├── common/                     # Common utilities
│   │   ├── database/                   # Database configuration
│   │   └── config/                     # Application config
│   ├── prisma/                         # Prisma schema
│   └── test/                           # Test files
├── docker/                             # Docker configurations
├── docker-compose.yml                  # Docker Compose
└── README.md
```

## API Documentation

### Authentication Endpoints
```
POST /api/auth/register          # Register a new user
POST /api/auth/login             # Login user
POST /api/auth/refresh           # Refresh access token
POST /api/auth/logout            # Logout user
GET  /api/auth/google            # Google OAuth login
GET  /api/auth/github            # GitHub OAuth login
```

### Project Management Endpoints
```
GET    /api/projects              # List projects
POST   /api/projects              # Create project
GET    /api/projects/:id          # Get project details
PATCH  /api/projects/:id          # Update project
DELETE /api/projects/:id          # Delete project
GET    /api/projects/:id/board    # Get kanban board data
GET    /api/projects/:id/tasks    # Get project tasks
```

### Task Management Endpoints
```
GET    /api/tasks                 # List tasks
POST   /api/tasks                 # Create task
GET    /api/tasks/:id             # Get task details
PATCH  /api/tasks/:id             # Update task
DELETE /api/tasks/:id             # Delete task
POST   /api/tasks/:id/comments    # Add comment
POST   /api/tasks/:id/time-logs   # Log time
```

### Personal Features Endpoints
```
GET    /api/personal/tasks        # List personal tasks
POST   /api/personal/tasks        # Create personal task
GET    /api/personal/habits       # List habits
POST   /api/personal/habits       # Create habit
GET    /api/personal/journal      # List journal entries
POST   /api/personal/journal      # Create journal entry
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional but recommended)

### Environment Variables

Create `.env` files for both frontend and backend:

**Backend (.env)**
```env
# App
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/projectmanager?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback

# S3 Storage (MinIO for local, AWS S3 for production)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=projectmanager
S3_REGION=us-east-1
S3_USE_SSL=false

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourapp.com

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGINS=http://localhost:3000

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth (for client-side redirects)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Analytics (Optional)
NEXT_PUBLIC_GA_TRACKING_ID=
```

### Docker Compose Setup (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Run migrations in Docker
docker-compose exec backend npx prisma migrate dev

# Seed database in Docker
docker-compose exec backend npx prisma db seed
```

### Manual Setup

```bash
# Clone repository
git clone https://github.com/yourusername/project-management-app.git
cd project-management-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Run PostgreSQL migrations
cd backend
npx prisma migrate dev

# Start services
# Terminal 1: Start backend
cd backend
npm run start:dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

## Security Implementation

### Authentication Flow
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (10 rounds)
- Rate limiting to prevent brute force attacks
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers

### Authorization
- Role-based access control (RBAC)
- Workspace and project level permissions
- Fine-grained access controls
- Session management

### Data Protection
- Encryption at rest for sensitive data
- Secure transmission with HTTPS
- Audit logging for critical operations
- Input validation and sanitization

## UI/UX Specifications

### Design System
- **Color Palette**: Blue primary, with status colors (success, warning, error)
- **Typography**: Inter font family with appropriate scaling
- **Components**: ShadCN UI component library
- **Animations**: Framer Motion for smooth transitions

### Key User Flows
1. **Onboarding**: Simple signup/login with OAuth options
2. **Dashboard**: Overview of projects, tasks, and personal items
3. **Project Management**: Create, organize, and track projects with kanban boards
4. **Personal Tasks**: Manage individual tasks, habits, and journal
5. **Collaboration**: Invite team members and assign tasks
6. **Analytics**: View productivity metrics and project insights

## Key Features

### Project Management
- Multiple project methodologies (Scrum, Kanban, Agile)
- Customizable workflows and issue types
- Epics, tasks, and subtasks hierarchy
- Time tracking and reporting
- Task dependencies and blockers
- Labels and custom fields
- Kanban boards with drag-and-drop

### Personal Productivity
- Personal task lists with priorities and due dates
- Habit tracking with streaks and analytics
- Personal journal with mood tracking
- Focus timer (Pomodoro)
- Calendar integration

### Collaboration
- Real-time notifications
- Comments and mentions
- File attachments
- Team workspace management
- Role-based permissions

### Advanced Features
- AI-powered task suggestions
- Integration with external tools (Google Calendar, GitHub, etc.)
- Custom automation rules
- Rich text and block-based editor
- Analytics and reporting dashboard

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: NestJS, Node.js, TypeScript
- **Database**: PostgreSQL, Prisma ORM
- **Caching**: Redis
- **Authentication**: JWT, OAuth2 (Google, GitHub)
- **File Storage**: S3-compatible (MinIO/AWS S3)
- **Real-time**: WebSockets
- **AI**: OpenAI API
- **Containerization**: Docker, Docker Compose
- **Deployment**: Nginx, PM2