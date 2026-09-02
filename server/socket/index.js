import jwt from 'jsonwebtoken';

import config from '../config/index.js';

import { User, Response, Exam } from '../models/index.js';

import {
  assertExamMonitorAccess,
  assertStudentExamAccess,
} from '../utils/examAccess.js';
import { getRemainingSeconds } from '../utils/examTiming.js';
import { getRequireEmailVerification } from '../utils/settingsReader.js';
import * as onlineStore from '../utils/onlineStore.js';

function monitorRoom(examId) {
  return `exam:${examId}:monitors`;
}

function emitToMonitors(io, examId, event, payload) {
  io.to(monitorRoom(examId)).emit(event, payload);
}

async function emitOnlineStudents(io, examId) {
  const students = await onlineStore.listStudentsForExam(examId);
  emitToMonitors(io, examId, 'students:online', {
    examId,
    count: students.length,
    students,
  });
}

export const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) return next(new Error('Invalid user'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role}`);

    socket.on('exam:join', async ({ examId, responseId }) => {
      if (!examId || user.role !== 'student') return;

      try {
        const requireVerified = await getRequireEmailVerification();
        if (requireVerified && !user.isEmailVerified) {
          socket.emit('exam:error', { message: 'Please verify your email before taking exams.' });
          return;
        }

        const exam = await Exam.findById(examId).select('assignedStudents status');
        if (!exam || !['published', 'active'].includes(exam.status)) {
          socket.emit('exam:error', { message: 'Exam is not available' });
          return;
        }

        assertStudentExamAccess(exam, user._id);

        if (responseId) {
          const response = await Response.findOne({
            _id: responseId,
            exam: examId,
            student: user._id,
            status: 'in_progress',
          });
          if (!response) {
            socket.emit('exam:error', { message: 'Invalid exam session' });
            return;
          }
        }

        socket.join(`exam:${examId}`);
        socket.examId = examId;
        socket.responseId = responseId;

        await onlineStore.setStudent(examId, user._id.toString(), {
          studentId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          socketId: socket.id,
          joinedAt: new Date(),
          responseId,
        });

        await emitOnlineStudents(io, examId);
      } catch (err) {
        socket.emit('exam:error', { message: err.message || 'Not authorized for this exam' });
      }
    });

    socket.on('exam:leave', async ({ examId }) => {
      const id = examId || socket.examId;
      if (!id) return;
      socket.leave(`exam:${id}`);
      await removeStudent(io, id, user._id.toString());
    });

    socket.on('student:heartbeat', async ({ examId, timeRemaining, currentQuestionIndex, progress }) => {
      if (!examId || user.role !== 'student') return;

      const response = socket.responseId
        ? await Response.findById(socket.responseId).select('startedAt exam status student')
        : null;

      if (!response || !response.student.equals(user._id)) return;

      const exam = response ? await Exam.findById(response.exam).select('duration endTime') : null;
      const serverTimeRemaining = response && exam ? getRemainingSeconds(response, exam) : 0;

      emitToMonitors(io, examId, 'student:status', {
        studentId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        timeRemaining: serverTimeRemaining,
        currentQuestionIndex,
        progress,
        timestamp: new Date(),
      });

      if (response && exam && response.status === 'in_progress') {
        await Response.findByIdAndUpdate(socket.responseId, {
          timeRemaining: serverTimeRemaining,
          currentQuestionIndex,
        }).catch(() => {});
      }
    });

    socket.on('monitor:subscribe', async ({ examId }) => {
      if (!['admin', 'teacher'].includes(user.role) || !examId) return;

      try {
        await assertExamMonitorAccess(user, examId);
        socket.join(monitorRoom(examId));
        socket.join(`exam:${examId}`);

        const students = await onlineStore.listStudentsForExam(examId);
        socket.emit('students:online', {
          examId,
          count: students.length,
          students,
        });
      } catch {
        socket.emit('monitor:error', { message: 'Not authorized to monitor this exam' });
      }
    });

    socket.on('disconnect', async () => {
      if (socket.examId && user.role === 'student') {
        await removeStudent(io, socket.examId, user._id.toString());
      }
    });
  });
};

const removeStudent = async (io, examId, studentId) => {
  await onlineStore.removeStudent(examId, studentId);
  await emitOnlineStudents(io, examId);
};

export { emitToMonitors, monitorRoom };
export default initSocket;
