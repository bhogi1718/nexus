# Nexus Messenger - EC2 Deployment Guide

## 📋 Prerequisites

Before starting, you need:
- AWS Account
- EC2 instance (Ubuntu 22.04 LTS recommended)
- Domain name (optional, for SSL)
- MongoDB Atlas cluster (already have this)
- AWS SES verified email (for OTP)
- AWS S3 bucket (for file uploads)
- AWS IAM role with S3 and SES permissions

---

## 🚀 Step 1: Launch EC2 Instance

### A. Create the Instance

1. **Go to AWS Console** → EC2 → Instances → Launch Instance
2. **Choose AMI:** Ubuntu Server 22.04 LTS (free tier eligible)
3. **Instance Type:** t2.micro (free tier) or t2.small (recommended)
4. **Configure Security Group:**
   - Port 22 (SSH) - your IP only
   - Port 80 (HTTP) - anywhere
   - Port 443 (HTTPS) - anywhere
   - Port 5000 (optional, for testing) - your IP only
5. **Create/use keypair:** Save the `.pem` file securely
6. **Launch**

### B. Connect to Instance

```bash
# On your local machine
chmod 400 your-keypair.pem
ssh -i your-keypair.pem ubuntu@your-ec2-public-ip
```

---

## 🛠️ Step 2: Install Dependencies on EC2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Verify installations
node --version
npm --version
pm2 --version
nginx --version
```

---

## 📦 Step 3: Clone & Setup Application

```bash
# Clone your repo
cd /home/ubuntu
git clone https://github.com/YOUR-USERNAME/messenger.git
cd messenger

# Install dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

---

## 🔐 Step 4: Configure Environment Variables

### A. Create production .env file

```bash
nano server/.env
```

**Content for production:**
```env
PORT=5000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nexus?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# AWS (use EC2 IAM role - don't need keys if role is attached)
AWS_REGION=us-east-1
AWS_S3_BUCKET=nexus-files-charan
AWS_SES_EMAIL=your-verified-ses-email@example.com

# CORS - point to your domain
CLIENT_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Save:** Ctrl+X → Y → Enter

---

## 🏗️ Step 5: Build Frontend

```bash
# Build React client
cd client
npm run build
cd ..

# Copy build to server
cp -r client/dist server/public
```

---

## 🌐 Step 6: Configure Nginx (Reverse Proxy)

```bash
# Backup original config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

# Edit Nginx config
sudo nano /etc/nginx/sites-available/default
```

**Replace content with:**
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL is set up)
    # return 301 https://$server_name$request_uri;

    # Serve built React app
    root /home/ubuntu/messenger/server/public;
    index index.html;

    # API proxy to Node.js
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for Socket.io
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback: route all other requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Save:** Ctrl+X → Y → Enter

**Test & restart Nginx:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🚀 Step 7: Start Application with PM2

```bash
cd /home/ubuntu/messenger

# Start the server with PM2
pm2 start server/index.js --name "nexus-server"

# Make it restart on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs nexus-server
```

---

## 🔒 Step 8: Enable HTTPS (SSL Certificate)

### Option A: Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Update Nginx to use SSL
sudo nano /etc/nginx/sites-available/default
```

**Add these lines at the top:**
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... rest of config (same as before)
}
```

**Restart Nginx:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Option B: Using AWS Certificate Manager (if using Route53)

(Covered in separate AWS section)

---

## 📊 Step 9: Monitor & Maintain

### Check logs in real-time
```bash
pm2 logs nexus-server
```

### Monitor performance
```bash
pm2 monit
```

### Check Nginx logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart if needed
```bash
pm2 restart nexus-server
```

---

## 🛡️ Step 10: Security Hardening

### Firewall rules
```bash
# Only allow necessary ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Disable password auth (use keys only)
```bash
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

### Auto-update security patches
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📱 Step 11: Update Client Config

Update frontend API URL to point to your domain:

```bash
# Edit client .env
echo "VITE_API_URL=https://yourdomain.com/api" > client/.env.production

# Rebuild
cd client && npm run build && cd ..
cp -r client/dist server/public
```

---

## ✅ Deployment Checklist

- [ ] EC2 instance launched and SSH access working
- [ ] All dependencies installed (Node, Git, PM2, Nginx)
- [ ] Server `.env` configured with production values
- [ ] Frontend built and copied to `server/public`
- [ ] Nginx configured as reverse proxy
- [ ] Application running with PM2
- [ ] HTTPS certificate installed
- [ ] Firewall rules configured
- [ ] Domain name points to EC2 IP
- [ ] Monitor logs for errors

---

## 🚨 Troubleshooting

### Port 80/443 already in use
```bash
sudo lsof -i :80
sudo kill -9 <PID>
```

### PM2 not starting
```bash
pm2 delete nexus-server
pm2 start server/index.js --name "nexus-server"
pm2 save
```

### Nginx returning 502 Bad Gateway
- Check if Node.js is running: `pm2 status`
- Check firewall: `sudo ufw status`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### MongoDB connection fails
- Verify MONGODB_URI in `.env`
- Check MongoDB Atlas IP whitelist (allow EC2 security group)

### S3 file uploads failing
- Verify IAM role attached to EC2 instance
- Check S3 bucket policy allows IAM role

---

## 📈 Production URLs

After deployment:
- **Frontend:** `https://yourdomain.com`
- **API:** `https://yourdomain.com/api`
- **WebSocket:** `wss://yourdomain.com/socket.io`

---

## 🔄 Continuous Deployment (Optional)

To auto-deploy on git push:

```bash
# Create deploy script
nano /home/ubuntu/deploy.sh
```

```bash
#!/bin/bash
cd /home/ubuntu/messenger
git pull origin main
npm install
cd client && npm run build && cd ..
cp -r client/dist server/public
pm2 restart nexus-server
```

Give it execute permissions:
```bash
chmod +x /home/ubuntu/deploy.sh
```

---

## 💡 Tips

1. **Always backup .env** - Don't commit it to git
2. **Use PM2 for auto-restart** - App survives server crashes
3. **Monitor disk space** - S3 uploads take space initially
4. **Enable CloudWatch** - Monitor EC2 metrics
5. **Set up alerts** - Get notified if app crashes

---

**You're ready to deploy! 🚀**
