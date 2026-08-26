import jwt from 'jsonwebtoken';

import config from '../config/index.js';

import { User, Response, Exam } from '../models/index.js';

import { assertExamMonitorAccess } from '../utils/examAccess.js';
import { getRemainingSeconds } from '../utils/examTiming.js';



const onlineStudents = new Map(); // examId -> Map(studentId -> socketMeta)



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

      if (!examId) return;

      socket.join(`exam:${examId}`);

      socket.examId = examId;

      socket.responseId = responseId;



      if (user.role === 'student') {

        if (!onlineStudents.has(examId)) onlineStudents.set(examId, new Map());

        onlineStudents.get(examId).set(user._id.toString(), {

          studentId: user._id,

          name: `${user.firstName} ${user.lastName}`,

          socketId: socket.id,

          joinedAt: new Date(),

          responseId,

        });



        io.to(`exam:${examId}`).emit('students:online', {

          examId,

          count: onlineStudents.get(examId).size,

          students: Array.from(onlineStudents.get(examId).values()),

        });

      }

    });



    socket.on('exam:leave', ({ examId }) => {

      const id = examId || socket.examId;

      if (!id) return;

      socket.leave(`exam:${id}`);

      removeStudent(io, id, user._id.toString());

    });



    socket.on('student:heartbeat', async ({ examId, timeRemaining, currentQuestionIndex, progress }) => {

      if (!examId) return;

      const response = socket.responseId
        ? await Response.findById(socket.responseId).select('startedAt exam status')
        : null;
      const exam = response ? await Exam.findById(response.exam).select('duration endTime') : null;
      const serverTimeRemaining = response && exam ? getRemainingSeconds(response, exam) : 0;

      io.to(`exam:${examId}`).emit('student:status', {

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

        socket.join(`exam:${examId}`);

        const students = onlineStudents.get(examId);

        socket.emit('students:online', {

          examId,

          count: students?.size || 0,

          students: students ? Array.from(students.values()) : [],

        });

      } catch {

        socket.emit('monitor:error', { message: 'Not authorized to monitor this exam' });

      }

    });



    socket.on('disconnect', () => {

      if (socket.examId && user.role === 'student') {

        removeStudent(io, socket.examId, user._id.toString());

      }

    });

  });

};



const removeStudent = (io, examId, studentId) => {

  const map = onlineStudents.get(examId);

  if (!map) return;

  map.delete(studentId);

  io.to(`exam:${examId}`).emit('students:online', {

    examId,

    count: map.size,

    students: Array.from(map.values()),

  });

  if (map.size === 0) onlineStudents.delete(examId);

};



export default initSocket;


