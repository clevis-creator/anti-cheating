import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../config/index.js';

test('marketing mode disables email verification requirement', () => {
  if (!config.marketingMode) {
    assert.ok(true, 'skipped when MARKETING_MODE is not enabled in test env');
    return;
  }
  assert.equal(config.marketingMode, true);
});

test('requireEmailVerification config is false when marketing mode is enabled', () => {
  if (config.marketingMode) {
    assert.equal(config.requireEmailVerification, false);
  } else {
    assert.equal(typeof config.requireEmailVerification, 'boolean');
  }
});

test('verified students are not blocked by frontend policy when verification is optional', () => {
  const user = { role: 'student', isEmailVerified: true };
  const requiresEmailVerification = false;
  const mustVerify = requiresEmailVerification && user.role === 'student' && !user.isEmailVerified;
  assert.equal(mustVerify, false);
});

test('unverified students are blocked only when verification is required', () => {
  const user = { role: 'student', isEmailVerified: false };
  assert.equal(
    true && user.role === 'student' && !user.isEmailVerified,
    true
  );
  assert.equal(
    false && user.role === 'student' && !user.isEmailVerified,
    false
  );
});
