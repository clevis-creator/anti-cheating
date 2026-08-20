import { Course, User } from '../models/index.js';
import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const getCourses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'teacher') filter.teacher = req.user._id;
  if (req.user.role === 'student') filter.students = req.user._id;
  if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';

  const courses = await Course.find(filter)
    .populate('teacher', 'firstName lastName email')
    .populate('students', 'firstName lastName email studentId')
    .sort('-createdAt');

  sendSuccess(res, { courses });
});

export const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('teacher', 'firstName lastName email')
    .populate('students', 'firstName lastName email studentId');
  if (!course) throw new AppError('Course not found', 404);
  sendSuccess(res, { course });
});

export const createCourse = asyncHandler(async (req, res) => {
  const teacherId = req.user.role === 'admin' && req.body.teacher ? req.body.teacher : req.user._id;

  const course = await Course.create({
    ...req.body,
    teacher: teacherId,
  });

  await User.findByIdAndUpdate(teacherId, { $addToSet: { courses: course._id } });
  sendSuccess(res, { course }, 'Course created', 201);
});

export const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);

  if (req.user.role === 'teacher' && !course.teacher.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  Object.assign(course, req.body);
  await course.save();
  sendSuccess(res, { course }, 'Course updated');
});

export const enrollStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);

  course.students = [...new Set([...course.students.map(String), ...studentIds])];
  await course.save();

  await User.updateMany(
    { _id: { $in: studentIds } },
    { $addToSet: { courses: course._id } }
  );

  const updated = await Course.findById(course._id).populate('students', 'firstName lastName email');
  sendSuccess(res, { course: updated }, 'Students enrolled');
});

export const removeStudent = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);

  course.students = course.students.filter((s) => !s.equals(req.params.studentId));
  await course.save();
  await User.findByIdAndUpdate(req.params.studentId, { $pull: { courses: course._id } });

  sendSuccess(res, { course }, 'Student removed');
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!course) throw new AppError('Course not found', 404);
  sendSuccess(res, null, 'Course deactivated');
});
