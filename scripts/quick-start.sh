#!/bin/bash

echo "=================================="
echo "InfraCost Analyzer Pro Quick Start"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your API keys"
    echo "   - INFRACOST_API_KEY"
    echo "   - AWS_ACCESS_KEY_ID"
    echo "   - AWS_SECRET_ACCESS_KEY"
    read -p "Press Enter after updating .env file..."
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "=================================="
echo "✅ InfraCost Analyzer Pro is running!"
echo "=================================="
echo ""
echo "Services:"
echo "  Frontend:    http://localhost:80"
echo "  API Gateway: http://localhost:3000"
echo "  API Docs:    http://localhost:3000/api-docs"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop:      docker-compose down"
echo ""