#!/bin/bash

echo "Setting up Terraform Cost Estimator..."

# Create backend directories
mkdir -p backend/src/{config,services,controllers,middleware,utils}
mkdir -p backend/uploads
mkdir -p backend/logs

# Create frontend directories  
mkdir -p frontend/src/{components,services,hooks,utils}

# Backend setup
echo "Setting up backend..."
cd backend
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created backend/.env - please update with your configuration"
fi
npm install
cd ..

# Frontend setup
echo "Setting up frontend..."
cd frontend
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created frontend/.env"
fi
npm install
cd ..

echo "Setup complete!"
echo ""
echo "To run in development mode:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "To run with Docker:"
echo "  docker-compose up -d"