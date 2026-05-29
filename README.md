# Al-Basha ERP Platform (الباشا) - Phase 1

This repository contains the Phase 1 Foundation/MVP implementation for the Al-Basha Vehicle Import Operations ERP.

## Project Structure

- `/client` - Vite + React + TypeScript + Tailwind CSS client application (Agent Dashboard, Admin Panel, and Customer PWA).
- `/server` - Express + TypeScript + Prisma ORM + PostgreSQL backend server.
- `/shared` - Shared TypeScript types, validation schemas, and constants between client and server.

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- Docker & Docker Desktop

### 1. Database Setup (Docker)

Start the PostgreSQL database container. The container is configured to bind to host port `45432` to avoid collisions with other PostgreSQL instances on port `5432` or `5433`:

```bash
docker compose up -d
```

Verify that the database is running:

```bash
docker compose ps
```

### 2. Backend Setup

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the environment variables by copying `.env.example` from the root directory into `server/.env`:
   ```bash
   cp ../.env.example .env
   ```
   *(Ensure `DATABASE_URL` is set to `postgresql://albasha:albasha_dev@localhost:45432/albasha?schema=public` and `PORT=33000`)*

4. Synchronize the Prisma schema with the database (development sync):
   ```bash
   npx prisma db push
   ```

5. Seed the database with core role definitions and demo records:
   ```bash
   npm run db:seed
   ```

6. Build the backend. We use a memory-limit-safe flag to compile TypeScript without running out of heap size:
   ```bash
   npm run build
   ```

7. Start the backend:
   ```bash
   npm run start
   ```
   *(The server will run on `http://localhost:33000`)*

### 3. Client Setup

1. Navigate to the `client` directory:
   ```bash
   cd ../client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the client application:
   ```bash
   npm run build
   ```

4. Run the client application in development mode:
   ```bash
   npm run dev
   ```
   *(The client proxy is configured in `vite.config.ts` to redirect `/api` requests to `http://localhost:33000`)*

---

## Verification & Troubleshooting Scripts

We have added official verification scripts in the backend to ensure a clean deployment. Run these commands from the `server` directory:

### Count Database Records

Verify that the database tables are populated with correct counts:
```bash
npm run db:count
```

### Authentication Flow Integration Test

Verify JWT health checks, login, cookie generation (HttpOnly), token rotation, route protection, suspended user blocks, and logout revocation:
```bash
npm run test:auth
```

### Memory Allocation Warning (Build Issue)

If you encounter `FATAL ERROR: Zone Allocation failed - process out of memory` during TypeScript compilation, build using our pre-configured script:
```bash
npm run build
```
This script wraps the compilation with `node --max-old-space-size=2048 node_modules/typescript/bin/tsc` to allocate sufficient heap memory.

---

## Project Documentation

Refer to the official project verification reports for milestone history:
- [Sprint 1 Final Verification Report](docs/sprints/sprint1-final-verification-report.md)
- [Sprint 2 Final Report](docs/sprints/sprint2-final-report.md)
- [Sprint 2 Final Verification and Stabilization Report](docs/sprints/sprint2-final-verification-report.md)
- [Sprint 3 Final Verification and Final Report](docs/sprints/sprint3-final-report.md)
- [Sprint 4 Final Report](docs/sprints/sprint4-final-report.md)
- [Sprint 5 Final Report](docs/sprints/sprint5-final-report.md)
- [Sprint 6 Final Report](docs/sprints/sprint6-final-report.md)
- [Sprint 7 Final Report](docs/sprints/sprint7-final-report.md)


