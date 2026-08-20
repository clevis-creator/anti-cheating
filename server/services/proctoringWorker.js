// Simple stub for a proctoring worker that could transcode or run ML models on uploaded media.

export async function processMedia(filePath, meta = {}) {
  // Placeholder: in production, push to a queue (Redis, SQS) and have a worker consume
  console.log('Processing media', filePath, meta);
  // e.g., transcode with ffmpeg, run face-detection, extract thumbnails, store results
  return { processed: true };
}
