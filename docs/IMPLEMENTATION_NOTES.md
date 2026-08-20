Implementation notes and what was scaffolded automatically by the agent.

Completed scaffolds:
- SEB generator and example .seb file
- Webcam consent UI and selfie upload
- Periodic screen-record capture and upload hook
- Live Monitor playback UI
- Retention cleanup scheduler
- SSO and LTI route/controller stubs
- Dockerfiles and docker-compose (basic)
- Prometheus metrics endpoint and Sentry init
- Security headers middleware
- Admin Proctoring Settings page
- Worker stub for media processing

Next recommended production steps:
- Replace file system storage with secure object storage (S3) and sign URLs.
- Implement robust SSO (OIDC) and LTI flows using established libraries.
- Add background worker queue (Bull/Redis) and process media (ffmpeg, ML inference).
- Add audits, role-based access controls for media playback.

