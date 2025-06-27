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
cp -r build/* "$TEMP_DIR/"

# Step 4: Copy server files to temp directory
print_status "Copying server files..."
mkdir -p "$TEMP_DIR/server"
cp -r server/* "$TEMP_DIR/server/"

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

# Stop existing server if running
print_status "Stopping existing server..."
sudo systemctl stop brad-server 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true

# Create server directory
print_status "Setting up server directory..."
sudo mkdir -p /home/pi/brad-server
sudo chown pi:pi /home/pi/brad-server

# Copy server files
print_status "Installing server files..."
cp -r server/* /home/pi/brad-server/

# Install server dependencies
print_status "Installing server dependencies..."
cd /home/pi/brad-server
npm install --production

# Create systemd service for the backend
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/brad-server.service > /dev/null << 'SERVICE_EOF'
[Unit]
Description=Brad Backend Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/brad-server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5050

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Enable and start the service
print_status "Starting backend service..."
sudo systemctl daemon-reload
sudo systemctl enable brad-server
sudo systemctl start brad-server

# Check if service is running
if sudo systemctl is-active --quiet brad-server; then
    print_status "✅ Backend server is running on port 5050"
else
    print_error "❌ Failed to start backend server"
    sudo systemctl status brad-server
fi

# Copy frontend files to nginx directory
print_status "Deploying frontend to nginx..."
sudo cp -r * /var/www/html/
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

# Check if backend is running
if sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "sudo systemctl is-active --quiet brad-server"; then
    print_status "✅ Backend server is running"
else
    print_warning "⚠️  Backend server might not be running"
fi

# Check if nginx is serving the frontend
if sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost" | grep -q "200"; then
    print_status "✅ Frontend is being served by nginx"
else
    print_warning "⚠️  Frontend might not be accessible"
fi

echo ""
print_status "🎉 Deployment completed!"
echo ""
echo "📋 Application Details:"
echo "   Frontend: http://$PI_HOST (served by nginx)"
echo "   Backend: http://$PI_HOST:5050 (internal)"
echo ""
echo "🔧 Useful commands:"
echo "   Check backend status: ssh $PI_USER@$PI_HOST 'sudo systemctl status brad-server'"
echo "   View backend logs: ssh $PI_USER@$PI_HOST 'sudo journalctl -u brad-server -f'"
echo "   Restart backend: ssh $PI_USER@$PI_HOST 'sudo systemctl restart brad-server'"
echo "   Check nginx status: ssh $PI_USER@$PI_HOST 'sudo systemctl status nginx'"
echo "" 