# Nexus

**Nexus** is a real-time messaging application built with the MERN stack (MongoDB, Express, React, Node.js).

## Features

- 🔐 **User Authentication** — Secure registration & login with JWT
- 💬 **Real-time Messaging** — Instant message delivery via WebSockets (Socket.io)
- 👥 **Group Chats** — Create and manage group conversations
- 📎 **Media Sharing** — Share images, videos, and documents
- ✅ **Read Receipts** — Message delivery & read status
- 🔔 **Notifications** — Push notifications for new messages
- 🎥 **Voice/Video Calls** — Audio and video calling (P2P with WebRTC)
- 🔍 **Search** — Find messages and contacts
- 🔒 **End-to-End Encryption** — Secure messaging (Phase 8+)

## Tech Stack

**Frontend:**
- React (Vite)
- Socket.io-client
- Axios

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- Socket.io
- JWT (JSON Web Tokens)
- bcryptjs

**Infrastructure:**
- Docker & Docker Compose
- AWS (Elastic Beanstalk, S3, ElastiCache)
- Redis (caching & real-time features)

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- Git

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd messenger
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` files in `/server` and `/client`:
```bash
cp server/.env.example server/.env
cp .env.example .env
```

4. Update `.env` with your MongoDB URI and other config

### Running Locally

```bash
# Run both client and server concurrently
npm run dev

# Or run separately
npm run dev:server  # Terminal 1
npm run dev:client  # Terminal 2
```

The app will be available at `http://localhost:5173` (client) and `http://localhost:5000` (server).

## Project Structure

```
nexus/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── services/
│   └── package.json
├── server/              # Express backend
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   ├── config/
│   └── package.json
└── ROADMAP.md           # Development phases
```

## Development Roadmap

See [ROADMAP.md](ROADMAP.md) for the complete step-by-step build phases (Phase 0–12).

## Deployment

Deployment to AWS Elastic Beanstalk (with Docker) is planned after full development completion.

## License

ISC
