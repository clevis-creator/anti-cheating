import test from 'node:test';
import assert from 'node:assert/strict';
import { autoGradeAnswer } from '../services/grading.js';
import { getRemainingSeconds, isExamExpired } from '../utils/examTiming.js';

test('grades a correct multiple-choice answer at full marks', () => {
  const question = {
    type: 'multiple_choice',
    marks: 5,
    options: [{ text: 'Correct', isCorrect: true }, { text: 'Wrong', isCorrect: false }],
  };

  assert.deepEqual(autoGradeAnswer(question, 'Correct'), {
    isCorrect: true,
    marksAwarded: 5,
    autoGraded: true,
  });
});

test('awards proportional marks for fill-in-the-blank answers', () => {
  const question = {
    type: 'fill_blank',
    marks: 10,
    blanks: [{ answers: ['Paris'] }, { answers: ['France'] }],
  };

  assert.equal(autoGradeAnswer(question, ['Paris', 'Spain']).marksAwarded, 5);
});

test('leaves essays for manual or AI grading', () => {
  const result = autoGradeAnswer({ type: 'essay', marks: 20 }, 'An answer');
  assert.deepEqual(result, { isCorrect: null, marksAwarded: 0, autoGraded: false });
});

test('calculates remaining time from the server deadline', () => {
  const startedAt = Date.parse('2026-08-25T10:00:00.000Z');
  const now = Date.parse('2026-08-25T10:12:30.000Z');

  assert.equal(
    getRemainingSeconds({ startedAt }, { duration: 30 }, now),
    1050
  );
});

test('clamps remaining time to the earlier scheduled exam end', () => {
  const startedAt = Date.parse('2026-08-25T10:00:00.000Z');
  const now = Date.parse('2026-08-25T10:12:30.000Z');
  const endTime = Date.parse('2026-08-25T10:15:00.000Z');

  assert.equal(getRemainingSeconds({ startedAt }, { duration: 60, endTime }, now), 150);
  assert.equal(isExamExpired({ startedAt }, { duration: 60, endTime }, endTime), true);
});
