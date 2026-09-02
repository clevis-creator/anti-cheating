import { Course, User } from '../models/index.js';
import AppError from './helpers.js';

export async function getTeacherStudentIds(teacherId) {
  const courses = await Course.find({ teacher: teacherId, isActive: true }).select('students');
  return [...new Set(courses.flatMap((course) => course.students.map((id) => id.toString())))];
}

export async function assertAssignableStudents(user, studentIds = []) {
  if (!Array.isArray(studentIds) || !studentIds.length) return;
  if (user.role === 'admin') return;

  const allowedIds = new Set(await getTeacherStudentIds(user._id));
  const createdStudents = await User.find({
    _id: { $in: studentIds },
    role: 'student',
    createdBy: user._id,
  }).select('_id');
  createdStudents.forEach((student) => allowedIds.add(student._id.toString()));

  const invalid = studentIds.filter((id) => !allowedIds.has(id.toString()));
  if (invalid.length) {
    throw new AppError('You can only assign students from your courses or workspace', 403);
  }
}

export async function assertCourseTeacherAccess(user, course) {
  if (user.role === 'admin') return;
  if (user.role === 'teacher' && course.teacher.equals(user._id)) return;
  throw new AppError('Not authorized', 403);
}

export async function assertCourseReadAccess(user, course) {
  if (user.role === 'admin') return;
  if (user.role === 'teacher' && course.teacher.equals(user._id)) return;
  if (user.role === 'student' && course.students.some((id) => id.equals(user._id))) return;
  throw new AppError('Not authorized', 403);
}
