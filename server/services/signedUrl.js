import crypto from 'crypto';
import config from '../config/index.js';

const DEFAULT_TTL_SEC = 3600;

function getSecret() {
  return config.mediaSignSecret || config.jwtSecret;
}

export function signMediaToken({ responseId, filename, userId, ttlSec = DEFAULT_TTL_SEC }) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = JSON.stringify({ responseId, filename, userId, exp });
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  const data = Buffer.from(payload).toString('base64url');
  return `${data}.${sig}`;
}

export function verifyMediaToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;

  const payload = Buffer.from(data, 'base64url').toString('utf8');
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  if (sig !== expected) return null;

  try {
    const parsed = JSON.parse(payload);
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildSignedMediaUrl(responseId, filename, userId, req) {
  const token = signMediaToken({ responseId, filename, userId });
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/api/responses/media/download?token=${encodeURIComponent(token)}`;
}
