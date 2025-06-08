#!/bin/bash

# Build the React app
echo "Building React app..."
npm run build

# Raspberry Pi details
RASPBERRY_PI_USER="pi"
RASPBERRY_PI_IP="192.168.31.27"
RASPBERRY_PI_PATH="/var/www/html"
RASPBERRY_PI_PASSWORD="pi911"

# Transfer the build files to Raspberry Pi using sshpass
echo "Transferring files to Raspberry Pi..."
sshpass -p "$RASPBERRY_PI_PASSWORD" scp -r build/* $RASPBERRY_PI_USER@$RASPBERRY_PI_IP:$RASPBERRY_PI_PATH

# Copy Nginx configuration
echo "Copying Nginx configuration..."
sshpass -p "$RASPBERRY_PI_PASSWORD" scp nginx.conf $RASPBERRY_PI_USER@$RASPBERRY_PI_IP:/tmp/react-app.conf

# Set up Nginx configuration on Raspberry Pi
echo "Setting up Nginx configuration..."
sshpass -p "$RASPBERRY_PI_PASSWORD" ssh $RASPBERRY_PI_USER@$RASPBERRY_PI_IP "sudo mv /tmp/react-app.conf /etc/nginx/sites-available/react-app && \
    sudo ln -sf /etc/nginx/sites-available/react-app /etc/nginx/sites-enabled/ && \
    sudo nginx -t && \
    sudo systemctl restart nginx && \
    sudo chown -R www-data:www-data $RASPBERRY_PI_PATH && \
    sudo chmod -R 755 $RASPBERRY_PI_PATH"

echo "Deployment complete!" 