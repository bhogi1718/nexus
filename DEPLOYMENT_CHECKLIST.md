# Nexus Messenger - Deployment Checklist

## 📋 Pre-Deployment (Local)

- [ ] **Code Review**
  - [ ] All security fixes applied and tested
  - [ ] No console.error or console.log in production code
  - [ ] No hardcoded credentials in code
  - [ ] No `.env` file committed to git

- [ ] **Frontend Build**
  - [ ] Run `npm run build:client` successfully
  - [ ] Build output in `client/dist`
  - [ ] No build warnings or errors

- [ ] **Dependencies**
  - [ ] All npm packages up to date
  - [ ] No security vulnerabilities: `npm audit`
  - [ ] Lock files committed to git

- [ ] **Environment Files**
  - [ ] `.env.production.example` created
  - [ ] `.gitignore` includes `.env`
  - [ ] Production values documented

---

## 🌐 AWS Preparation

### Networking & DNS
- [ ] **Domain Registered**
  - [ ] Domain name purchased
  - [ ] DNS records accessible

- [ ] **Route53 Setup (if using AWS DNS)**
  - [ ] A record pointing to EC2 Elastic IP
  - [ ] Domain health check working

### Database
- [ ] **MongoDB Atlas**
  - [ ] Cluster created and running
  - [ ] IP whitelist includes EC2 security group
  - [ ] Database user created with strong password
  - [ ] MONGODB_URI tested locally

### Storage
- [ ] **S3 Bucket**
  - [ ] Bucket created in correct region
  - [ ] Bucket policy allows file uploads
  - [ ] CORS configured for your domain
  - [ ] S3_BUCKET name correct in config

### Email
- [ ] **AWS SES**
  - [ ] Email address verified in SES
  - [ ] Sender email configured
  - [ ] No sandbox restrictions (or test emails whitelisted)

### Security & Access
- [ ] **IAM Role**
  - [ ] EC2 IAM role created
  - [ ] Role has S3 permissions
  - [ ] Role has SES permissions
  - [ ] Role attached to EC2 instance

- [ ] **Security Groups**
  - [ ] Inbound rule: SSH (22) from your IP
  - [ ] Inbound rule: HTTP (80) from anywhere
  - [ ] Inbound rule: HTTPS (443) from anywhere
  - [ ] No port 5000 open to public

---

## 🖥️ EC2 Instance Setup

### Instance Creation
- [ ] **EC2 Instance Launched**
  - [ ] OS: Ubuntu 22.04 LTS
  - [ ] Instance Type: t2.micro or t2.small
  - [ ] Assigned Elastic IP
  - [ ] Keypair `.pem` file saved securely
  - [ ] IAM role attached

### Initial Configuration
- [ ] **SSH Connection**
  - [ ] Can SSH into instance: `ssh -i key.pem ubuntu@IP`
  - [ ] System updated: `apt update && apt upgrade`
  - [ ] Firewall enabled: `ufw enable`

- [ ] **Dependencies Installed**
  - [ ] Node.js 18+ installed: `node --version`
  - [ ] npm 8+ installed: `npm --version`
  - [ ] Git installed: `git --version`
  - [ ] PM2 installed globally: `pm2 --version`
  - [ ] Nginx installed: `nginx -v`
  - [ ] Certbot installed: `certbot --version`

---

## 📦 Application Deployment

### Code Deployment
- [ ] **Repository Cloned**
  - [ ] Code in `/home/ubuntu/messenger`
  - [ ] Correct branch checked out
  - [ ] No uncommitted changes

- [ ] **Dependencies Installed**
  - [ ] Root `npm install` successful
  - [ ] `server/npm install` successful
  - [ ] `client/npm install` successful
  - [ ] No critical vulnerabilities

### Configuration
- [ ] **Environment File Created**
  - [ ] File: `/home/ubuntu/messenger/server/.env`
  - [ ] NODE_ENV=production
  - [ ] MONGODB_URI set and tested
  - [ ] JWT_SECRET changed (40+ chars random)
  - [ ] AWS_S3_BUCKET set
  - [ ] AWS_SES_EMAIL set
  - [ ] CLIENT_URL set to your domain
  - [ ] CORS_ORIGINS set correctly

- [ ] **Frontend Built**
  - [ ] `npm run build:client` completed
  - [ ] Build copied to `server/public`
  - [ ] No build errors

### Server Startup
- [ ] **PM2 Configured**
  - [ ] App started: `pm2 start server/index.js --name "nexus-server"`
  - [ ] Status shows "online": `pm2 status`
  - [ ] Startup script generated: `pm2 startup`
  - [ ] Config saved: `pm2 save`
  - [ ] Logs accessible: `pm2 logs nexus-server`

- [ ] **Server Responding**
  - [ ] Health check: `curl http://localhost:5000`
  - [ ] API responding: `curl http://localhost:5000/api/users/online`
  - [ ] No errors in PM2 logs

---

## 🌍 Web Server & Domain

### Nginx Configuration
- [ ] **Config File Updated**
  - [ ] File: `/etc/nginx/sites-available/default`
  - [ ] Based on `nginx.conf.example`
  - [ ] Domain name set
  - [ ] API proxy configured
  - [ ] Socket.io proxy configured
  - [ ] SPA fallback configured

- [ ] **Nginx Tested**
  - [ ] Config valid: `sudo nginx -t`
  - [ ] Restarted: `sudo systemctl restart nginx`
  - [ ] Status active: `sudo systemctl status nginx`
  - [ ] Logs checked: `sudo tail -f /var/log/nginx/error.log`

### Domain & DNS
- [ ] **Domain Pointing to EC2**
  - [ ] DNS updated to point to EC2 Elastic IP
  - [ ] DNS propagation complete (check with `nslookup`)
  - [ ] Can access site: `curl http://yourdomain.com`

- [ ] **HTTP Working**
  - [ ] Site accessible via HTTP
  - [ ] Frontend loads
  - [ ] API calls work
  - [ ] WebSocket connects (check DevTools)

---

## 🔒 SSL/HTTPS Setup

### Certificate Generation
- [ ] **Let's Encrypt Certificate**
  - [ ] Generated: `sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com`
  - [ ] Certificate valid: check `/etc/letsencrypt/live/yourdomain.com/`
  - [ ] Renewal scheduled (auto-renewal enabled)

### Nginx HTTPS Configuration
- [ ] **Nginx Updated for HTTPS**
  - [ ] SSL directives uncommented
  - [ ] Certificate paths correct
  - [ ] Config valid: `sudo nginx -t`
  - [ ] Restarted: `sudo systemctl restart nginx`

### HTTPS Validation
- [ ] **HTTPS Working**
  - [ ] Can access: `https://yourdomain.com`
  - [ ] Certificate valid (no warnings in browser)
  - [ ] Redirect from HTTP to HTTPS working
  - [ ] API calls over HTTPS
  - [ ] WebSocket over WSS

---

## 🧪 Testing & Validation

### Functionality Testing
- [ ] **Auth Flow**
  - [ ] Signup works (OTP via console in dev or email in prod)
  - [ ] Login works
  - [ ] Token refresh works (keep app open 1hr+ to test)
  - [ ] Logout works

- [ ] **Messaging**
  - [ ] Can send messages
  - [ ] Messages appear in real-time
  - [ ] Read receipts work
  - [ ] Typing indicators work

- [ ] **File Upload**
  - [ ] Can upload files
  - [ ] Files appear in S3
  - [ ] Can download files
  - [ ] File links work

- [ ] **Contacts**
  - [ ] Can add contacts by email
  - [ ] Can start conversations
  - [ ] Online status updates
  - [ ] Status messages display

### Performance Testing
- [ ] **Load Testing**
  - [ ] Site responds quickly
  - [ ] No obvious bottlenecks
  - [ ] Check Nginx logs for errors
  - [ ] Monitor server resources: `top`, `free -h`

### Security Testing
- [ ] **SSL Grade**
  - [ ] SSLLabs A grade or better
  - [ ] HSTS header present
  - [ ] Security headers present

- [ ] **HTTPS Redirect**
  - [ ] HTTP → HTTPS redirect working
  - [ ] All assets load over HTTPS
  - [ ] Mixed content warnings: none

---

## 📊 Monitoring & Maintenance

### Logging
- [ ] **PM2 Logs**
  - [ ] Checked for errors
  - [ ] No critical errors on startup
  - [ ] Rotation enabled for old logs

- [ ] **Nginx Logs**
  - [ ] Access log format configured
  - [ ] Error log monitored
  - [ ] Rotation configured

- [ ] **Application Logs**
  - [ ] Structured JSON logging working
  - [ ] Request audit trail active
  - [ ] Rate limiting logs visible

### Automated Tasks
- [ ] **Auto-restart**
  - [ ] PM2 restart on reboot: `pm2 startup`
  - [ ] Node process restart on crash (PM2 handles)

- [ ] **Auto-update**
  - [ ] Unattended-upgrades configured
  - [ ] Security patches install automatically

- [ ] **Certificate Renewal**
  - [ ] Certbot auto-renewal enabled
  - [ ] Renewal cron job active

### Backups
- [ ] **Database**
  - [ ] MongoDB Atlas automated backups enabled
  - [ ] Backup retention policy set

- [ ] **Code**
  - [ ] Git repository backed up
  - [ ] All commits pushed to remote

- [ ] **Files**
  - [ ] S3 versioning enabled
  - [ ] S3 lifecycle policies configured

---

## 🚨 Troubleshooting Runbook

### If App Won't Start
1. Check PM2 logs: `pm2 logs nexus-server`
2. Check .env file: `cat server/.env`
3. Check MongoDB connection: `curl -v http://localhost:5000`
4. Restart: `pm2 restart nexus-server`

### If Site Won't Load
1. Check Nginx: `sudo systemctl status nginx`
2. Check config: `sudo nginx -t`
3. Check logs: `sudo tail -f /var/log/nginx/error.log`
4. Check Node process: `pm2 status`

### If HTTPS Fails
1. Check certificate: `sudo certbot certificates`
2. Check Nginx config SSL section
3. Check firewall port 443: `sudo ufw status`

### If WebSocket Won't Connect
1. Check Socket.io proxy in Nginx
2. Check firewall: `sudo ufw status`
3. Check PM2 logs for connection errors

---

## ✅ Final Sign-Off

- [ ] All checklist items completed
- [ ] All tests passing
- [ ] No critical errors in logs
- [ ] Performance acceptable
- [ ] Monitoring active
- [ ] Backups configured
- [ ] Team notified of deployment

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Notes:** _________________________________________________

---

## 📚 Quick Reference

**SSH into server:**
```bash
ssh -i key.pem ubuntu@ec2-ip
```

**View logs:**
```bash
pm2 logs nexus-server
```

**Restart app:**
```bash
pm2 restart nexus-server
```

**Restart Nginx:**
```bash
sudo systemctl restart nginx
```

**View processes:**
```bash
pm2 status
```

**Renew certificate:**
```bash
sudo certbot renew --force-renewal
```

---

Good luck! 🚀
