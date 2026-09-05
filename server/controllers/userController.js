import { User, ActivityLog, Course, Exam, Response, Result } from '../models/index.js';
import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';
import { getTeacherStudentIds } from '../utils/teacherAccess.js';
import { sendVerificationEmail } from '../utils/email.js';
import { assertStudentEnrollmentAllowed } from '../utils/platformLimits.js';
import { escapeRegex } from '../utils/helpers.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20, isActive } = req.query;
  const filter = {};

  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { firstName: new RegExp(safeSearch, 'i') },
      { lastName: new RegExp(safeSearch, 'i') },
      { email: new RegExp(safeSearch, 'i') },
      { studentId: new RegExp(safeSearch, 'i') },
    ];
  }

  if (req.user.role === 'teacher') {
    const studentIds = await getTeacherStudentIds(req.user._id);
    // Teachers may only ever scope to student accounts.
    filter.role = 'student';
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { _id: { $in: studentIds } },
          { createdBy: req.user._id },
        ],
      },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, {
    users,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('courses');
  if (!user) throw new AppError('User not found', 404);

  if (req.user.role === 'teacher') {
    const studentIds = await getTeacherStudentIds(req.user._id);
    const canAccess =
      user.createdBy?.equals(req.user._id) ||
      studentIds.includes(user._id.toString());
    if (!canAccess) throw new AppError('Not authorized', 403);
  }

  sendSuccess(res, { user });
});

export const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role, institution, department, studentId, teacherId } =
    req.body;

  if (await User.findOne({ email })) throw new AppError('Email already exists', 400);

  // Teachers can only create student accounts
  const allowedRole = req.user.role === 'admin'
    ? (['admin', 'teacher', 'student'].includes(role) ? role : 'student')
    : 'student';

  if (allowedRole === 'student') {
    await assertStudentEnrollmentAllowed();
  }

  // Students are created unverified: a verification email is sent on creation.
  // Verified state is only granted via the email verification flow (or seeding).
  const usingDefaultPassword = !password || password === 'ChangeMe123!';

  const user = await User.create({
    firstName,
    lastName,
    email,
    password: password || 'ChangeMe123!',
    role: allowedRole,
    institution,
    department,
    studentId,
    teacherId,
    createdBy: req.user._id,
    isEmailVerified: allowedRole !== 'student',
    mustChangePassword: usingDefaultPassword,
  });

  if (allowedRole === 'student') {
    const verifyToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    await sendVerificationEmail(user, verifyToken);
  }

  await ActivityLog.create({
    user: req.user._id,
    action: 'create_user',
    resource: 'user',
    resourceId: user._id,
    details: `Created ${allowedRole}: ${email}`,
    ipAddress: req.ip,
  });

  const {
    password: _pw,
    emailVerificationToken: _evt,
    emailVerificationExpire: _eve,
    resetPasswordToken: _rpt,
    resetPasswordExpire: _rpe,
    ...safeUser
  } = user.toJSON();

  sendSuccess(res, { user: safeUser }, 'User created', 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  const allowed = [
    'firstName',
    'lastName',
    'phone',
    'institution',
    'department',
    'studentId',
    'teacherId',
    'isActive',
    'role',
    'avatar',
  ];
  const updates = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new AppError('User not found', 404);

  sendSuccess(res, { user }, 'User updated');
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user._id.equals(req.user._id)) throw new AppError('Cannot delete your own account', 400);

  user.isActive = false;
  await user.save();

  sendSuccess(res, null, 'User deactivated');
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalTeachers,
    totalStudents,
    totalCourses,
    totalExams,
    totalResponses,
    recentLogs,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'teacher', isActive: true }),
    User.countDocuments({ role: 'student', isActive: true }),
    Course.countDocuments({ isActive: true }),
    Exam.countDocuments(),
    Response.countDocuments({ status: { $in: ['submitted', 'graded', 'published'] } }),
    ActivityLog.find().sort('-createdAt').limit(10).populate('user', 'firstName lastName email role'),
  ]);

  const results = await Result.find().select('percentage passed');
  const avgPercentage =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
      : 0;
  const passRate =
    results.length > 0
      ? Math.round((results.filter((r) => r.passed).length / results.length) * 100)
      : 0;

  sendSuccess(res, {
    stats: {
      totalUsers,
      totalTeachers,
      totalStudents,
      totalCourses,
      totalExams,
      totalResponses,
      avgPercentage,
      passRate,
    },
    recentLogs,
  });
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, severity, user } = req.query;
  const filter = {};
  if (severity) filter.severity = severity;
  if (user) filter.user = user;

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'firstName lastName email role'),
    ActivityLog.countDocuments(filter),
  ]);

  sendSuccess(res, {
    logs,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});
