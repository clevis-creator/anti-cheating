import crypto from 'crypto';
import { User, Notification, ActivityLog, Settings } from '../models/index.js';
import { generateToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role, institution, studentId, teacherId } = req.body;

  const regSetting = await Settings.findOne({ key: 'allow_registration' });
  if (regSetting && regSetting.value === false) {
    throw new AppError('Public registration is currently disabled. Contact your administrator.', 403);
  }

  const exists = await User.findOne({ email });
  if (exists) throw new AppError('Email already registered', 400);

  // Only admins can create admin/teacher accounts via this public route defaults to student
  const allowedRole = ['student', 'teacher'].includes(role) ? role : 'student';

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: allowedRole,
    institution,
    studentId,
    teacherId,
  });

  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail(user, verifyToken);

  await Notification.create({
    recipient: user._id,
    title: 'Welcome to ExamAI',
    message: 'Please verify your email to get started.',
    type: 'system',
  });

  sendSuccess(
    res,
    {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    },
    'Registration successful. Please verify your email.',
    201
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) throw new AppError('Account is deactivated. Contact admin.', 403);

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  await ActivityLog.create({
    user: user._id,
    action: 'login',
    resource: 'auth',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  const token = generateToken(user._id, user.role);

  sendSuccess(res, {
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      institution: user.institution,
    },
  }, 'Login successful');
});

export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: req.user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['firstName', 'lastName', 'phone', 'institution', 'department', 'avatar'];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  sendSuccess(res, { user }, 'Profile updated');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();
  sendSuccess(res, null, 'Password changed successfully');
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.body.token || req.query.token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) throw new AppError('Invalid or expired verification token', 400);

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, null, 'Email verified successfully');
});

export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) throw new AppError('User not found', 404);
  if (user.isEmailVerified) throw new AppError('Email already verified', 400);

  const token = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail(user, token);

  sendSuccess(res, null, 'Verification email sent');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // Do not reveal whether email exists
    return sendSuccess(res, null, 'If that email exists, a reset link has been sent');
  }

  const token = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  await sendPasswordResetEmail(user, token);

  sendSuccess(res, null, 'If that email exists, a reset link has been sent');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendSuccess(res, null, 'Password reset successful. You can now log in.');
});
