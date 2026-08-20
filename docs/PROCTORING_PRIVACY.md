# Proctoring Privacy & Retention

Summary
- Proctoring captures (images, short videos, screen recordings) are used solely for exam integrity.
- Retention: default 30 days (`PROCTORING_RETENTION_DAYS`).
- Access restricted to authorized staff; activity logged.

Storage and deletion
- Files stored under `server/uploads` and referenced in `Response.proctoring.media`.
- A daily cleanup job removes media older than retention days and deletes orphan files.

Consent
- Students must give consent before any capture; consent records are stored on the `Response.proctoring` object.

Guidance
- For production, use encrypted object storage (S3) with server-side encryption and restricted access.
- Review local privacy laws and institutional policy before enabling automated recording.
