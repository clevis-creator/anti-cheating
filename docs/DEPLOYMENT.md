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
- Create a root `.env` file for Compose and set secrets before starting containers.
- Required: `JWT_SECRET` (Compose refuses to start without it).
- Recommended: `CLIENT_URL`, `MONGODB_URI`, `PROCTORING_RETENTION_DAYS`, and AI/email settings as needed.

Example:

```dotenv
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:8080
```

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

## MongoDB Atlas production setup

1. Create a MongoDB Atlas cluster and a database user with a strong password.
2. Add the backend host's outbound IP address to Atlas Network Access. Restrict broad access before production use.
3. Copy the Atlas driver connection string and replace its credentials and database name with `examai`.
4. Set the connection string as the backend `MONGODB_URI`. Never commit it or expose it in frontend variables.
5. Enable Atlas backups and verify a restore procedure before official examinations.

Example:

```dotenv
MONGODB_URI=mongodb+srv://examai_user:password@cluster.example.mongodb.net/examai?retryWrites=true&w=majority
```
