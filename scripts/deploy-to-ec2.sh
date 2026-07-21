#!/bin/bash

# Nexus Messenger - EC2 Deployment Script
# Usage: ./scripts/deploy-to-ec2.sh <EC2_IP> <keypair_file>

set -e  # Exit on error

EC2_IP=$1
KEYPAIR=$2
USER="ubuntu"
APP_DIR="/home/ubuntu/messenger"

if [ -z "$EC2_IP" ] || [ -z "$KEYPAIR" ]; then
    echo "Usage: ./scripts/deploy-to-ec2.sh <EC2_IP> <keypair_file>"
    echo "Example: ./scripts/deploy-to-ec2.sh 54.123.45.67 ~/.ssh/my-key.pem"
    exit 1
fi

echo "🚀 Deploying Nexus to EC2..."
echo "📍 Target: $EC2_IP"

# Test SSH connection
echo "🔐 Testing SSH connection..."
ssh -i "$KEYPAIR" "$USER@$EC2_IP" "echo 'SSH connection successful'" || exit 1

# Build frontend
echo "📦 Building frontend..."
cd client
npm run build
cd ..

# Create deployment package
echo "📦 Creating deployment package..."
rm -f deployment.tar.gz
tar --exclude='node_modules' --exclude='.git' --exclude='deployment.tar.gz' -czf deployment.tar.gz .

# Upload to EC2
echo "📤 Uploading to EC2..."
scp -i "$KEYPAIR" deployment.tar.gz "$USER@$EC2_IP:~/deployment.tar.gz"

# Deploy on EC2
echo "🔧 Deploying on EC2..."
ssh -i "$KEYPAIR" "$USER@$EC2_IP" << 'EOF'
set -e

echo "📦 Extracting deployment package..."
cd /home/ubuntu
rm -rf messenger-backup
[ -d messenger ] && mv messenger messenger-backup
mkdir -p messenger
cd messenger
tar -xzf ../deployment.tar.gz
rm ../deployment.tar.gz

echo "📥 Installing dependencies..."
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

echo "🏗️ Building frontend..."
cd client
npm run build
cd ..

echo "📂 Setting up server public directory..."
rm -rf server/public
cp -r client/dist server/public

echo "✅ Deployment ready!"
echo ""
echo "📝 Next steps:"
echo "1. Create/update server/.env with production settings"
echo "2. Configure Nginx: https://yourdomain.com"
echo "3. Start with PM2: pm2 start server/index.js --name 'nexus-server'"
echo "4. Enable HTTPS with Let's Encrypt"
echo ""
echo "🎯 Check logs with: pm2 logs nexus-server"
EOF

# Cleanup
rm deployment.tar.gz

echo ""
echo "✅ Deployment complete!"
echo "📍 SSH into your EC2: ssh -i \"$KEYPAIR\" $USER@$EC2_IP"
echo "📂 App directory: $APP_DIR"
