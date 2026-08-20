Proctoring/Media Worker

This folder contains worker-related code for processing proctoring uploads.

Usage (conceptual):
- Push media upload tasks to a queue (Redis / Bull / SQS).
- Run `node server/services/proctoringWorker.js` (or a dedicated worker) to process items.
- Implement ffmpeg-based transcoding and ML inference as needed.
