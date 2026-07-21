# Nexus - Real-time Messaging App

A secure, real-time messaging application built with MERN stack and AWS services.

## Features

- 🔐 **Secure Authentication** — OTP-based login with JWT tokens
- 💬 **Real-time Messaging** — WebSocket-powered instant messaging via Socket.io
- 👥 **Contact Management** — Add, block, and manage contacts
- 📁 **File Sharing** — Upload files via AWS S3
- 🌐 **Online Status** — Real-time presence detection
- ✅ **Read Receipts** — Message delivery & read status
- 📱 **Responsive Design** — Works on desktop and mobile

## Tech Stack

**Frontend:**
- React (Vite)
- Socket.io-client
- TailwindCSS
- Axios

**Backend:**
- Node.js + Express
- AWS DynamoDB (NoSQL database)
- AWS S3 (file storage)
- AWS SES (email service)
- Socket.io (real-time communication)
- JWT (authentication)
- bcryptjs (password hashing)

**Infrastructure:**
- AWS DynamoDB (serverless database)
- AWS S3 (file storage)
- AWS SES (email)
- AWS EC2 (app hosting)
- PM2 (process management)

## Getting Started

### Prerequisites
- Node.js (v20+)
- AWS Account (DynamoDB, S3, SES configured)
- Git
- AWS CLI configured with credentials

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd messenger
```

2. Install dependencies:
```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

3. Configure environment:
```bash
cp server/.env.example server/.env
```

4. Update `server/.env`:
```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
DYNAMODB_USERS_TABLE=nexus-users
DYNAMODB_MESSAGES_TABLE=nexus-messages
DYNAMODB_CONVERSATIONS_TABLE=nexus-conversations
DYNAMODB_OTPS_TABLE=nexus-otps
JWT_SECRET=your-secret-key
SES_FROM_EMAIL=noreply@yourdomain.com
```

### Running Locally

```bash
# Run both client and server concurrently
npm run dev

# Or run separately
npm run dev:server  # Terminal 1
npm run dev:client  # Terminal 2
```

Access at: `http://localhost:5000` (server) or `http://localhost:5173` (client)

## Project Structure

```
messenger/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
├── server/              # Express backend
│   ├── models/         # DynamoDB models
│   ├── routes/         # API routes
│   ├── services/       # AWS services (DynamoDB, S3, SES)
│   ├── middleware/     # Auth, validation, etc
│   └── package.json
├── scripts/            # Migration and utility scripts
└── package.json        # Root dependencies
```

## Deployment to AWS EC2

### Prerequisites
- AWS EC2 instance (Ubuntu 26.04)
- Security group with ports 22, 80, 443, 5000 open
- SSH key pair (.pem file)

### Step-by-step Deployment

```bash
# 1. SSH to instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone repository
git clone <your-repo-url>
cd messenger

# 4. Install dependencies
npm install
cd server && npm install && cd ..

# 5. Configure environment
nano server/.env
# Add AWS credentials and table names

# 6. Install PM2
npm install -g pm2

# 7. Start server
pm2 start server/index.js --name "nexus-server"
pm2 startup
pm2 save

# 8. Start client (optional, for static serving)
cd client && npm run build && cd ..

# 9. Access app
# http://your-ec2-ip:5000
```

### Using PM2
```bash
# View logs
pm2 logs nexus-server

# Restart server
pm2 restart nexus-server

# Stop server
pm2 stop nexus-server
```

## License

ISC
