import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../config/index.js';
import {
  getEmailConfigStatus,
  classifySmtpError,
  sendEmail,
} from '../utils/email.js';

test('getEmailConfigStatus reports masked config without exposing credentials', () => {
  const s = getEmailConfigStatus();
  assert.equal(typeof s.nodeEnv, 'string');
  assert.equal(typeof s.host, 'string');
  assert.equal(typeof s.port, 'number');
  assert.equal(typeof s.secure, 'boolean');
  assert.ok(['set', 'missing'].includes(s.user), 'user must be reported as set or missing');
  assert.ok(['set', 'missing'].includes(s.pass), 'pass must be reported as set or missing');
  assert.equal(typeof s.from, 'string');
  assert.equal(typeof s.linksBase, 'string');
  if (config.email.user) assert.equal(s.user, 'set');
  if (config.email.pass) assert.equal(s.pass, 'set');
});

test('classifySmtpError distinguishes auth, connection, and message rejection', () => {
  assert.equal(
    classifySmtpError(new Error('Invalid login: 535 5.7.8 Username and Password not accepted')),
    'auth-rejected'
  );
  assert.equal(
    classifySmtpError(new Error('SMTP connection closed. 534 5.7.9 Application-specific password required')),
    'auth-rejected'
  );
  assert.equal(
    classifySmtpError(new Error('connect ECONNREFUSED 127.0.0.1:587')),
    'connection-failed'
  );
  assert.equal(
    classifySmtpError(new Error('Could not connect to SMTP host: ETIMEDOUT')),
    'connection-failed'
  );
  assert.equal(
    classifySmtpError(new Error('550 5.7.0 Message rejected due to sender policy')),
    'message-rejected'
  );
  assert.equal(classifySmtpError(new Error('something unrelated')), 'unknown-error');
});

test('sendEmail skips (returns skipped) when SMTP credentials are absent', { skip: Boolean(config.email.user && config.email.pass) }, async () => {
  const out = await sendEmail({ to: 'student@example.com', subject: 'test', html: '<p>x</p>' });
  assert.deepEqual(out, { skipped: true });
});