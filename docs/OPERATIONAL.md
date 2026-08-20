# Operational Runbook — ExamAI

This runbook covers common operational tasks, monitoring, backups, and incident response.

1. Services
- `server` (Express API) — port 5000
- `client` (Static build) — served via nginx or CDN
- `mongo` (MongoDB) — recommended: MongoDB Atlas

2. Environment variables (essential)
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — strong secret for JWT signing
- `CLIENT_URL` — frontend origin for CORS
- `PROCTORING_RETENTION_DAYS` — days to keep proctoring media (default 30)
- `SENTRY_DSN` — optional Sentry Data Source Name

3. Starting locally (development)
- Install: `npm run install:all`
- Seed data: `npm run seed`
- Start server: `npm run dev:server`
- Start client: `npm run dev:client`

4. Docker (local integration)
- Build & start: `docker compose up --build -d`
- Stop: `docker compose down`

5. Backups
- For MongoDB Atlas: enable continuous backups and scheduled snapshot exports.
- Export critical data regularly using `mongodump`.

6. Logs & monitoring
- Metrics: `http://<server>:5000/metrics` (Prometheus)
- Errors: Sentry (if `SENTRY_DSN` provided)
- Access logs: container logs or host process logs

7. Proctoring media
- Storage: production must use S3-compatible storage with server-side encryption.
- Retention: controlled by `PROCTORING_RETENTION_DAYS`; server runs daily cleanup job.
- Access: restrict playback endpoint to authorized teachers/admins; log all access.

8. Security checklist (before production)
- Enforce HTTPS (TLS termination at load balancer)
- Set `CLIENT_URL` to production origin only
- Use strong `JWT_SECRET` and rotate periodically
- Store API keys in a secrets manager (Vault / AWS Secrets Manager)
- Use signed, time-limited URLs for media downloads

9. Incident response (brief)
- If DB unreachable: check replica/instance health, restart MongoDB, check network/security groups.
- If server overload: scale horizontally, check background workers, investigate long-running requests.
- For leaked media: rotate access keys, revoke public links, follow legal/PR procedure.

10. Upgrades & deployment
- Use CI to build and test client and server images.
- Deploy server behind a load balancer with autoscaling and health checks.
- Use blue/green or canary deploys for minimal downtime.

11. Contacts
- Admins: add your on-call contacts here.

