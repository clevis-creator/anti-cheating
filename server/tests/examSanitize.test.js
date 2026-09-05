import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeExamForStudent,
  sanitizeQuestionForStudent,
  sanitizeAIGradesForStudent,
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

test('sanitizeAIGradesForStudent strips grading-sensitive AI fields', () => {
  const aiGrade = {
    _id: 'g1',
    response: 'r1',
    question: 'q1',
    student: 's1',
    exam: 'e1',
    studentAnswer: 'essay text',
    referenceAnswer: 'model answer',
    rubric: 'rubric',
    reasoning: 'chain of thought',
    rawResponse: { candidates: [] },
    maxMarks: 10,
    score: 8,
    feedback: 'Well argued',
    suggestions: 'Add evidence',
    provider: 'gemini',
    overridden: true,
    overrideFeedback: 'Manual feedback',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [safe] = sanitizeAIGradesForStudent([aiGrade]);
  assert.equal(safe.studentAnswer, undefined);
  assert.equal(safe.referenceAnswer, undefined);
  assert.equal(safe.rubric, undefined);
  assert.equal(safe.reasoning, undefined);
  assert.equal(safe.rawResponse, undefined);
  assert.equal(safe.feedback, 'Well argued');
  assert.equal(safe.suggestions, 'Add evidence');
  assert.equal(safe.provider, 'gemini');
  assert.equal(safe.overrideFeedback, 'Manual feedback');
  assert.equal(safe.score, 8);
});

test('sanitizeAIGradesForStudent handles empty input and mongoose-like docs', () => {
  assert.deepEqual(sanitizeAIGradesForStudent(null), []);
  assert.deepEqual(sanitizeAIGradesForStudent([]), []);
  const doc = {
    toObject() {
      return { score: 5, referenceAnswer: 'secret', feedback: 'ok' };
    },
  };
  const [safe] = sanitizeAIGradesForStudent([doc]);
  assert.equal(safe.referenceAnswer, undefined);
  assert.equal(safe.feedback, 'ok');
});
