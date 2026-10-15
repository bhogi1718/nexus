# Nexus

A real-time messaging app with **end-to-end encrypted private chats**, built on the MERN stack.

Messages are encrypted on the sender's device using the same building blocks as the Signal protocol (X3DH key agreement and the Double Ratchet), so the server only ever stores and relays ciphertext. Everything else you expect from a modern messenger is there too: live delivery, read ticks, presence, contacts, file sharing and an installable PWA.

## Features

### Messaging
- **Real-time chat** over Socket.io, with typing indicators and instant delivery
- **Delivery and read receipts:** sent, delivered and read ticks on every message
- **Online status and last seen**, updated live
- **Contacts:** add, remove, set nicknames, view contact profiles
- **File sharing:** images and documents uploaded through Cloudinary, with in-app previews
- **Installable PWA** with a responsive layout for mobile, tablet and desktop

### Security and privacy
- **End-to-end encryption for text messages in private chats.** Only the two people in a chat can read them, not even the server.
- **Safety numbers:** compare a short code with a contact to confirm nobody is in the middle
- **Key-change warnings:** if a contact's identity key changes, the chat says so and asks you to re-verify
- **Passwordless sign-in** with one-time email codes, stored hashed, with attempt limits and temporary account lockout
- **Rate limiting** on code requests, code verification and the general API
- **Privacy controls:** turn off read receipts or hide your last seen and online status. Like WhatsApp, the setting works both ways.

## How the encryption works

| Piece | What it does |
|---|---|
| **Identity keys** | Each device creates an X25519 key (for key agreement) and an Ed25519 key (for signing). Private keys never leave the device; only the public bundle is uploaded. |
| **Prekeys** | A signed prekey plus a batch of one-time prekeys are published to the server and topped up automatically when they run low. |
| **X3DH** | Starting a chat fetches the contact's prekey bundle, verifies the signature, and derives a shared secret, even if they're offline. |
| **Double Ratchet** | Every message gets a fresh key. Old keys are destroyed after use, so a key stolen today can't decrypt past messages. |
| **Safety numbers** | Derived from both people's identity keys. Matching numbers on both phones means the keys haven't been swapped. |

Primitives come from TweetNaCl (X25519, Ed25519, XSalsa20-Poly1305) and WebCrypto (HKDF, HMAC). Keys and session state are kept in the browser's IndexedDB. The protocol has unit tests with test vectors in `client/src/crypto/__tests__`.

**Scope, stated plainly:** text in one-to-one chats is end-to-end encrypted. File attachments are uploaded to Cloudinary over HTTPS but are not end-to-end encrypted. Encryption keys are per browser, so signing in on a new device starts fresh sessions.

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React (Vite), Tailwind CSS, Socket.io client, Axios, TweetNaCl, idb-keyval |
| Backend | Node.js, Express, Socket.io, MongoDB with Mongoose, JWT, express-rate-limit |
| Services | Cloudinary (files), Nodemailer over Gmail (sign-in codes) |
| Hosting | Vercel (frontend), Render (API + WebSockets), MongoDB Atlas |
| Testing | Vitest |

## Getting started

### Prerequisites
- Node.js v20+
- MongoDB (local `mongod`, or a free MongoDB Atlas cluster)
- Cloudinary account (free tier is fine)
- Gmail account with an App Password (only needed for production sign-in emails)

### Install

```bash
git clone https://github.com/bhogi1718/nexus.git
cd nexus
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### Configure

```bash
cp server/.env.example server/.env
```

Fill in `server/.env` (each value is explained in `.env.example`). Minimum for local development:

```env
JWT_SECRET=<openssl rand -base64 32>
MONGODB_URI=mongodb://localhost:27017/nexus
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

In development (`NODE_ENV` not `production`) the sign-in code is printed to the server console instead of being emailed, so Gmail credentials aren't needed locally.

### Run

```bash
npm run dev          # client and server together

# or separately
npm run dev:server   # http://localhost:5000
npm run dev:client   # http://localhost:5173
```

### Test

```bash
cd client
npx vitest run       # crypto primitives, X3DH / Double Ratchet, session manager
```

## Project structure

```
nexus/
├── client/                 # React frontend (deploys to Vercel)
│   └── src/
│       ├── crypto/         # X3DH, Double Ratchet, envelopes, session manager, key store
│       ├── components/     # chat UI, settings, contact info, design-system primitives
│       ├── context/        # auth and theme
│       ├── hooks/          # sockets, conversations, messages
│       ├── pages/          # landing, login, signup, chat
│       └── services/       # API and socket clients
├── server/                 # Express backend (deploys to Render)
│   ├── controllers/        # auth, chat, keys
│   ├── models/             # User, Conversation, Message, OTP
│   ├── routes/             # /auth, /chat, /keys
│   ├── services/           # sign-in codes, receipts, presence privacy, Cloudinary, realtime
│   └── middleware/         # auth, uploads, logging
├── render.yaml             # Render blueprint for the API service
└── package.json            # root dev scripts
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
- Set `CLIENT_URL` and `CORS_ORIGINS` to your Vercel URL(s), e.g.
  `CORS_ORIGINS=https://nexus.vercel.app,https://nexus-git-main-you.vercel.app`.

### 5. Frontend on Vercel
- Import the repo and set **Root Directory** to `client` (Vite is auto-detected).
- Add `VITE_API_URL=https://<your-render-service>.onrender.com/api`.
- Deploy, then add the Vercel domain to `CORS_ORIGINS` on Render if you haven't.

Render's free tier spins the API down after inactivity, so the first request after idle can take 30 to 60 seconds.

## License

ISC
