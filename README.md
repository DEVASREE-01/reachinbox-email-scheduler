<<<<<<< HEAD
# ReachInbox Email Scheduler

ReachInbox Email Scheduler is a production-grade full-stack email scheduling and automation system designed to handle high-throughput email outreach campaigns. It allows users to register custom SMTP senders, schedule delayed email campaigns via CSV uploads, monitor processing queues in real-time, and throttle outgoing traffic dynamically with per-sender rate limits.

---

## Architecture Overview

```text
                     +---------------------------------------+
                     |          React Web Dashboard          |
                     |           (Vite + Tailwind)           |
                     +-------------------+-------------------+
                                         |
                                         | REST APIs
                                         v
                     +-------------------+-------------------+
                     |       Express.js Modular Monolith     |
                     |             (TypeScript)              |
                     +---+-------------------+-----------+---+
                         |                   |           |
        1. Write Records |                   |           | 2. Enqueue Job
                         v                   |           v
             +-----------+-----------+       |       +---+-------------------+
             |      PostgreSQL       |       |       |       BullMQ          |
             |     (Prisma ORM)      |       |       |  (Delayed/Idempotent) |
             +-----------------------+       |       +-----------+-----------+
                                             |                   |
                                             |                   | 3. Process Job
                                             |                   v
                                             |       +-----------+-----------+
                                             |       |     BullMQ Worker     |
                                             |       +-----------+-----------+
                                             |                   |
                                             | 5. Sync Status    | 4. Check Limits & Send
                                             v                   v
                                  +----------+----------+  +-----+-----------+
                                  |    Elasticsearch    |  |   Redis Cache   |
                                  |  (Scoped Search)    |  |  & Rate Limiter |
                                  +---------------------+  +-----+-----------+
                                                                 |
                                                                 | 6. Dispatch Mail
                                                                 v
                                                           +-----+-----------+
                                                           |  Ethereal SMTP  |
                                                           |  (Nodemailer)   |
                                                           +-----------------+
```

---

## Features

1. **Google OAuth Authentication**: Secure authentication flow using HTTP-only cookies and sessions.
2. **Persistent Restart-Safe Scheduling**: Delayed email dispatch using BullMQ backed by persistent Redis storage.
3. **Dynamic Per-Sender Rate Limiting**: Sliding hour-window limits tracked atomically in Redis (`email-rate:{senderId}:{YYYYMMDDHH}`).
4. **Per-Sender Minimum Spacing (Delays)**: Distributed lock check using an atomic Redis Lua script to enforce spacing (default 2s) without worker thread blocking.
5. **Idempotency Protection**: Deterministic job IDs (`email-{emailId}`) and multi-state checking before mail dispatch to ensure exactly-once delivery attempts.
6. **Smart CSV Recipient Parser**: Automatically detects and extracts emails from arbitrary CSV columns, removing duplicates and formatting errors.
7. **Slack OAuth Workspace Connection**: Allows users to link their Slack workspace to receive real-time rate limit notifications.
8. **Elasticsearch Scoped Email Search**: Instantly searches recipient address, subject, body, or status, restricted strictly to the logged-in user.
9. **Bull Board Queue Monitoring**: Beautiful administration panel to observe waiting, delayed, active, and failed jobs.
10. **Zero Cron Dependency**: Scheduling is completely event-driven and handled natively by BullMQ's delay capabilities.
11. **Graceful Shutdown**: Handles SIGINT/SIGTERM, closing HTTP listeners and worker queues safely without dropping active operations.

---

## Tech Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, TanStack Query (React Query), Axios, React Hook Form, Zod.
*   **Backend**: Node.js, TypeScript, Express.js, Prisma ORM, BullMQ, ioredis, Nodemailer, Winston/Pino logging.
*   **Databases & Cache**: PostgreSQL, Redis, Elasticsearch.
*   **Infrastructure**: Docker Compose (for Postgres, Redis, Elasticsearch).

---

## Requirements

*   Node.js (v18 or higher)
*   NPM (v9 or higher)
*   Docker & Docker Desktop (to run databases)
*   Google OAuth Client ID & Secret
*   Slack OAuth Client ID & Secret

---

## Installation

### Step 1: Clone the repository
```bash
git clone https://github.com/your-username/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler
```

### Step 2: Set up environment variables
Copy the template `.env.example` at the root to `.env` and fill in your details:
```bash
cp .env.example .env
```

### Step 3: Run Database Services via Docker
Start the persistent databases:
```bash
docker compose up -d
```
Verify that Postgres (5432), Redis (6379), and Elasticsearch (9200) are healthy and running.

### Step 4: Install Dependencies & Setup DB
```bash
# Install root orchestrator scripts
npm install

# Setup backend
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed

# Setup frontend
cd ../frontend
npm install
```

---

## Environment Variables Configuration

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP API Port | `5000` |
| `FRONTEND_URL` | Frontend client host | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/reachinbox` |
| `REDIS_HOST` | Redis server address | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `ELASTICSEARCH_URL` | Elasticsearch address | `http://localhost:9200` |
| `SESSION_SECRET` | Secret key for HTTP cookie sessions | - |
| `WORKER_CONCURRENCY` | Maximum concurrent jobs per worker | `10` |
| `MIN_SEND_DELAY_MS` | Global spacing between mails per sender | `2000` |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Default sender limit per hour | `50` |
| `GOOGLE_CLIENT_ID` / `SECRET` | Google developer credentials | - |
| `SLACK_CLIENT_ID` / `SECRET` | Slack developer credentials | - |

---

## Running the Application

### Development Mode

Run the backend, worker, and frontend concurrently from the project root:
```bash
# In Terminal 1 (Run Backend server & worker together)
npm run dev:backend

# In Terminal 2 (Run Frontend development server)
npm run dev:frontend
```

Alternatively, you can run services in individual terminals:
```bash
# Backend server
cd backend && npm run dev

# Standalone Worker
cd backend && npm run worker

# Frontend
cd frontend && npm run dev
```

### Ports & Endpoints
*   **Web App**: `http://localhost:5173`
*   **Backend Server**: `http://localhost:5000`
*   **Queue Monitoring (Bull Board)**: `http://localhost:5000/admin/queues`
*   **Elasticsearch Node**: `http://localhost:9200`

---

## Core Systems Design

### 1. Scheduling Architecture
*   No CRON triggers are used.
*   When a campaign is scheduled, recipient dispatch offsets are pre-calculated (`startTime + index * delayMs`).
*   A BullMQ job is enqueued in Redis with the computed delay. BullMQ manages execution timings natively in Redis.

### 2. Restart Persistence & Recovery
*   Both PostgreSQL and Redis run on persistent Docker volumes.
*   Because BullMQ stores delayed jobs directly in Redis (`appendonly` persistence enabled), scheduled jobs survive server restarts.
*   On boot, the backend runs a **Reconciliation Service** that queries PostgreSQL for emails in `SCHEDULED`, `PROCESSING`, or `RATE_LIMITED` states, checks if their corresponding BullMQ job exists in Redis, and enqueues any missing jobs using their deterministic job IDs.

### 3. Distributed Rate Limiting
*   Before sending, the worker increments an hourly Redis counter `email-rate:{senderId}:{YYYYMMDDHH}`.
*   If the counter exceeds the sender's limit, the job is rescheduled to the start of the next hour window.
*   A Slack alert is sent (if connected), and the email status is set to `RATE_LIMITED`.

### 4. Minimum Delay (Spacing)
*   Enforced using an atomic Redis Lua script which checks the timestamp of the last sent email.
*   If a sender tries to send another email before the delay has elapsed, the Lua script returns the remaining time.
*   The worker reschedules the job with that delay. This avoids blocking threads or busy-waiting.

### 5. Idempotency Strategy
*   Jobs are submitted with deterministic IDs: `email-{emailId}`. Redis rejects duplicates.
*   The worker checks database status before processing. If status is `SENT`, it exits.
*   A distributed lock ensures only one worker thread can process a job at any given time.

### 6. Slack Integration Flow
*   Users connect via Slack OAuth. The bot token is stored securely.
*   When a rate limit is reached, a notification is sent.
*   To prevent spamming, notifications are throttled using a Redis lock `slack-rate-limit-notified:{senderId}:{hourWindow}` with atomic `SET NX` semantics.

### 7. Elasticsearch vs. PostgreSQL
*   PostgreSQL is the authoritative source of truth.
*   Elasticsearch is the secondary index. If Elasticsearch is down, email delivery continues. Sync failures are logged and retried at next status changes.

---

## Testing

Run unit and mock integration tests:
```bash
cd backend
npm run test
```

---

## Step-by-Step Demo Scenario

1.  **Login**: Open `http://localhost:5173` and click **Continue with Google**.
2.  **Connect Slack**: On the dashboard header, click **Connect Slack** and authorize the workspace.
3.  **Compose Campaign**:
    *   Click **Compose Campaign**.
    *   Select your SMTP sender (a default one is seeded; you can register custom ones).
    *   Set Subject: `ReachInbox Demo` and Body: `Hello, this is a test.`
    *   Set **Delay**: `2000` (2s) and **Hourly Limit**: `5`.
    *   Upload a CSV with 10 email addresses.
    *   Observe the analysis text: `10 valid email addresses detected`.
    *   Click **Schedule Emails**.
4.  **Observe Queues**:
    *   Open Bull Board at `http://localhost:5000/admin/queues`.
    *   Observe 10 delayed jobs representing the scheduled recipients.
5.  **Restart Persistence**:
    *   Stop the backend process (`Ctrl+C` in your terminal).
    *   Open Bull Board or look at Redis — the jobs remain scheduled.
    *   Restart the backend (`npm run dev:backend`). The worker resumes processing from where it left off.
6.  **Rate Limit Test**:
    *   Change the campaign limit or your default env limit: `MAX_EMAILS_PER_HOUR_PER_SENDER=2`.
    *   Schedule 5 emails.
    *   Verify that 2 emails send immediately.
    *   Verify the remaining 3 are rescheduled for the next hour.
    *   Check your Slack workspace; a rate limit alert will be posted to the `#general` channel.
=======
# reachinbox-email-scheduler
A full-stack email scheduling application built with React, Express, PostgreSQL, Redis, BullMQ, Google OAuth, and Ethereal SMTP.
>>>>>>> 26010e0b09d33b3ff9a08fefed0addb97f8575e4
