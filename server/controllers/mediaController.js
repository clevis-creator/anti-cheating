import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Response, ActivityLog } from '../models/index.js';
import { verifyMediaToken, buildSignedMediaUrl } from '../services/signedUrl.js';
import { assertExamMonitorAccess } from '../utils/examAccess.js';
import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

async function findMediaOnResponse(responseId, filename) {
  const response = await Response.findById(responseId);
  if (!response) return { response: null, media: null };

  const media = (response.proctoring?.media || []).find(
    (m) => m.filename === filename || path.basename(m.url || '') === filename
  );
  return { response, media };
}

export const getMediaAccessUrl = asyncHandler(async (req, res) => {
  const { id: responseId, filename } = req.params;
  const response = await Response.findById(responseId);
  if (!response) throw new AppError('Response not found', 404);

  const isOwner = response.student.equals(req.user._id);
  const isStaff = ['admin', 'teacher'].includes(req.user.role);

  if (!isOwner && !isStaff) throw new AppError('Not authorized', 403);

  if (isStaff && req.user.role === 'teacher') {
    await assertExamMonitorAccess(req.user, response.exam);
  }

  const media = (response.proctoring?.media || []).find(
    (m) => m.filename === filename || path.basename(m.url || '') === filename
  );
  if (!media) throw new AppError('Media not found', 404);

  const url = buildSignedMediaUrl(responseId, filename, req.user._id, req);

  await ActivityLog.create({
    user: req.user._id,
    action: 'proctoring_media_access',
    resource: 'response',
    resourceId: response._id,
    exam: response.exam,
    details: filename,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  }).catch(() => {});

  sendSuccess(res, { url, expiresIn: 3600 }, 'Media access URL generated');
});

export const downloadMedia = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const payload = verifyMediaToken(token);
  if (!payload) throw new AppError('Invalid or expired media link', 403);

  const { response, media } = await findMediaOnResponse(payload.responseId, payload.filename);
  if (!response || !media) throw new AppError('Media not found', 404);

  const filePath = path.join(uploadDir, payload.filename);
  if (!fs.existsSync(filePath)) throw new AppError('File not found', 404);

  res.setHeader('Content-Type', media.type || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(filePath).pipe(res);
});
