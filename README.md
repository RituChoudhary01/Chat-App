<div align="center">

# 💬 Chat-App — Real-Time Microservices Messaging Platform

### A full-stack, real-time chat application built on a microservices architecture — featuring Socket.io live messaging, passwordless OTP email login, typing indicators, online presence, seen receipts, and image sharing.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Open_App-22C55E?style=for-the-badge&logo=amazonaws&logoColor=white)](http://13.211.219.171:3000/login)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## 🔗 Live Demo

**🌐 [http://13.211.219.171:3000/login](http://13.211.219.171:3000/login)**  ·  *Deployed on AWS EC2, fully containerized with Docker.*

> Log in with just your **email** — you'll receive a **6-digit OTP** in your inbox. No passwords required. Then start chatting in real time.

---

## 📸 Screenshots

> Upload your images to the repo (drag them into the GitHub editor) and paste the generated links below.

| Login (OTP) | Chat Interface |
| :---: | :---: |
| <img width="1277" alt="Login screen" src="REPLACE_WITH_LOGIN_IMAGE_URL" /> | <img width="1277" alt="Chat interface" src="REPLACE_WITH_CHAT_IMAGE_URL" /> |

---

## ✨ Overview

**Chat-App** is a production-style, real-time messaging platform engineered with a **microservices architecture**. Rather than a single monolith, the backend is split into three focused **Node.js + Express + TypeScript** services that each own one responsibility and communicate through HTTP, **WebSockets (Socket.io)**, and an asynchronous **RabbitMQ** message queue. The frontend is a modern **Next.js 16** app using **socket.io-client** for instant, bi-directional updates.

The authentication flow is **passwordless**: users sign in with an email, an OTP is generated and rate-limited in **Redis**, queued to RabbitMQ, and delivered by a dedicated **mail service** via Nodemailer — a clean, decoupled, event-driven design.

---

## 🏗️ Architecture

```
                         ┌──────────────────────────────┐
                         │      Next.js 16 Frontend      │
                         │  (AWS EC2 · socket.io-client) │
                         └───────┬───────────────┬───────┘
                       REST/JWT  │               │  WebSocket (Socket.io)
                                 ▼               ▼
                      ┌──────────────────┐   ┌──────────────────┐
                      │   User Service   │   │   Chat Service   │
                      │  OTP Auth · JWT  │   │  Real-time msgs  │
                      │  MongoDB · Redis │   │  MongoDB · Socket│
                      └────────┬─────────┘   │  Cloudinary      │
                               │             └────────┬─────────┘
            publish "send-otp" │                      │ HTTP: fetch chat partner
                               ▼                      ▼  (User Service)
                      ┌──────────────────┐   ┌──────────────────┐
                      │  RabbitMQ Queue  │   │   User Service   │
                      └────────┬─────────┘   └──────────────────┘
                               │ consume
                               ▼
                      ┌──────────────────┐
                      │   Mail Service   │
                      │ Nodemailer SMTP  │──► 📧 OTP email to user
                      └──────────────────┘
```

**How it fits together**

- A user enters their email → the **User Service** generates an OTP, stores it in **Redis** with a 5-minute TTL and a 60-second rate-limit, then **publishes** a `send-otp` job to **RabbitMQ**.
- The **Mail Service** **consumes** that job and emails the OTP via **Nodemailer (Gmail SMTP)** — completely decoupled from the login request.
- On verify, the User Service issues a **JWT**; every protected route and socket connection is authenticated with it.
- The **Chat Service** runs a **Socket.io** server that tracks online users, broadcasts presence, relays typing indicators, manages chat rooms, and delivers messages + seen receipts in real time. It calls the User Service over HTTP to enrich each chat with the partner's profile.

---

## 🧩 Microservices & APIs

### 1️⃣ User Service — Authentication & Profiles
**Stack:** Express · MongoDB (Mongoose) · Redis (OTP store + rate-limit) · RabbitMQ (publisher) · JWT

| Method | Endpoint | Auth | Description |
| --- | --- | :---: | --- |
| `POST` | `/api/v1/login` | – | Request an OTP — stored in Redis, queued to RabbitMQ |
| `POST` | `/api/v1/verify` | – | Verify OTP → create/return user + JWT |
| `GET` | `/api/v1/me` | ✅ | Get the logged-in user |
| `GET` | `/api/v1/user/all` | ✅ | List all users (to start new chats) |
| `GET` | `/api/v1/user/:id` | – | Fetch a single user's profile |
| `POST` | `/api/v1/update/user` | ✅ | Update display name |

### 2️⃣ Chat Service — Real-Time Messaging
**Stack:** Express · MongoDB · **Socket.io** · Cloudinary (image uploads via Multer) · JWT

| Method | Endpoint | Auth | Description |
| --- | --- | :---: | --- |
| `POST` | `/api/v1/chat/new` | ✅ | Create (or return existing) 1-to-1 chat |
| `GET` | `/api/v1/chat/all` | ✅ | List a user's chats + unseen counts + latest message |
| `POST` | `/api/v1/message` | ✅ | Send a text or image message (real-time emit) |
| `GET` | `/api/v1/message/:chatId` | ✅ | Get a chat's messages + mark them seen |

**⚡ Socket.io events:** `getOnlineUser` (presence) · `typing` / `userTyping` · `stopTyping` / `userStoppedTyping` · `joinChat` / `leaveChat` · `newMessage` · `messageSeen`

### 3️⃣ Mail Service — OTP Delivery
**Stack:** Express · RabbitMQ (consumer) · Nodemailer (Gmail SMTP)

- Listens on the durable **`send-otp`** queue and emails each OTP. Acknowledges on success, rejects on failure — so no OTP is silently lost.

---

## 🛠️ Tech Stack & Services

### Frontend
| Tech | Purpose |
| --- | --- |
| **Next.js 16** (App Router) | React framework & routing |
| **React 19 + TypeScript** | UI & type safety |
| **Tailwind CSS 4** | Styling |
| **socket.io-client** | Real-time messaging, typing, presence |
| **Axios · js-cookie · moment · react-hot-toast · lucide-react** | API calls, JWT cookies, timestamps, toasts, icons |

### Backend & Infrastructure (the "which service does what" map)
| Service / Tool | Role in the app |
| --- | --- |
| **Node.js + Express 5 (×3)** | Independent microservices |
| **MongoDB / Mongoose** | Users, chats & messages |
| **Redis** | OTP storage with TTL + login rate-limiting |
| **RabbitMQ** | Decoupled OTP-email job queue (event-driven) |
| **Socket.io** | Real-time messaging, presence, typing, seen receipts |
| **Nodemailer (Gmail SMTP)** | Sends OTP emails (Mail Service) |
| **Cloudinary** | Hosting for image messages |
| **JWT** | Stateless auth across services & sockets |
| **Docker + Docker Compose** | Containerizes & orchestrates every service |
| **AWS EC2** | Production hosting |

---

## 🚀 Features

- 🔐 **Passwordless OTP login** — email a 6-digit code, no passwords to remember.
- 🛡️ **Redis rate-limiting** — blocks OTP spam (1 request / 60s, 5-min expiry).
- 📨 **Event-driven email** — OTP delivery is queued via RabbitMQ and handled by a separate mail service, so logins stay fast.
- ⚡ **Real-time messaging** — instant delivery over Socket.io, no refresh needed.
- 🟢 **Online presence** — see who's currently online, live.
- ✍️ **Typing indicators** — "user is typing…" in real time.
- 👀 **Seen / read receipts** — know when your message was read, with unseen counters.
- 🖼️ **Image sharing** — send images, stored on Cloudinary.
- 💬 **1-to-1 chats** — auto-deduplicated conversations with latest-message previews.
- 👤 **Editable profiles** — update your display name on the fly.
- 🐳 **Fully Dockerized** — every service containerized and orchestrated with Docker Compose.
- 📱 **Responsive UI** — clean chat layout with sidebar, header, and message input.

---

## 🐳 Docker Deployment

Every service is containerized. Add a `Dockerfile` to each service folder and a single `docker-compose.yml` at the repo root to spin up the entire stack with one command.

<details>
<summary><b>Dockerfile (place one in each service: backend/user, backend/chat, backend/mail, frontend)</b></summary>

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```
*(For the frontend, set `EXPOSE 3000` and `CMD ["npm", "start"]`.)*
</details>

<details>
<summary><b>docker-compose.yml (repo root)</b></summary>

```yaml
version: "3.9"

services:
  user:
    build: ./backend/user
    ports: ["5000:5000"]
    env_file: ./backend/user/.env
    depends_on: [redis, rabbitmq]

  chat:
    build: ./backend/chat
    ports: ["5002:5002"]
    env_file: ./backend/chat/.env
    depends_on: [user]

  mail:
    build: ./backend/mail
    ports: ["5001:5001"]
    env_file: ./backend/mail/.env
    depends_on: [rabbitmq]

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [user, chat]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672", "15672:15672"]
```
</details>

```bash
# Build and run the whole stack
docker compose up --build -d

# View logs
docker compose logs -f

# Tear down
docker compose down
```

> 💡 On AWS EC2, open ports **3000** (frontend), **5672/15672** (RabbitMQ), and your service ports in the security group. The app is live at **http://13.211.219.171:3000/login**.

---

## ⚙️ Getting Started (Local, without Docker)

### Prerequisites
- Node.js 18+, MongoDB, Redis, and a RabbitMQ broker
- A Cloudinary account and Gmail App Password (for SMTP)

### 1. Clone
```bash
git clone https://github.com/RituChoudhary01/Chat-App.git
cd Chat-App
```

### 2. Run the backend services (3 terminals)
```bash
cd backend/user && npm install && npm run dev
cd backend/chat && npm install && npm run dev
cd backend/mail && npm install && npm run dev
```

### 3. Run the frontend
```bash
cd frontend && npm install && npm run dev   # → http://localhost:3000
```

### 🔑 Environment Variables

<details>
<summary><b>backend/user/.env</b></summary>

```env
PORT=5000
MONGO_URI=your_mongodb_uri
REDIS_URL=your_redis_url
JWT_SEC=your_jwt_secret
Rabbitmq_Host=your_rabbitmq_host
Rabbitmq_Username=your_rabbitmq_user
Rabbitmq_Password=your_rabbitmq_password
```
</details>

<details>
<summary><b>backend/chat/.env</b></summary>

```env
PORT=5002
MONGO_URI=your_mongodb_uri
JWT_SEC=your_jwt_secret
USER_SERVICE=http://localhost:5000
Cloud_Name=your_cloudinary_name
Cloud_Api_Key=your_cloudinary_key
Cloud_Api_Secret=your_cloudinary_secret
```
</details>

<details>
<summary><b>backend/mail/.env</b></summary>

```env
PORT=5001
Rabbitmq_Host=your_rabbitmq_host
Rabbitmq_Username=your_rabbitmq_user
Rabbitmq_Password=your_rabbitmq_password
SMTP_USER=your_gmail_address
SMTP_PASS=your_gmail_app_password
```
</details>

<details>
<summary><b>frontend/.env.local</b></summary>

```env
NEXT_PUBLIC_USER_SERVICE=http://localhost:5000
NEXT_PUBLIC_CHAT_SERVICE=http://localhost:5002
```
</details>

---

## 📂 Project Structure

```
Chat-App/
├── backend/
│   ├── user/     # OTP auth, profiles  (MongoDB · Redis · RabbitMQ publisher · JWT)
│   ├── chat/     # Real-time messaging (MongoDB · Socket.io · Cloudinary)
│   └── mail/     # OTP delivery        (RabbitMQ consumer · Nodemailer)
└── frontend/     # Next.js 16 client   (socket.io-client · Tailwind)
    ├── app/      # Routes: login, verify, chat, profile
    ├── compontent/ # ChatHeader, ChatSideBar, ChatMessages, MessageInput, VerifyOtp
    └── context/  # AppContext, SocketContext
```

---

## 👩‍💻 Author

**Ritu Choudhary** — [GitHub @RituChoudhary01](https://github.com/RituChoudhary01)

> ⭐ If you found this project interesting, please give it a star on GitHub!
