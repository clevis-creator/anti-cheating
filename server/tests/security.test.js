import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSEBIfRequired, isSEBRequest } from '../middleware/sebVerify.js';
import { escapeRegex } from '../utils/helpers.js';

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

test('escapeRegex neutralizes regex metacharacters used in searches', () => {
  assert.equal(new RegExp(escapeRegex('(Mid'), 'i').source, '\\(Mid');
  assert.doesNotThrow(() => new RegExp(escapeRegex('a[0-9]*')).test('abc'));
  assert.equal(new RegExp(escapeRegex('C++ 101'), 'i').test('C++ 101'), true);
  assert.equal(new RegExp(escapeRegex('C++ 101'), 'i').test('Cxx 101'), false);
});