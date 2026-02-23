#!/bin/bash

# Felicity Event Management System - Development Script
# Usage: ./script.sh [command]
# Commands: setup, backend, frontend, both, seed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  🎉 Felicity Event Management System${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Setup function - installs all dependencies
setup() {
    print_header
    echo "Installing dependencies..."
    
    echo -e "\n${BLUE}Installing backend dependencies...${NC}"
    cd backend
    npm install
    
    # Copy .env if not exists
    if [ ! -f .env ]; then
        cp .env.example .env
        print_warning "Created .env from .env.example - Update with your MongoDB Atlas URI!"
    fi
    cd ..
    
    echo -e "\n${BLUE}Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..
    
    print_success "Setup complete!"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Edit backend/.env with your MongoDB Atlas connection string"
    echo "2. Run: ./script.sh seed    # Create admin account"
    echo "3. Run: ./script.sh both    # Start both servers"
}

# Seed admin
seed() {
    print_header
    echo "Creating admin account..."
    cd backend
    npm run seed:admin
    cd ..
    print_success "Admin seeded!"
}

# Start backend
start_backend() {
    print_header
    echo -e "${BLUE}Starting backend server on port 5000...${NC}"
    cd backend
    npm run dev
}

# Start frontend
start_frontend() {
    print_header
    echo -e "${BLUE}Starting frontend server on port 5173...${NC}"
    cd frontend
    npm run dev
}

# Start both (in separate processes)
start_both() {
    print_header
    echo -e "${BLUE}Starting both servers...${NC}"
    echo -e "${YELLOW}Backend: http://localhost:5000${NC}"
    echo -e "${YELLOW}Frontend: http://localhost:5173${NC}"
    echo ""
    
    # Start backend in background
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait a moment for backend to start
    sleep 2
    
    # Start frontend
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo -e "\n${GREEN}Both servers running!${NC}"
    echo "Press Ctrl+C to stop both servers"
    
    # Wait for Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
    wait
}

# Show help
show_help() {
    print_header
    echo ""
    echo "Usage: ./script.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup     Install all dependencies"
    echo "  seed      Create admin account in database"
    echo "  backend   Start backend server only"
    echo "  frontend  Start frontend server only"
    echo "  both      Start both servers"
    echo "  help      Show this help message"
    echo ""
    echo "Quick start:"
    echo "  1. ./script.sh setup"
    echo "  2. Edit backend/.env with MongoDB Atlas URI"
    echo "  3. ./script.sh seed"
    echo "  4. ./script.sh both"
    echo ""
}

# Main
case "$1" in
    setup)
        setup
        ;;
    seed)
        seed
        ;;
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    both)
        start_both
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        ;;
esac
