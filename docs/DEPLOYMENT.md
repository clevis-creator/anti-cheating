# Deployment & Smoke Test Guide

This document explains how to deploy locally (Docker) and run quick smoke tests.

1) Build & run with Docker Compose

```bash
docker compose up --build -d
```

This starts:
- MongoDB on port 27017
- Server on port 5000
- Client (nginx) on port 8080

2) Environment variables
- Copy `server/.env.example` to `server/.env` and set secrets.
- Key vars: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `PROCTORING_RETENTION_DAYS`.

3) Seed demo data

```bash
npm run seed
```

4) Run smoke tests (local)

```bash
node tools/smoke-test.js http://127.0.0.1:5000 http://127.0.0.1:5173
```

5) Metrics & monitoring
- Prometheus metrics available at `http://localhost:5000/metrics`.
- To enable Sentry set `SENTRY_DSN` in `server/.env`.

6) Production notes
- Use S3-compatible storage for proctoring media and update upload logic.
- Use a job queue (Redis + Bull) for heavy background processing.
- Harden CORS for production `CLIENT_URL` only.
