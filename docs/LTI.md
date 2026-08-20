# LTI Integration Plan (ExamAI)

This document outlines a minimal LTI 1.3 integration plan.

1. Support LTI 1.3 (Advantage) with OpenID Connect flow.
2. Provide `/.well-known/openid-configuration` and LTI tool configuration endpoints.
3. Implement JWKS endpoint and support platform JWT verification.
4. Accept launch requests at `/api/lti/launch`, validate state and nonce, and create or map users.
5. Expose configurable launch parameters: course context, role, and deep-linking for exam links.

This repo includes a stubbed `/api/lti` endpoint and a `docs/` plan. Implement production LTI flows using a mature library (eg. `ims-lti` or `ltijs`).
