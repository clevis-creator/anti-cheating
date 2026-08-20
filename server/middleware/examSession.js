import crypto from 'crypto';
import { Response } from '../models/index.js';
import AppError, { asyncHandler } from '../utils/helpers.js';
import config from '../config/index.js';

export function buildSessionFingerprint(req) {
  const ip = req.ip || '';
  const ua = req.get('user-agent') || '';
  return crypto.createHmac('sha256', config.jwtSecret).update(`${ip}|${ua}`).digest('hex');
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export const requireExamSession = asyncHandler(async (req, res, next) => {
  const token = req.get('X-Exam-Session');
  if (!token) throw new AppError('Exam session token required', 401);

  const response = await Response.findOne({
    _id: req.params.id,
    student: req.user._id,
    sessionToken: token,
    status: 'in_progress',
  });

  if (!response) throw new AppError('Invalid or expired exam session', 403);

  const fingerprint = buildSessionFingerprint(req);
  if (response.sessionFingerprint && response.sessionFingerprint !== fingerprint) {
    throw new AppError('Exam session device mismatch', 403);
  }

  req.examResponse = response;
  next();
});
