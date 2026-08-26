import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSEBIfRequired, isSEBRequest } from '../middleware/sebVerify.js';

function request(headers = {}) {
  return {
    get(name) {
      return headers[name.toLowerCase()] || '';
    },
  };
}

test('detects Safe Exam Browser requests from the user agent', () => {
  assert.equal(isSEBRequest(request({ 'user-agent': 'SafeExamBrowser/3.7' })), true);
});

test('requires the configured SEB configuration key hash', () => {
  const exam = { settings: { requireSEB: true }, sebConfigKeyHash: 'abc123' };
  const sebRequest = request({
    'user-agent': 'SafeExamBrowser/3.7',
    'x-safeexambrowser-configkeyhash': 'abc123',
  });

  assert.doesNotThrow(() => assertSEBIfRequired(exam, sebRequest));
  assert.throws(
    () => assertSEBIfRequired(exam, request({ 'user-agent': 'SafeExamBrowser/3.7' })),
    /Invalid Safe Exam Browser configuration/
  );
});