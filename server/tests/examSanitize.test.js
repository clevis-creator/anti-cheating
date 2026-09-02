import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeExamForStudent,
  sanitizeQuestionForStudent,
} from '../utils/examSanitize.js';

const teacherQuestion = {
  _id: 'q1',
  type: 'multiple_choice',
  title: 'Sample',
  correctAnswers: ['A'],
  explanation: 'Because A',
  referenceAnswer: 'A',
  rubric: 'Full marks for A',
  options: [
    { text: 'A', isCorrect: true },
    { text: 'B', isCorrect: false },
  ],
};

test('sanitizeQuestionForStudent removes grading-sensitive fields', () => {
  const safe = sanitizeQuestionForStudent(teacherQuestion);
  assert.equal(safe.correctAnswers, undefined);
  assert.equal(safe.explanation, undefined);
  assert.equal(safe.referenceAnswer, undefined);
  assert.equal(safe.rubric, undefined);
  assert.equal(safe.options[0].isCorrect, undefined);
  assert.equal(safe.options[1].isCorrect, undefined);
  assert.equal(safe.options[0].text, 'A');
});

test('sanitizeExamForStudent strips access code and sanitizes all questions', () => {
  const exam = {
    _id: 'e1',
    title: 'Midterm',
    accessCode: 'secret',
    questions: [teacherQuestion],
  };
  const safe = sanitizeExamForStudent(exam);
  assert.equal(safe.accessCode, undefined);
  assert.equal(safe.questions.length, 1);
  assert.equal(safe.questions[0].correctAnswers, undefined);
  assert.equal(safe.questions[0].options[0].isCorrect, undefined);
});

test('teacher-facing exam data is unchanged by student sanitizer usage boundary', () => {
  const exam = { ...teacherQuestion };
  assert.equal(exam.correctAnswers[0], 'A');
  assert.equal(exam.options[0].isCorrect, true);
});
