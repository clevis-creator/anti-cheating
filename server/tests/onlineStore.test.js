import test from 'node:test';
import assert from 'node:assert/strict';
import { setStudent, removeStudent, listFromStore } from '../utils/onlineStore.js';

test('in-memory online store tracks students per exam', async () => {
  const examId = 'exam-online-store-test';
  const meta = { studentId: 'student-1', name: 'Test Student' };

  await setStudent(examId, 'student-1', meta);
  const list = await listFromStore(examId);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Test Student');

  await removeStudent(examId, 'student-1');
  assert.equal((await listFromStore(examId)).length, 0);
});
