#!/bin/bash

# Deploy brad app to Raspberry Pi
# Usage: ./deploy_to_pi.sh

PI_HOST="pi@192.168.31.27"
PI_PASS="pi911"
PI_WWW="/var/www/html"
PI_APP_DIR="/home/pi/brad"

echo "🚀 Deploying brad app to Raspberry Pi..."

# Create remote directories
echo "📁 Creating remote directories..."
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no $PI_HOST "sudo mkdir -p $PI_WWW && sudo chown pi:pi $PI_WWW"

# Upload frontend build
echo "📤 Uploading frontend build..."
sshpass -p "$PI_PASS" scp -o StrictHostKeyChecking=no -r build/* $PI_HOST:$PI_WWW/

# Upload backend
echo "📤 Uploading backend..."
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no $PI_HOST "mkdir -p $PI_APP_DIR"
sshpass -p "$PI_PASS" scp -o StrictHostKeyChecking=no -r server/* $PI_HOST:$PI_APP_DIR/

# Install backend dependencies on Pi
echo "📦 Installing backend dependencies..."
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no $PI_HOST "cd $PI_APP_DIR && npm install"

# Create systemd service for backend
echo "🔧 Setting up backend service..."
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no $PI_HOST "sudo tee /etc/systemd/system/brad-backend.service > /dev/null << 'EOF'
[Unit]
Description=Brad Backend Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=$PI_APP_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5050

[Install]
WantedBy=multi-user.target
EOF"

# Enable and restart the service
echo "🔄 Enabling and starting backend service..."
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no $PI_HOST "sudo systemctl daemon-reload && sudo systemctl enable brad-backend && sudo systemctl restart brad-backend"

# Configure nginx
echo "🌐 Configuring nginx..."
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no $PI_HOST "sudo tee /etc/nginx/sites-available/brad > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    root $PI_WWW;
    index index.html;

    # Serve static files
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
EOF"

# Enable the site and restart nginx
echo "🔄 Enabling nginx site and restarting..."
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no $PI_HOST "sudo ln -sf /etc/nginx/sites-available/brad /etc/nginx/sites-enabled/ && sudo rm -f /etc/nginx/sites-enabled/default && sudo systemctl restart nginx"

# Check service status
echo "📊 Checking service status..."
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no $PI_HOST "sudo systemctl status brad-backend --no-pager -l"

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://192.168.31.27"
echo "🔧 Backend: http://192.168.31.27:5050"
echo "📋 To check logs: sshpass -p '$PI_PASS' ssh $PI_HOST 'sudo journalctl -u brad-backend -f'" 