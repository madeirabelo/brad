#!/bin/bash

# Deployment script for Raspberry Pi
echo "🚀 Starting automated deployment to Raspberry Pi..."

# Configuration
PI_HOST="192.168.31.27"
PI_USER="pi"
PI_PASSWORD="pi911"
PI_WWW_DIR="/var/www/html"
PI_SERVER_DIR="/home/pi/brad-server"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    print_error "sshpass is not installed. Please install it first:"
    echo "  macOS: brew install sshpass"
    echo "  Ubuntu/Debian: sudo apt-get install sshpass"
    exit 1
fi

# Step 1: Build the application
print_status "Building application for Raspberry Pi deployment..."
if REACT_APP_API_URL=http://192.168.31.27:5050 npm run build; then
    print_status "✅ Build completed successfully!"
else
    print_error "❌ Build failed!"
    exit 1
fi

# Step 2: Create a temporary directory for deployment
TEMP_DIR=$(mktemp -d)
print_status "Created temporary directory: $TEMP_DIR"

# Step 3: Copy build files to temp directory
print_status "Copying build files..."
mkdir -p "$TEMP_DIR/frontend"
cp -r build/* "$TEMP_DIR/frontend/"

# Step 4: Copy server files to temp directory
print_status "Copying server files..."
mkdir -p "$TEMP_DIR/backend"
cp -r server/* "$TEMP_DIR/backend/"

# Step 5: Create deployment script for Raspberry Pi
cat > "$TEMP_DIR/deploy_on_pi.sh" << 'EOF'
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[PI]${NC} $1"
}

print_error() {
    echo -e "${RED}[PI ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[PI WARNING]${NC} $1"
}

# Stop existing PM2 processes if running
print_status "Stopping existing PM2 processes..."
pm2 stop brad-backend 2>/dev/null || true
pm2 stop brad-server 2>/dev/null || true
pm2 delete brad-backend 2>/dev/null || true
pm2 delete brad-server 2>/dev/null || true

# Kill any processes using port 5050 to prevent EADDRINUSE errors
print_status "Cleaning up port 5050..."
PORT_PIDS=$(sudo lsof -ti:5050 2>/dev/null || true)
if [ ! -z "$PORT_PIDS" ]; then
    print_warning "Found processes using port 5050: $PORT_PIDS"
    echo "$PORT_PIDS" | xargs -r sudo kill -9
    print_status "Killed processes using port 5050"
    sleep 3
else
    print_status "Port 5050 is clean"
fi

# Additional cleanup: Kill any Node.js processes that might be lingering
print_status "Cleaning up any lingering Node.js processes..."
NODE_PIDS=$(ps aux | grep node | grep -v grep | awk '{print $2}' 2>/dev/null || true)
if [ ! -z "$NODE_PIDS" ]; then
    print_warning "Found Node.js processes: $NODE_PIDS"
    echo "$NODE_PIDS" | xargs -r sudo kill -9
    print_status "Killed lingering Node.js processes"
    sleep 2
fi

# Double-check port is free
print_status "Verifying port 5050 is available..."
for i in {1..5}; do
    if sudo lsof -i:5050 >/dev/null 2>&1; then
        print_warning "Port 5050 is still in use (attempt $i/5), waiting..."
        sleep 2
        # Try to kill again
        PORT_PIDS=$(sudo lsof -ti:5050 2>/dev/null || true)
        if [ ! -z "$PORT_PIDS" ]; then
            echo "$PORT_PIDS" | xargs -r sudo kill -9
        fi
    else
        print_status "Port 5050 is now available"
        break
    fi
    
    if [ $i -eq 5 ]; then
        print_error "Port 5050 is still in use after 5 attempts!"
        sudo lsof -i:5050
        exit 1
    fi
done

# Create server directory
print_status "Setting up server directory..."
sudo mkdir -p /home/pi/brad-server
sudo chown pi:pi /home/pi/brad-server

# Copy server files
print_status "Installing server files..."
cp -r backend/* /home/pi/brad-server/

# Install server dependencies
print_status "Installing server dependencies..."
cd /home/pi/brad-server
npm install --production

# Start the backend server with PM2
print_status "Starting backend server with PM2..."
cd /home/pi/brad-server

# Retry mechanism for starting the backend
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    pm2 start server.js --name brad-server --env production
    
    # Wait a moment for the process to start
    sleep 3
    
    # Check if the process started successfully
    if pm2 list | grep -q "brad-server.*online"; then
        print_status "✅ Backend server started successfully on attempt $((RETRY_COUNT + 1))"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        print_warning "Backend failed to start (attempt $RETRY_COUNT/$MAX_RETRIES)"
        
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            print_status "Cleaning up and retrying..."
            pm2 delete brad-server 2>/dev/null || true
            
            # Kill any processes using port 5050
            PORT_PIDS=$(sudo lsof -ti:5050 2>/dev/null || true)
            if [ ! -z "$PORT_PIDS" ]; then
                echo "$PORT_PIDS" | xargs -r sudo kill -9
                print_status "Killed processes using port 5050"
            fi
            
            # Additional cleanup: Kill any Node.js processes
            NODE_PIDS=$(ps aux | grep node | grep -v grep | awk '{print $2}' 2>/dev/null || true)
            if [ ! -z "$NODE_PIDS" ]; then
                echo "$NODE_PIDS" | xargs -r sudo kill -9
                print_status "Killed lingering Node.js processes"
            fi
            
            sleep 3
        else
            print_error "❌ Failed to start backend server after $MAX_RETRIES attempts"
            pm2 logs brad-server --lines 10
            exit 1
        fi
    fi
done

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Check if PM2 process is running
if pm2 list | grep -q "brad-server.*online"; then
    print_status "✅ Backend server is running on port 5050"
    
    # Wait a moment for the server to fully start
    sleep 3
    
    # Test if the backend is actually responding
    print_status "Testing backend connectivity..."
    for i in {1..10}; do
        if curl -s http://localhost:5050/api/movies >/dev/null 2>&1; then
            print_status "✅ Backend is responding to API requests"
            break
        else
            if [ $i -eq 10 ]; then
                print_warning "⚠️  Backend started but not responding to API requests"
            else
                print_status "Waiting for backend to be ready... (attempt $i/10)"
                sleep 2
            fi
        fi
    done
else
    print_error "❌ Failed to start backend server"
    pm2 logs brad-server --lines 10
    exit 1
fi

# Copy frontend files to nginx directory
print_status "Deploying frontend to nginx..."
sudo rm -rf /var/www/html/*
sudo cp -r /tmp/brad-deploy/frontend/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

# Restart nginx
print_status "Restarting nginx..."
sudo systemctl restart nginx

print_status "✅ Deployment completed!"
print_status "Frontend: http://$(hostname -I | awk '{print $1}'):80"
print_status "Backend: http://localhost:5050"
EOF

chmod +x "$TEMP_DIR/deploy_on_pi.sh"

# Step 6: Transfer files to Raspberry Pi
print_status "Transferring files to Raspberry Pi..."
if sshpass -p "$PI_PASSWORD" scp -o StrictHostKeyChecking=no -r "$TEMP_DIR" "$PI_USER@$PI_HOST:/tmp/brad-deploy"; then
    print_status "✅ Files transferred successfully!"
else
    print_error "❌ Failed to transfer files!"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Step 7: Execute deployment script on Raspberry Pi
print_status "Executing deployment on Raspberry Pi..."
if sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "cd /tmp/brad-deploy && chmod +x deploy_on_pi.sh && ./deploy_on_pi.sh"; then
    print_status "✅ Deployment completed successfully!"
else
    print_error "❌ Deployment failed!"
    # Clean up
    sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "rm -rf /tmp/brad-deploy" 2>/dev/null || true
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Step 8: Clean up
print_status "Cleaning up temporary files..."
sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "rm -rf /tmp/brad-deploy" 2>/dev/null || true
rm -rf "$TEMP_DIR"

# Step 9: Verify deployment
print_status "Verifying deployment..."
sleep 3

# Check if PM2 processes are running
if sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "pm2 list | grep -q 'brad-server.*online'"; then
    print_status "✅ Backend server (brad-server) is running"
else
    print_warning "⚠️  Backend server (brad-server) might not be running"
fi

if sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "pm2 list | grep -q 'brad-backend.*online'"; then
    print_status "✅ Backend server (brad-backend) is running"
else
    print_warning "⚠️  Backend server (brad-backend) might not be running"
fi

# Check if nginx is serving the frontend
if sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost" | grep -q "200"; then
    print_status "✅ Frontend is being served by nginx"
else
    print_warning "⚠️  Frontend might not be accessible"
fi

# Test backend API endpoints
print_status "Testing backend API endpoints..."
sleep 5  # Give backend time to fully start

# Test movies endpoint
if sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "curl -s http://localhost:5050/api/movies | grep -q 'movies'"; then
    print_status "✅ Movies API is working"
else
    print_warning "⚠️  Movies API might not be working"
fi

# Test concerts endpoint
if sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "curl -s http://localhost:5050/api/concerts | grep -q 'concerts'"; then
    print_status "✅ Concerts API is working"
else
    print_warning "⚠️  Concerts API might not be working"
fi

echo ""
print_status "🎉 Deployment completed!"
echo ""
echo "📋 Application Details:"
echo "   Frontend: http://$PI_HOST (served by nginx)"
echo "   Backend: http://$PI_HOST:5050 (internal)"
echo ""
echo "🔧 Useful commands:"
echo "   Check PM2 status: ssh $PI_USER@$PI_HOST 'pm2 list'"
echo "   View backend logs: ssh $PI_USER@$PI_HOST 'pm2 logs brad-server'"
echo "   View backend logs: ssh $PI_USER@$PI_HOST 'pm2 logs brad-backend'"
echo "   Restart backend: ssh $PI_USER@$PI_HOST 'pm2 restart brad-server'"
echo "   Restart backend: ssh $PI_USER@$PI_HOST 'pm2 restart brad-backend'"
echo "   Check nginx status: ssh $PI_USER@$PI_HOST 'sudo systemctl status nginx'"
echo "" 