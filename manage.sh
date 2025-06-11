#!/bin/bash

# Function to find and kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        echo "Stopping process on port $port (PID: $pid)"
        kill -9 $pid
    else
        echo "No process running on port $port"
    fi
}

# Function to start the backend server
start_backend() {
    echo "Starting backend server..."
    cd server
    npm start &
    echo $! > ../.backend.pid
    cd ..
}

# Function to start the frontend server
start_frontend() {
    echo "Starting frontend server..."
    npm start &
    echo $! > .frontend.pid
}

# Function to stop all servers
stop_all() {
    echo "Stopping all servers..."
    kill_port 5050  # Backend port
    kill_port 3000  # Frontend port
    
    # Remove PID files if they exist
    rm -f .backend.pid .frontend.pid
}

# Function to check server status
status() {
    echo "Checking server status..."
    echo "Backend server: $(lsof -ti :5050 > /dev/null && echo "Running" || echo "Not running")"
    echo "Frontend server: $(lsof -ti :3000 > /dev/null && echo "Running" || echo "Not running")"
}

# Main script logic
case "$1" in
    "start")
        stop_all  # Stop any existing processes first
        start_backend
        start_frontend
        echo "All servers started"
        ;;
    "stop")
        stop_all
        echo "All servers stopped"
        ;;
    "restart")
        stop_all
        start_backend
        start_frontend
        echo "All servers restarted"
        ;;
    "status")
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0 