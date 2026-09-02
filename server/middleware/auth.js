import { User, ActivityLog } from '../models/index.js';
import { getTokenFromHeader, verifyToken } from '../utils/jwt.js';
import { getRequireEmailVerification } from '../utils/settingsReader.js';
import AppError, { asyncHandler } from '../utils/helpers.js';

export const protect = asyncHandler(async (req, res, next) => {
  const token = getTokenFromHeader(req);
  if (!token) throw new AppError('Not authorized. Please log in.', 401);

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) throw new AppError('User not found or inactive.', 401);
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      throw new AppError('Invalid or expired token. Please log in again.', 401);
    }
    throw err;
  }
});

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

export const requireVerifiedEmail = asyncHandler(async (req, _res, next) => {
  if (req.user.role !== 'student') return next();

  const required = await getRequireEmailVerification();
  if (!required) return next();

  if (!req.user.isEmailVerified) {
    throw new AppError('Please verify your email before taking exams.', 403);
  }

  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = await User.findById(decoded.id);
    } catch {
      req.user = null;
    }
  }
  next();
});

export const logActivity = (action, resource = '') =>
  asyncHandler(async (req, _res, next) => {
    try {
      await ActivityLog.create({
        user: req.user?._id,
        action,
        resource,
        resourceId: req.params.id,
        details: `${req.method} ${req.originalUrl}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (e) {
      console.error('Activity log error:', e.message);
    }
    next();
  });
