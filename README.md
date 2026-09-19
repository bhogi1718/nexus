# Nexus - Real-time Messaging App

A secure, real-time messaging application built with the MERN stack.

## Features

- 🔐 **Secure Authentication** — OTP-based login with JWT tokens
- 💬 **Real-time Messaging** — WebSocket-powered instant messaging via Socket.io
- 👥 **Contact Management** — Add, block, and manage contacts
- 📁 **File Sharing** — Upload files via Cloudinary
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
- MongoDB + Mongoose
- Cloudinary (file storage)
- Nodemailer via Gmail (OTP emails)
- Socket.io (real-time communication)
- JWT (authentication)

**Hosting:**
- Vercel (frontend)
- Render (backend API + WebSockets)
- MongoDB Atlas (database)

## Getting Started

### Prerequisites
- Node.js v20+
- MongoDB (local `mongod`, or a free MongoDB Atlas cluster)
- Cloudinary account (free tier is fine)
- Gmail account with an App Password (only needed for production OTP emails)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd nexus
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

4. Fill in `server/.env` — see the comments in `.env.example` for each value. Minimum for local dev:
```env
JWT_SECRET=<openssl rand -base64 32>
MONGODB_URI=mongodb://localhost:27017/nexus
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```
In development (`NODE_ENV` not `production`) the OTP is printed to the server console instead of being emailed, so Gmail credentials aren't required locally.

### Running Locally

```bash
# Run both client and server concurrently
npm run dev

# Or run separately
npm run dev:server  # Terminal 1  -> http://localhost:5000
npm run dev:client  # Terminal 2  -> http://localhost:5173
```

## Project Structure

```
nexus/
├── client/              # React frontend (deploys to Vercel)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── vercel.json
│   └── package.json
├── server/              # Express backend (deploys to Render)
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── services/       # db, cloudinaryStorage, emailOtpService, tokenService
│   ├── middleware/     # Auth, upload, logging
│   └── package.json
├── render.yaml          # Render blueprint for the API service
└── package.json         # Root dev scripts
```

## Deployment

### 1. MongoDB Atlas
Create a free cluster, add a database user, and allow access from anywhere (`0.0.0.0/0`) under Network Access (Render's outbound IPs are dynamic on the free plan). Copy the connection string as `MONGODB_URI`.

### 2. Cloudinary
From the dashboard copy **Cloud name**, **API Key** and **API Secret**.

### 3. Gmail App Password
Enable 2-Step Verification on the Google account, then create an App Password at https://myaccount.google.com/apppasswords. Use the account email as `GMAIL_USER` and the 16-character password as `GMAIL_APP_PASSWORD`.

### 4. Backend on Render
- New → **Blueprint**, point it at this repo; it picks up `render.yaml`.
  (Or New → Web Service manually: Root Directory `server`, Build `npm install`, Start `npm start`.)
- Fill in the env vars marked `sync: false`: `MONGODB_URI`, `CLOUDINARY_*`, `GMAIL_*`.
- Set `CLIENT_URL` and `CORS_ORIGINS` to your Vercel URL(s) once you have them, e.g.
  `CORS_ORIGINS=https://nexus.vercel.app,https://nexus-git-main-you.vercel.app`.
- Note the service URL, e.g. `https://nexus-api.onrender.com`.

### 5. Frontend on Vercel
- Import the repo, set **Root Directory** to `client` (framework auto-detects as Vite).
- Add environment variable `VITE_API_URL=https://<your-render-service>.onrender.com/api`.
- Deploy. Then go back to Render and add the Vercel domain to `CORS_ORIGINS` if you haven't.

Render's free tier spins the API down after inactivity; the first request after idle can take ~30–60s.

## License

ISC
