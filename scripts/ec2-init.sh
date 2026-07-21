#!/bin/bash

# Nexus Messenger - EC2 Initialization Script
# Run this on a fresh EC2 instance to set up everything

set -e

echo "🚀 Initializing EC2 for Nexus Messenger..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📥 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
echo "📥 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📥 Installing Nginx..."
sudo apt install -y nginx

# Install Git
echo "📥 Installing Git..."
sudo apt install -y git

# Install Certbot for SSL
echo "📥 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Install unattended-upgrades for auto-patching
echo "🔒 Setting up auto-updates..."
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Create app directory
echo "📁 Creating app directory..."
mkdir -p /home/ubuntu/messenger
cd /home/ubuntu/messenger

# Setup PM2 to start on boot
echo "⚙️ Configuring PM2 startup..."
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo pm2 save

echo ""
echo "✅ EC2 initialization complete!"
echo ""
echo "📝 Next steps:"
echo "1. Clone your repo: git clone https://github.com/username/messenger.git /home/ubuntu/messenger"
echo "2. Create .env file: nano /home/ubuntu/messenger/server/.env"
echo "3. Install dependencies: cd /home/ubuntu/messenger && npm install"
echo "4. Build frontend: npm run build:client"
echo "5. Start server: pm2 start server/index.js --name 'nexus-server'"
echo ""
echo "🌐 Nginx configuration will be updated after domain setup"
echo "🔒 SSL certificate will be set up with Let's Encrypt"
echo ""
echo "📊 Check system info:"
echo "  Node version: $(node --version)"
echo "  NPM version: $(npm --version)"
echo "  PM2 version: $(pm2 --version)"
echo "  Nginx version: $(nginx -v 2>&1)"
