Implementation notes and what was scaffolded automatically by the agent.

Completed scaffolds:

Next recommended production steps:

Completed hardening:
- Browser anti-cheat controls now honor exam settings, store the exam session token, and enforce SEB-required exams at the API boundary.
- Student result payloads hide answer keys unless `showCorrectAnswers` is enabled.
- AI grading without a configured provider remains pending for human review instead of assigning heuristic marks.
- Teacher grading, AI overrides, and result publishing enforce exam ownership.
- Focused server grading tests and a production client build are available.

Required before high-stakes production:
- Replace local filesystem storage with private object storage (S3-compatible) and signed URLs for certificates/reports as well as proctoring media.
- Configure a signed/encrypted SEB profile with the production URL and verify it on each supported platform.
- Implement robust OIDC/LTI flows using established libraries if those integrations are required.
- Add a durable worker queue (BullMQ/Redis) for media processing and AI jobs.
- Run browser/device acceptance tests with real students and a real SEB client.

