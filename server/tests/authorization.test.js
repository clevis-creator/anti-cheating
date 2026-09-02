import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertStudentExamAccess,
  assertStudentCanViewExam,
  assertTeacherExamAccess,
  isStudentAssignedToExam,
  studentVisibleExamFilter,
} from '../utils/examAccess.js';

const teacherA = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'teacher' };
const teacherB = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', role: 'teacher' };
const studentA = { _id: 'cccccccccccccccccccccccc' };
const studentB = { _id: 'dddddddddddddddddddddddd' };

const examOwnedByA = {
  _id: 'eeeeeeeeeeeeeeeeeeeeeeee',
  createdBy: { equals: (id) => id.toString() === teacherA._id },
  status: 'published',
  assignedStudents: [studentA._id],
};

const openExam = {
  _id: 'ffffffffffffffffffffffff',
  createdBy: { equals: (id) => id.toString() === teacherA._id },
  status: 'published',
  assignedStudents: [],
};

test('student assignment helpers enforce per-student access', () => {
  assert.equal(isStudentAssignedToExam(examOwnedByA, studentA._id), true);
  assert.equal(isStudentAssignedToExam(examOwnedByA, studentB._id), false);
  assert.equal(isStudentAssignedToExam(openExam, studentB._id), true);

  assert.doesNotThrow(() => assertStudentExamAccess(examOwnedByA, studentA._id));
  assert.throws(() => assertStudentExamAccess(examOwnedByA, studentB._id), /not assigned/i);
  assert.doesNotThrow(() => assertStudentCanViewExam(openExam, studentB._id));
});

test('teacher exam access is limited to exam owner unless admin', () => {
  assert.doesNotThrow(() => assertTeacherExamAccess(teacherA, examOwnedByA));
  assert.throws(() => assertTeacherExamAccess(teacherB, examOwnedByA), /not authorized/i);
  assert.doesNotThrow(() => assertTeacherExamAccess({ role: 'admin' }, examOwnedByA));
});

test('student visible exam filter only returns assigned or open exams', () => {
  const filter = studentVisibleExamFilter(studentA._id);
  assert.deepEqual(filter.status.$in, ['published', 'active']);
  assert.equal(filter.$or.length, 2);
});

test('open exams are visible to any student while assigned exams are restricted', () => {
  assert.doesNotThrow(() => assertStudentCanViewExam(openExam, studentB._id));
  assert.throws(() => assertStudentCanViewExam(examOwnedByA, studentB._id), /not assigned/i);
});
