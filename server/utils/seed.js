import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import {
  User,
  Course,
  Exam,
  Question,
  Response,
  Result,
  Notification,
  ActivityLog,
  Settings,
} from '../models/index.js';
import connectDB from '../config/db.js';
import { generateCertificate } from '../services/certificate.js';
import { calculateLetterGrade } from '../services/grading.js';

const isProduction = process.env.NODE_ENV === 'production';
const forceSeed = process.argv.includes('--force');

if (isProduction && !forceSeed) {
  console.error('Seeding is disabled in production. Re-run with --force to explicitly allow it.');
  process.exit(1);
}

const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000);
const daysFromNow = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);
const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

const seed = async () => {
  await connectDB();
  console.log('Seeding database with rich demo data...');

  if (forceSeed) {
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Exam.deleteMany({}),
      Question.deleteMany({}),
      Response.deleteMany({}),
      Result.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({}),
      Settings.deleteMany({}),
    ]);
  }

  const admin = await User.findOneAndUpdate(
    { email: 'admin@examai.com' },
    {
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@examai.com',
      password: 'Admin123!',
      role: 'admin',
      isEmailVerified: true,
      institution: 'ExamAI Academy',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const teacher = await User.findOneAndUpdate(
    { email: 'teacher@examai.com' },
    {
      firstName: 'Jane',
      lastName: 'Teacher',
      email: 'teacher@examai.com',
      password: 'Teacher123!',
      role: 'teacher',
      isEmailVerified: true,
      teacherId: 'TCH001',
      institution: 'ExamAI Academy',
      department: 'Computer Science',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const teacher2 = await User.findOneAndUpdate(
    { email: 'mark@examai.com' },
    {
      firstName: 'Mark',
      lastName: 'Davis',
      email: 'mark@examai.com',
      password: 'Teacher123!',
      role: 'teacher',
      isEmailVerified: true,
      teacherId: 'TCH002',
      institution: 'ExamAI Academy',
      department: 'Computer Science',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const john = await User.findOneAndUpdate(
    { email: 'student@examai.com' },
    {
      firstName: 'John',
      lastName: 'Student',
      email: 'student@examai.com',
      password: 'Student123!',
      role: 'student',
      isEmailVerified: true,
      studentId: 'STU001',
      institution: 'ExamAI Academy',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const alice = await User.findOneAndUpdate(
    { email: 'alice@examai.com' },
    {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@examai.com',
      password: 'Student123!',
      role: 'student',
      isEmailVerified: true,
      studentId: 'STU002',
      institution: 'ExamAI Academy',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const bob = await User.findOneAndUpdate(
    { email: 'bob@examai.com' },
    {
      firstName: 'Bob',
      lastName: 'Williams',
      email: 'bob@examai.com',
      password: 'Student123!',
      role: 'student',
      isEmailVerified: true,
      studentId: 'STU003',
      institution: 'ExamAI Academy',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const students = [john, alice, bob];

  // Ensure course exists (idempotent)
  const course = await Course.findOneAndUpdate(
    { code: 'CS101', teacher: teacher._id },
    {
      $set: {
        title: 'Introduction to Computer Science',
        description: 'Fundamentals of computing, algorithms, and programming.',
        students: students.map((s) => s._id),
        semester: 'Fall',
        academicYear: '2025-2026',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await User.updateMany(
    { _id: { $in: [teacher._id, teacher2._id, ...students.map((s) => s._id)] } },
    { $addToSet: { courses: course._id } }
  );

  // Ensure exam exists (idempotent)
  const exam = await Exam.findOneAndUpdate(
    { title: 'CS101 Midterm Examination', course: course._id },
    {
      $set: {
        description: 'Covers chapters 1-5 of the course textbook.',
        instructions:
          'Read each question carefully. You have 60 minutes. Switching tabs will trigger warnings.',
        createdBy: teacher._id,
        duration: 60,
        passingMarks: 40,
        status: 'published',
        startTime: daysAgo(1),
        endTime: daysFromNow(30),
        assignedStudents: students.map((s) => s._id),
        settings: {
          shuffleQuestions: false,
          showResults: true,
          maxAttempts: 1,
          requireFullscreen: true,
          antiCheat: {
            enabled: true,
            maxWarnings: 3,
            detectTabSwitch: true,
            disableCopyPaste: true,
            disableRightClick: true,
            disableSelection: true,
            blockDevTools: true,
            logActivity: true,
          },
          aiGrading: true,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Ensure questions are inserted idempotently
  const seedQuestions = [
    {
      title: 'What does CPU stand for?',
      type: 'multiple_choice',
      marks: 5,
      order: 0,
      difficulty: 'easy',
      tags: ['hardware', 'basics'],
      options: [
        { text: 'Central Processing Unit', isCorrect: true },
        { text: 'Computer Personal Unit', isCorrect: false },
        { text: 'Central Program Utility', isCorrect: false },
        { text: 'Control Processing Unit', isCorrect: false },
      ],
      explanation: 'CPU stands for Central Processing Unit.',
    },
    {
      title: 'RAM is a type of permanent storage.',
      type: 'true_false',
      marks: 5,
      order: 1,
      difficulty: 'easy',
      tags: ['memory'],
      options: [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: true },
      ],
      explanation: 'RAM is volatile/temporary memory.',
    },
    {
      title: 'Which of the following are programming languages? (Select all)',
      type: 'checkbox',
      marks: 10,
      order: 2,
      difficulty: 'medium',
      tags: ['programming'],
      options: [
        { text: 'Python', isCorrect: true },
        { text: 'HTML', isCorrect: false },
        { text: 'JavaScript', isCorrect: true },
        { text: 'CSS', isCorrect: false },
      ],
    },
  ];

  for (const q of seedQuestions) {
    await Question.findOneAndUpdate(
      { exam: exam._id, title: q.title },
      { $set: { ...q, exam: exam._id, createdBy: teacher._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }


  const bankQuestions = await Question.insertMany([
    {
      bank: true,
      createdBy: teacher._id,
      type: 'multiple_choice',
      title: 'What is the time complexity of binary search on a sorted array?',
      marks: 5,
      difficulty: 'medium',
      tags: ['algorithms', 'complexity', 'bank'],
      options: [
        { text: 'O(n)', isCorrect: false },
        { text: 'O(log n)', isCorrect: true },
        { text: 'O(n log n)', isCorrect: false },
        { text: 'O(1)', isCorrect: false },
      ],
      explanation: 'Binary search halves the search space each step, giving O(log n).',
    },
    {
      bank: true,
      createdBy: teacher._id,
      type: 'short_answer',
      title: 'Name one advantage of using version control systems like Git.',
      marks: 5,
      difficulty: 'easy',
      tags: ['tools', 'bank'],
      correctAnswers: [
        'track changes',
        'collaboration',
        'rollback',
        'history',
        'branching',
      ],
      explanation: 'Version control enables history tracking, collaboration, and safe rollbacks.',
    },
    {
      bank: true,
      createdBy: teacher2._id,
      type: 'true_false',
      title: 'An IP address uniquely identifies a device on a network.',
      marks: 3,
      difficulty: 'easy',
      tags: ['networking', 'bank'],
      options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ],
    },
  ]);

  const questions = await Question.find({ exam: exam._id }).sort({ order: 1 });

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  exam.questions = questions.map((q) => q._id);
  exam.totalMarks = totalMarks;
  await exam.save();

  const [q0, q1, q2, q3, q4, q5, q6, q7] = questions;

  // --- John Student: completed & published ---
  const johnAnswers = [
    {
      question: q0._id,
      answer: 'Central Processing Unit',
      isCorrect: true,
      marksAwarded: 5,
      autoGraded: true,
      timeSpent: 45,
    },
    {
      question: q1._id,
      answer: 'False',
      isCorrect: true,
      marksAwarded: 5,
      autoGraded: true,
      timeSpent: 30,
    },
    {
      question: q2._id,
      answer: ['Python', 'JavaScript'],
      isCorrect: true,
      marksAwarded: 10,
      autoGraded: true,
      timeSpent: 60,
    },
    {
      question: q3._id,
      answer: ['HTTP'],
      isCorrect: true,
      marksAwarded: 5,
      autoGraded: true,
      timeSpent: 40,
    },
    {
      question: q4._id,
      answer: 'A step-by-step procedure to solve a problem',
      isCorrect: true,
      marksAwarded: 10,
      autoGraded: true,
      timeSpent: 90,
    },
    {
      question: q5._id,
      answer:
        'A compiler translates the entire source program into machine code before it runs, producing an executable. An interpreter reads and executes the source code line by line. Compilers usually give faster runtime performance after compilation, while interpreters make debugging easier and work well for scripting and portability across platforms.',
      isCorrect: true,
      marksAwarded: 16,
      autoGraded: false,
      manuallyGraded: true,
      feedback:
        'Strong comparison of translation models and performance trade-offs. Minor detail on use cases could be expanded.',
      timeSpent: 420,
    },
    {
      question: q6._id,
      answer: {
        OS: 'Manages hardware and software resources',
        Browser: 'Retrieves and displays web content',
        Database: 'Organized collection of data',
      },
      isCorrect: true,
      marksAwarded: 15,
      autoGraded: true,
      timeSpent: 120,
    },
    {
      question: q7._id,
      answer: 'Queue',
      isCorrect: true,
      marksAwarded: 5,
      autoGraded: true,
      timeSpent: 25,
    },
  ];

  const johnObtained = johnAnswers.reduce((s, a) => s + a.marksAwarded, 0);
  const johnPercentage = Math.round((johnObtained / totalMarks) * 10000) / 100;
  const johnPassed = johnObtained >= exam.passingMarks;
  const johnGrade = calculateLetterGrade(johnPercentage);
  const johnCorrectCount = johnAnswers.filter((a) => a.isCorrect === true).length;

  const johnResponseDoc = {
    exam: exam._id,
    student: john._id,
    answers: johnAnswers,
    status: 'published',
    attemptNumber: 1,
    startedAt: hoursAgo(3),
    submittedAt: hoursAgo(2),
    timeRemaining: 0,
    currentQuestionIndex: 7,
    warnings: 1,
    warningLogs: [
      {
        type: 'tab_switch',
        message: 'Student switched away from the exam tab',
        timestamp: hoursAgo(2.5),
      },
    ],
    ipAddress: '192.168.1.42',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
    deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' },
    activityLog: [
      { action: 'exam_started', details: 'Began CS101 Midterm', timestamp: hoursAgo(3) },
      { action: 'answer_saved', details: 'Saved answer for Q1', timestamp: hoursAgo(2.8) },
      { action: 'warning', details: 'Tab switch detected', timestamp: hoursAgo(2.5) },
      { action: 'exam_submitted', details: 'Submitted successfully', timestamp: hoursAgo(2) },
    ],
    score: johnObtained,
    percentage: johnPercentage,
    passed: johnPassed,
    totalMarks,
    obtainedMarks: johnObtained,
  };

  const johnResponse = await Response.findOneAndUpdate(
    { exam: exam._id, student: john._id, attemptNumber: 1 },
    { $set: johnResponseDoc },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let certificateUrl = '';
  try {
    certificateUrl = await generateCertificate({
      studentName: `${john.firstName} ${john.lastName}`,
      examTitle: exam.title,
      percentage: johnPercentage,
      grade: johnGrade,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      institution: 'ExamAI Academy',
    });
  } catch (err) {
    console.warn('Certificate generation skipped:', err.message);
  }

  const johnResultDoc = {
    exam: exam._id,
    student: john._id,
    response: johnResponse._id,
    totalMarks,
    obtainedMarks: johnObtained,
    percentage: johnPercentage,
    grade: johnGrade,
    passed: johnPassed,
    correctCount: johnCorrectCount,
    wrongCount: questions.length - johnCorrectCount,
    unansweredCount: 0,
    published: true,
    publishedAt: hoursAgo(1),
    certificateUrl,
    teacherComments:
      'Excellent work overall. Clear understanding of core CS concepts. Watch tab-switching during future exams.',
  };

  const johnResult = await Result.findOneAndUpdate(
    { exam: exam._id, student: john._id },
    { $set: johnResultDoc },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // --- Alice: submitted, pending manual grading (essay) ---
  const aliceAnswers = [
    {
      question: q0._id,
      answer: 'Central Processing Unit',
      isCorrect: true,
      marksAwarded: 5,
      autoGraded: true,
      timeSpent: 50,
    },
    {
      question: q1._id,
      answer: 'True',
      isCorrect: false,
      marksAwarded: 0,
      autoGraded: true,
      timeSpent: 35,
    },
    {
      question: q2._id,
      answer: ['Python', 'HTML'],
      isCorrect: false,
      marksAwarded: 0,
      autoGraded: true,
      timeSpent: 70,
    },
    {
      question: q3._id,
      answer: ['HTTPS'],
      isCorrect: true,
      marksAwarded: 5,
      autoGraded: true,
      timeSpent: 40,
    },
    {
      question: q4._id,
      answer: 'A set of instructions to solve a problem',
      isCorrect: true,
      marksAwarded: 10,
      autoGraded: true,
      timeSpent: 80,
    },
    {
      question: q5._id,
      answer:
        'Compilers and interpreters both turn code into something a computer can run, but they work differently. A compiler builds the whole program into machine code first. An interpreter runs the program one line at a time without making a separate executable. I think compilers are used for languages like C, and interpreters for Python, but I am not sure about all the performance differences.',
      isCorrect: null,
      marksAwarded: 0,
      autoGraded: false,
      manuallyGraded: false,
      timeSpent: 380,
    },
    {
      question: q6._id,
      answer: {
        OS: 'Manages hardware and software resources',
        Browser: 'Organized collection of data',
        Database: 'Retrieves and displays web content',
      },
      isCorrect: false,
      marksAwarded: 5,
      autoGraded: true,
      timeSpent: 100,
    },
    {
      question: q7._id,
      answer: 'Queue',
      isCorrect: true,
      marksAwarded: 5,
      autoGraded: true,
      timeSpent: 20,
    },
  ];

  const aliceAutoMarks = aliceAnswers.reduce((s, a) => s + (a.autoGraded ? a.marksAwarded : 0), 0);

  const aliceResponseDoc = {
    exam: exam._id,
    student: alice._id,
    answers: aliceAnswers,
    status: 'submitted',
    attemptNumber: 1,
    startedAt: hoursAgo(5),
    submittedAt: hoursAgo(4),
    timeRemaining: 120,
    currentQuestionIndex: 7,
    warnings: 0,
    warningLogs: [],
    ipAddress: '192.168.1.55',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/605.1.15',
    deviceInfo: { browser: 'Safari', os: 'macOS', device: 'Desktop' },
    activityLog: [
      { action: 'exam_started', details: 'Began CS101 Midterm', timestamp: hoursAgo(5) },
      { action: 'exam_submitted', details: 'Submitted for grading', timestamp: hoursAgo(4) },
    ],
    score: aliceAutoMarks,
    percentage: Math.round((aliceAutoMarks / totalMarks) * 10000) / 100,
    passed: false,
    totalMarks,
    obtainedMarks: aliceAutoMarks,
  };

  await Response.findOneAndUpdate(
    { exam: exam._id, student: alice._id, attemptNumber: 1 },
    { $set: aliceResponseDoc },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // --- Bob: in-progress attempt (optional) ---
  const bobResponseDoc = {
    exam: exam._id,
    student: bob._id,
    answers: [
      {
        question: q0._id,
        answer: 'Central Processing Unit',
        isCorrect: null,
        marksAwarded: 0,
        autoGraded: false,
        timeSpent: 40,
      },
      {
        question: q1._id,
        answer: 'False',
        isCorrect: null,
        marksAwarded: 0,
        autoGraded: false,
        timeSpent: 25,
      },
    ],
    status: 'in_progress',
    attemptNumber: 1,
    startedAt: hoursAgo(0.5),
    timeRemaining: 55 * 60,
    currentQuestionIndex: 2,
    warnings: 0,
    ipAddress: '192.168.1.78',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/129.0',
    deviceInfo: { browser: 'Firefox', os: 'Windows', device: 'Desktop' },
    activityLog: [
      { action: 'exam_started', details: 'Began CS101 Midterm', timestamp: hoursAgo(0.5) },
    ],
    totalMarks,
    obtainedMarks: 0,
  };

  await Response.findOneAndUpdate(
    { exam: exam._id, student: bob._id, attemptNumber: 1 },
    { $set: bobResponseDoc },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const activities = await ActivityLog.insertMany([
    {
      user: admin._id,
      action: 'user.login',
      resource: 'User',
      resourceId: admin._id,
      details: 'Admin signed in',
      ipAddress: '10.0.0.1',
      severity: 'low',
      createdAt: hoursAgo(8),
    },
    {
      user: teacher._id,
      action: 'exam.create',
      resource: 'Exam',
      resourceId: exam._id,
      details: `Created exam "${exam.title}"`,
      exam: exam._id,
      severity: 'low',
      createdAt: daysAgo(2),
    },
    {
      user: teacher._id,
      action: 'exam.publish',
      resource: 'Exam',
      resourceId: exam._id,
      details: `Published exam "${exam.title}"`,
      exam: exam._id,
      severity: 'medium',
      createdAt: daysAgo(1),
    },
    {
      user: john._id,
      action: 'exam.start',
      resource: 'Exam',
      resourceId: exam._id,
      details: 'John Student started the midterm',
      exam: exam._id,
      severity: 'low',
      createdAt: hoursAgo(3),
    },
    {
      user: john._id,
      action: 'anti_cheat.warning',
      resource: 'Response',
      resourceId: johnResponse._id,
      details: 'Tab switch detected during exam',
      exam: exam._id,
      severity: 'high',
      createdAt: hoursAgo(2.5),
    },
    {
      user: john._id,
      action: 'exam.submit',
      resource: 'Response',
      resourceId: johnResponse._id,
      details: 'John Student submitted the midterm',
      exam: exam._id,
      severity: 'low',
      createdAt: hoursAgo(2),
    },
    {
      user: teacher._id,
      action: 'grading.complete',
      resource: 'Result',
      resourceId: johnResult._id,
      details: 'Graded and published results for John Student',
      exam: exam._id,
      severity: 'low',
      createdAt: hoursAgo(1),
    },
    {
      user: alice._id,
      action: 'exam.submit',
      resource: 'Exam',
      resourceId: exam._id,
      details: 'Alice Johnson submitted — awaiting essay grading',
      exam: exam._id,
      severity: 'low',
      createdAt: hoursAgo(4),
    },
    {
      user: bob._id,
      action: 'exam.start',
      resource: 'Exam',
      resourceId: exam._id,
      details: 'Bob Williams started the midterm',
      exam: exam._id,
      severity: 'low',
      createdAt: hoursAgo(0.5),
    },
    {
      user: admin._id,
      action: 'settings.update',
      resource: 'Settings',
      details: 'Updated allow_registration and AI provider settings',
      severity: 'medium',
      createdAt: hoursAgo(6),
    },
    {
      user: teacher2._id,
      action: 'question.bank_add',
      resource: 'Question',
      resourceId: bankQuestions[2]._id,
      details: 'Added bank question about IP addresses',
      severity: 'low',
      createdAt: hoursAgo(10),
    },
  ]);

  const notifications = await Notification.insertMany([
    {
      recipient: admin._id,
      title: 'New registration setting',
      message: 'Public registration is currently enabled for ExamAI.',
      type: 'system',
      link: '/admin/settings',
      read: false,
    },
    {
      recipient: admin._id,
      title: 'Exam activity summary',
      message: 'CS101 Midterm has submissions from 2 students; 1 attempt in progress.',
      type: 'info',
      link: `/admin/exams/${exam._id}`,
      read: true,
    },
    {
      recipient: teacher._id,
      title: 'Grading queue',
      message: 'Alice Johnson submitted CS101 Midterm — essay answer needs grading.',
      type: 'exam',
      link: `/teacher/grading`,
      read: false,
      meta: { examId: exam._id, studentId: alice._id },
    },
    {
      recipient: teacher._id,
      title: 'Results published',
      message: `John Student's results for ${exam.title} were published (${johnPercentage}%, ${johnGrade}).`,
      type: 'grade',
      link: `/teacher/results`,
      read: true,
    },
    {
      recipient: teacher._id,
      title: 'Anti-cheat alert',
      message: 'Tab-switch warning recorded for John Student during CS101 Midterm.',
      type: 'warning',
      link: `/teacher/exams/${exam._id}`,
      read: false,
    },
    {
      recipient: john._id,
      title: 'Results available',
      message: `Your results for ${exam.title} are published. Score: ${johnObtained}/${totalMarks} (${johnPercentage}%). Grade: ${johnGrade}.`,
      type: 'grade',
      link: `/student/results`,
      read: false,
      meta: { resultId: johnResult._id, examId: exam._id },
    },
    {
      recipient: john._id,
      title: 'Certificate ready',
      message: certificateUrl
        ? 'Your achievement certificate has been generated.'
        : 'You passed! Open your result page to generate your certificate.',
      type: 'success',
      link: `/student/results`,
      read: false,
    },
    {
      recipient: alice._id,
      title: 'Submission received',
      message: `Your answers for ${exam.title} were submitted and are awaiting teacher review.`,
      type: 'exam',
      link: `/student/exams/${exam._id}`,
      read: true,
    },
    {
      recipient: bob._id,
      title: 'Exam in progress',
      message: `You have an in-progress attempt for ${exam.title}. Resume before time runs out.`,
      type: 'warning',
      link: `/student/exams/${exam._id}`,
      read: false,
    },
    {
      recipient: teacher2._id,
      title: 'Course access',
      message: 'You have been added as co-teacher context for CS101 question bank contributions.',
      type: 'info',
      link: `/teacher/courses/${course._id}`,
      read: false,
    },
  ]);

  const seedSettings = [
    { key: 'site_name', value: 'ExamAI', updatedBy: admin._id },
    { key: 'ai_provider', value: 'gemini', updatedBy: admin._id },
    { key: 'allow_registration', value: true, updatedBy: admin._id },
    { key: 'gemini_api_key', value: '', updatedBy: admin._id },
    { key: 'openai_api_key', value: '', updatedBy: admin._id },
  ];

  for (const s of seedSettings) {
    await Settings.findOneAndUpdate({ key: s.key }, { $set: s }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  console.log('Seed complete!');
  console.log('--- Demo Accounts ---');
  console.log('Admin:    admin@examai.com / Admin123!');
  console.log('Teacher:  teacher@examai.com / Teacher123!');
  console.log('Teacher2: mark@examai.com / Teacher123!');
  console.log('Student:  student@examai.com / Student123!  (John — published result)');
  console.log('Student:  alice@examai.com / Student123!    (submitted, pending grade)');
  console.log('Student:  bob@examai.com / Student123!      (in progress)');
  console.log('--- Summary ---');
  console.log(`Users:          ${await User.countDocuments()}`);
  console.log(`Courses:        ${await Course.countDocuments()} (${course.code})`);
  console.log(`Exams:          ${await Exam.countDocuments()} (${exam.title}, ${totalMarks} marks)`);
  console.log(
    `Questions:      ${await Question.countDocuments()} (${questions.length} exam + ${bankQuestions.length} bank)`
  );
  console.log(`Responses:      ${await Response.countDocuments()}`);
  console.log(`Results:        ${await Result.countDocuments()} (published: ${johnPassed ? 'passed' : 'failed'}, cert: ${certificateUrl || 'none'})`);
  console.log(`Activity logs:  ${activities.length}`);
  console.log(`Notifications:  ${notifications.length}`);
  console.log(`Settings:       ${await Settings.countDocuments()}`);

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
