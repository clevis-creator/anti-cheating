import { Exam } from '../models/index.js';
import AppError from './helpers.js';

export async function getExamOrThrow(examId) {
  const exam = await Exam.findById(examId);
  if (!exam) throw new AppError('Exam not found', 404);
  return exam;
}

export async function assertExamMonitorAccess(user, examId) {
  const exam = await getExamOrThrow(examId);
  if (user.role === 'admin') return exam;
  if (user.role === 'teacher' && exam.createdBy.equals(user._id)) return exam;
  throw new AppError('Not authorized to monitor this exam', 403);
}

export function assertStudentExamAccess(exam, userId) {
  const assigned = exam.assignedStudents || [];
  if (assigned.length > 0 && !assigned.some((id) => id.toString() === userId.toString())) {
    throw new AppError('You are not assigned to this exam', 403);
  }
}

export function assertAccessCode(exam, accessCode) {
  if (exam.accessCode && exam.accessCode.trim()) {
    if (!accessCode || accessCode.trim() !== exam.accessCode.trim()) {
      throw new AppError('Invalid exam access code', 403);
    }
  }
}
