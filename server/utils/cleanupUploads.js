import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { Response, ActivityLog } from '../models/index.js';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

export async function runCleanup() {
  const retentionDays = Number(config.proctoringRetentionDays || 30);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  try {
    // Ensure uploadDir exists
    await fs.mkdir(uploadDir, { recursive: true });

    // 1) Remove older media referenced in Responses
    const responses = await Response.find({ 'proctoring.media.uploadedAt': { $lt: cutoff } });
    for (const r of responses) {
      const before = (r.proctoring?.media || []).length;
      r.proctoring = r.proctoring || {};
      r.proctoring.media = (r.proctoring.media || []).filter((m) => {
        if (!m.uploadedAt) return true;
        const keep = new Date(m.uploadedAt) >= cutoff;
        if (!keep) {
          // delete file if exists
          const filePath = path.join(uploadDir, m.filename || path.basename(m.url || ''));
          fs.unlink(filePath).catch(() => {});
        }
        return keep;
      });
      if ((r.proctoring.media || []).length !== before) {
        await r.save();
        await ActivityLog.create({
          user: r.student,
          action: 'proctoring_media_deleted',
          resource: 'response',
          resourceId: r._id,
          exam: r.exam,
          details: `Deleted ${before - (r.proctoring.media || []).length} proctoring file(s) older than ${retentionDays} days`,
        }).catch(() => {});
      }
    }

    // 2) Remove orphan files older than cutoff
    const files = await fs.readdir(uploadDir);
    const referenced = new Set();
    const allResponses = await Response.find({});
    for (const r of allResponses) {
      for (const m of r.proctoring?.media || []) {
        if (m.filename) referenced.add(m.filename);
        else if (m.url) referenced.add(path.basename(m.url));
      }
    }

    for (const f of files) {
      if (referenced.has(f)) continue;
      const stats = await fs.stat(path.join(uploadDir, f));
      if (stats.mtime < cutoff) {
        await fs.unlink(path.join(uploadDir, f)).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Cleanup failed:', err.message);
  }
}

export function startCleanupScheduler() {
  // Run once immediately
  runCleanup().catch(() => {});
  // Then run daily
  const dayMs = 24 * 60 * 60 * 1000;
  setInterval(() => runCleanup().catch(() => {}), dayMs);
}
