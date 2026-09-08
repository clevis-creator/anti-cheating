import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../config/index.js';
import {
  getEmailConfigStatus,
  classifySmtpError,
  classifyApiError,
  describeSmtpFailure,
  smtpTransportOptions,
  pickIpv4Address,
  extractSenderAddress,
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
  assert.ok(['smtp', 'resend'].includes(s.provider), 'provider must be smtp or resend');
  assert.equal(s.apiKey, s.provider === 'resend' ? (config.email.apiKey ? 'set' : 'missing') : 'n/a');
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

test('classifyApiError maps provider HTTP statuses to truthful categories', () => {
  assert.equal(classifyApiError(401), 'auth-rejected');
  assert.equal(classifyApiError(403), 'auth-rejected');
  assert.equal(classifyApiError(422), 'message-rejected');
  assert.equal(classifyApiError(429), 'message-rejected');
  assert.equal(classifyApiError(500), 'api-failed');
  assert.equal(classifyApiError(502), 'api-failed');
});

test('smtpTransportOptions configure Gmail STARTTLS correctly (587, secure=false)', () => {
  const o = smtpTransportOptions();
  assert.equal(o.secure, false);
  assert.equal(o.requireTLS, true, 'requireTLS must be mandatory on port 587');
  assert.ok('user' in o.auth && 'pass' in o.auth, 'auth user/pass keys must be present');
  assert.ok(o.connectionTimeout > 0 && o.socketTimeout > 0, 'timeouts must be bounded');
});

test('smtpTransportOptions prefers a resolved IPv4 host and preserves SNI servername', () => {
  const o = smtpTransportOptions({ host: '142.250.72.19', servername: 'smtp.gmail.com' });
  assert.equal(o.host, '142.250.72.19', 'IPv4 literal must be used as the connect host');
  assert.equal(o.servername, 'smtp.gmail.com', 'original hostname must drive SNI/TLS validation');
  assert.equal(o.requireTLS, true);
  assert.equal(o.secure, false);
});

test('smtpTransportOptions keeps hostname host when no IPv4 override is available', () => {
  const o = smtpTransportOptions();
  assert.equal(o.host, config.email.host);
  assert.equal(o.servername, undefined);
});

test('pickIpv4Address returns the first resolved IPv4 address or null', () => {
  assert.equal(
    pickIpv4Address([{ address: '142.250.72.19', family: 4 }]),
    '142.250.72.19'
  );
  assert.equal(pickIpv4Address([]), null);
  assert.equal(pickIpv4Address(null), null);
  assert.equal(pickIpv4Address([{ address: '' }]), null);
});

test('smtpTransportOptions uses implicit TLS on port 465 (requireTLS not needed)', () => {
  const originalPort = config.email.port;
  config.email.port = 465;
  try {
    const o = smtpTransportOptions();
    assert.equal(o.secure, true);
    assert.equal(o.requireTLS, false);
  } finally {
    config.email.port = originalPort;
  }
});

test('describeSmtpFailure extracts structured Nodemailer fields safely', () => {
  const timeoutErr = new Error('connect ETIMEDOUT');
  timeoutErr.code = 'ETIMEDOUT';
  let d = describeSmtpFailure(timeoutErr);
  assert.equal(d.category, 'connection-failed');
  assert.equal(d.code, 'ETIMEDOUT');
  assert.equal(d.timeout, true);

  const authErr = new Error('Invalid login');
  authErr.code = 'EAUTH';
  authErr.responseCode = 534;
  authErr.response = '534-5.7.8 Please log in via your web browser';
  authErr.command = 'AUTH PLAIN';
  d = describeSmtpFailure(authErr);
  assert.equal(d.category, 'auth-rejected');
  assert.equal(d.responseCode, 534);
  assert.equal(d.command, 'AUTH PLAIN');

  const msgErr = new Error('Message rejected');
  msgErr.responseCode = 550;
  msgErr.response = '550 sender or recipient policy rejection';
  d = describeSmtpFailure(msgErr);
  assert.equal(d.category, 'message-rejected');
});

test('describeSmtpFailure redacts password-like content from responses', () => {
  const err = new Error('x');
  err.response = '550 pass=supersecret123 rejected';
  const d = describeSmtpFailure(err);
  assert.ok(!d.response.includes('supersecret123'));
  assert.ok(d.response.includes('<redacted>'));
});

test('extractSenderAddress parses display-name envelope', () => {
  assert.equal(extractSenderAddress('ExamAI <examai@gmail.com>'), 'examai@gmail.com');
  assert.equal(extractSenderAddress('examai@gmail.com'), 'examai@gmail.com');
  assert.equal(extractSenderAddress(''), '');
});

const credsConfigured =
  getEmailConfigStatus().provider === 'resend'
    ? config.email.apiKey
    : Boolean(config.email.user && config.email.pass);

test('sendEmail skips (returns skipped) when the selected provider credentials are absent', { skip: credsConfigured }, async () => {
  const out = await sendEmail({ to: 'student@example.com', subject: 'test', html: '<p>x</p>' });
  assert.deepEqual(out, { skipped: true });
});
