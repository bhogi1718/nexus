# WhatsApp-Clone (MERN) — Step-by-Step Build Roadmap

## Context
Fresh project. Goal: build a WhatsApp-like messaging app using MERN (MongoDB, Express, React, Node.js). Deployment (Docker + AWS Elastic Beanstalk) happens only after the full app is built.

## Prerequisites to Install
- **Node.js (LTS)** — includes npm
- **Git**
- **VS Code**
- **MongoDB Atlas account** (free tier, no local install needed) — or local MongoDB Community Server
- **Postman** — for testing APIs as you build
- Optional now, needed later: **MongoDB Compass** (DB GUI), **Redis** (via Upstash free tier or Docker, needed from Phase 3 onward)
- Not needed until deployment: Docker, AWS account/CLI, Elasticsearch, Kubernetes

## Recommended Build Order

### Phase 0 — Project Setup
1. `git init`, create `.gitignore`, set up monorepo structure: `/client` (React) and `/server` (Node/Express).
2. Initialize server: Express app, `nodemon`, `dotenv`, folder structure (`routes/`, `controllers/`, `models/`, `middleware/`, `config/`).
3. Initialize client: React (Vite recommended over CRA for speed), folder structure (`components/`, `pages/`, `hooks/`, `context/` or `store/`, `services/`).
4. Set up MongoDB (Atlas or local) and confirm connection.
5. Set up ESLint + Prettier on both client and server.

### Phase 1 — Auth & User Foundation
1. User model (Mongoose): name, email, password hash, avatar, status, contacts.
2. Register/Login/Logout endpoints with JWT (access + refresh token pattern).
3. Password hashing with bcrypt.
4. Auth middleware to protect routes.
5. Client: signup/login pages, auth context, protected route wrapper, token storage (httpOnly cookie preferred over localStorage for security).

### Phase 2 — Core Chat Data Model & REST APIs
1. Models: `Conversation` (1:1 and group), `Message` (text, media, sender, conversation ref, timestamps, read receipts), `Contact`.
2. REST endpoints: create conversation, fetch conversations list, fetch messages (paginated), send message (fallback to REST before real-time is added), search users/contacts.
3. Client: conversation list UI, chat window UI, message input — wired to REST first (no real-time yet) to validate data flow end-to-end.

### Phase 3 — Real-Time Messaging
1. Integrate Socket.io on server (auth handshake using JWT).
2. Events: message:send, message:receive, typing:start/stop, user:online/offline, message:read.
3. Client: Socket.io-client integration, live message updates, typing indicators, online/offline presence.
4. Redis for: Socket.io adapter (multi-instance pub/sub), online user tracking, session/cache store.

### Phase 4 — Media & Rich Messaging
1. File upload handling with Multer → temp storage → forward to cloud storage (S3 or Cloudinary).
2. Image compression/optimization (Sharp) before upload.
3. Support image/video/document message types in the Message model and UI.
4. Voice notes (record in-browser, upload as audio blob).

### Phase 5 — Group Chats & Advanced Features
1. Group conversation creation, add/remove members, admin roles.
2. Message read receipts (double-tick equivalent) and delivery status.
3. Message search (start simple with MongoDB text index; consider Elasticsearch only if scale demands it later).
4. Contact/user blocking, last-seen privacy settings.

### Phase 6 — Calls (Optional/Advanced)
1. WebRTC integration (via a library like Simple Peer) for 1:1 audio/video calls.
2. Socket.io used purely for signaling (offer/answer/ICE candidates exchange).

### Phase 7 — Notifications
1. Firebase Cloud Messaging integration for push notifications (new message when app is backgrounded/closed).
2. In-app notification badges/unread counts.

### Phase 8 — Security Hardening
1. `helmet` for secure headers, rate limiting (`express-rate-limit`), input validation (`express-validator` or `zod`).
2. End-to-end encryption for messages (libsodium/Signal-protocol-based) — advanced/optional; can ship without true E2E initially and add later.
3. CORS lockdown, environment secrets audit.

### Phase 9 — Testing
1. Backend: Jest + Supertest for API routes, Socket.io-client for real-time event tests.
2. Frontend: React Testing Library for components.
3. Manual QA pass across core flows (auth, messaging, media, groups).

### Phase 10 — Logging, Monitoring & Polish
1. Winston (server logs) + Morgan (HTTP logs).
2. Sentry for error tracking (client + server).
3. UI polish, responsive design, loading/error states, empty states.

### Phase 11 — Dockerize
1. Write `Dockerfile` for client and server (or a combined multi-stage build).
2. `docker-compose.yml` for local dev (app + MongoDB + Redis) so the whole stack runs identically to what will ship.

### Phase 12 — Deploy to AWS
1. Push Docker images via AWS Elastic Beanstalk (Docker platform).
2. Configure environment variables/secrets in Beanstalk console or AWS Secrets Manager.
3. Point MongoDB to Atlas (production cluster) and Redis to AWS ElastiCache (or managed Redis) instead of local containers.
4. Set up a CDN (CloudFront) in front of S3 media bucket.
5. Smoke test production, then iterate.

## Why This Order
- Auth first because everything else depends on a logged-in user.
- REST before Socket.io so the data model and UI are proven correct before adding real-time complexity on top — easier to debug.
- Media and groups come after core 1:1 messaging works, since they're additive features on the same message pipeline.
- Security hardening and E2E encryption are placed later since they're easiest to retrofit once the message pipeline is stable, but should not be skipped before real deployment.
- Docker and AWS are last, matching the intent to build the full app before touching deployment.

## Notes for Execution
- Each phase above is a natural checkpoint — implement one phase at a time.
