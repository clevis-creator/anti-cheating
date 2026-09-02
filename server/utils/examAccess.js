import { Exam } from '../models/index.js';
import AppError from './helpers.js';

export async function getExamOrThrow(examId) {
  const exam = await Exam.findById(examId);
  if (!exam) throw new AppError('Exam not found', 404);
  return exam;
}

export function isExamOpenToAllStudents(exam) {
  return !exam.assignedStudents || exam.assignedStudents.length === 0;
}

export function isStudentAssignedToExam(exam, userId) {
  const assigned = exam.assignedStudents || [];
  if (assigned.length === 0) return true;
  return assigned.some((id) => id.toString() === userId.toString());
}

export function assertStudentExamAccess(exam, userId) {
  if (!isStudentAssignedToExam(exam, userId)) {
    throw new AppError('You are not assigned to this exam', 403);
  }
}

export function assertStudentCanViewExam(exam, userId) {
  if (!['published', 'active'].includes(exam.status)) {
    throw new AppError('Exam is not available', 403);
  }
  assertStudentExamAccess(exam, userId);
}

export function assertTeacherExamAccess(user, exam) {
  if (user.role === 'admin') return;
  if (user.role === 'teacher' && exam.createdBy.equals(user._id)) return;
  throw new AppError('Not authorized', 403);
}

export async function assertExamMonitorAccess(user, examId) {
  const exam = await getExamOrThrow(examId);
  assertTeacherExamAccess(user, exam);
  return exam;
}

export function studentVisibleExamFilter(userId) {
  return {
    status: { $in: ['published', 'active'] },
    $or: [{ assignedStudents: userId }, { assignedStudents: { $size: 0 } }],
  };
}

export function assertAccessCode(exam, accessCode) {
  if (exam.accessCode && exam.accessCode.trim()) {
    if (!accessCode || accessCode.trim() !== exam.accessCode.trim()) {
      throw new AppError('Invalid exam access code', 403);
    }
  }
}
