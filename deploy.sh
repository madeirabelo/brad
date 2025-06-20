#!/bin/bash

# Configuration
RASPBERRY_PI="pi@192.168.31.27"
#RASPBERRY_PI="pi@brad"
NGINX_DIR="/var/www/html"
APP_DIR="brad"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting deployment...${NC}"

# Create necessary directories on Raspberry Pi
echo "Creating directories on Raspberry Pi..."
ssh $RASPBERRY_PI "sudo mkdir -p $NGINX_DIR/$APP_DIR"
ssh $RASPBERRY_PI "sudo mkdir -p $NGINX_DIR/$APP_DIR/server"

# Copy frontend build
echo "Copying frontend build..."
scp -r build/* $RASPBERRY_PI:$NGINX_DIR/$APP_DIR/

# Copy backend files
echo "Copying backend files..."
scp -r server/* $RASPBERRY_PI:$NGINX_DIR/$APP_DIR/server/

# Copy package files
echo "Copying package files..."
scp package.json package-lock.json $RASPBERRY_PI:$NGINX_DIR/$APP_DIR/

# Copy management script
echo "Copying management script..."
scp manage.sh $RASPBERRY_PI:$NGINX_DIR/$APP_DIR/

# Set up backend on Raspberry Pi
echo "Setting up backend..."
ssh $RASPBERRY_PI "cd $NGINX_DIR/$APP_DIR && \
    sudo npm install && \
    sudo chown -R www-data:www-data $NGINX_DIR/$APP_DIR && \
    sudo chmod -R 755 $NGINX_DIR/$APP_DIR"

# Create systemd service for the backend
echo "Creating systemd service..."
ssh $RASPBERRY_PI "sudo tee /etc/systemd/system/brad.service << 'EOL'
[Unit]
Description=Brad Chess Game Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$NGINX_DIR/$APP_DIR
ExecStart=/usr/bin/node server/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL"

# Reload systemd and start the service
echo "Starting backend service..."
ssh $RASPBERRY_PI "sudo systemctl daemon-reload && \
    sudo systemctl enable brad && \
    sudo systemctl restart brad"

# Configure NGINX
echo "Configuring NGINX..."
ssh $RASPBERRY_PI "sudo tee /etc/nginx/sites-available/brad << 'EOL'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root $NGINX_DIR/$APP_DIR;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL"

# Enable the site and restart NGINX
echo "Enabling site and restarting NGINX..."
ssh $RASPBERRY_PI "sudo ln -sf /etc/nginx/sites-available/brad /etc/nginx/sites-enabled/ && \
    sudo nginx -t && \
    sudo systemctl restart nginx"

echo -e "${GREEN}Deployment completed!${NC}"
echo "The application should now be accessible at http://192.168.31.27" 