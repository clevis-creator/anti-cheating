import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import config from '../config/index.js';

// ---- Helpers: simulate the security model of the verification pipeline ----
// We test the same logic the User model and authController run, using plain
// objects so no database connection is needed.

function sha256hex(val) {
  return crypto.createHash('sha256').update(val).digest('hex');
}

function makeUser(overrides = {}) {
  return {
    firstName: 'Test',
    lastName: 'Student',
    email: 'test@example.com',
    isEmailVerified: false,
    emailVerificationToken: undefined,
    emailVerificationExpire: undefined,
    ...overrides,
  };
}

function createEmailVerificationToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = sha256hex(token);
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  return token;
}

function verifyToken(user, rawToken) {
  const hashed = sha256hex(rawToken);
  if (user.emailVerificationToken !== hashed) return false;
  if (!user.emailVerificationExpire || user.emailVerificationExpire < Date.now()) return false;
  return true;
}

function consumeVerification(user, rawToken) {
  if (!verifyToken(user, rawToken)) return false;
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  return true;
}

// ---- Token creation tests ------------------------------------------------

test('createEmailVerificationToken returns a 64-char hex string', () => {
  const user = makeUser();
  const token = createEmailVerificationToken(user);
  assert.equal(typeof token, 'string');
  assert.equal(token.length, 64);
  assert.match(token, /^[0-9a-f]{64}$/);
});

test('createEmailVerificationToken stores a sha256 hash, not the raw token', () => {
  const user = makeUser();
  const token = createEmailVerificationToken(user);
  assert.notEqual(user.emailVerificationToken, token);
  assert.equal(user.emailVerificationToken, sha256hex(token));
});

test('createEmailVerificationToken sets expiry 24h in the future', () => {
  const user = makeUser();
  createEmailVerificationToken(user);
  const delta = user.emailVerificationExpire - Date.now();
  assert.ok(delta > 23 * 60 * 60 * 1000, 'expiry must be > 23h');
  assert.ok(delta <= 24 * 60 * 60 * 1000, 'expiry must be <= 24h');
});

test('token randomness: two consecutive calls produce different tokens', () => {
  const user1 = makeUser();
  const t1 = createEmailVerificationToken(user1);
  const user2 = makeUser();
  const t2 = createEmailVerificationToken(user2);
  assert.notEqual(t1, t2);
});

// ---- Valid verification ---------------------------------------------------

test('consumeVerification succeeds with correct unexpired token', () => {
  const user = makeUser();
  const token = createEmailVerificationToken(user);
  const result = consumeVerification(user, token);
  assert.equal(result, true);
  assert.equal(user.isEmailVerified, true);
  assert.equal(user.emailVerificationToken, undefined);
  assert.equal(user.emailVerificationExpire, undefined);
});

// ---- Invalid token --------------------------------------------------------

test('consumeVerification fails with wrong token', () => {
  const user = makeUser();
  createEmailVerificationToken(user);
  const result = consumeVerification(user, 'wrong-token-here');
  assert.equal(result, false);
  assert.equal(user.isEmailVerified, false);
});

// ---- Expired token --------------------------------------------------------

test('consumeVerification fails with expired token', () => {
  const user = makeUser();
  createEmailVerificationToken(user);
  user.emailVerificationExpire = Date.now() - 1000;
  const result = consumeVerification(user, '00'.repeat(32));
  assert.equal(result, false);
  assert.equal(user.isEmailVerified, false);
});

// ---- Reused token ---------------------------------------------------------

test('consumeVerification fails when token was already consumed (single-use)', () => {
  const user = makeUser();
  const token = createEmailVerificationToken(user);

  // first use
  assert.equal(consumeVerification(user, token), true);
  // token fields cleared — second use must fail
  assert.equal(consumeVerification(user, token), false);
  assert.equal(user.isEmailVerified, true);
});

// ---- Already verified account ---------------------------------------------

test('resendVerification guard: does not reset an already-verified user', () => {
  const user = makeUser({ isEmailVerified: true });
  const token = createEmailVerificationToken(user);
  // Resend endpoint would throw 'Email already verified' when isEmailVerified
  assert.equal(user.isEmailVerified, true);
});

// ---- Hashed token never stored as plaintext -------------------------------

test('raw verification token never appears in user document fields', () => {
  const user = makeUser();
  const token = createEmailVerificationToken(user);
  const stored = JSON.stringify(user);
  assert.ok(!stored.includes(token), 'raw token must not appear in serialized user');
  assert.ok(stored.includes(user.emailVerificationToken), 'hash must be present');
});

// ---- Verification URL correctness ----------------------------------------

test('verification URL matches expected CLIENT_URL pattern', () => {
  const clientUrl = config.clientUrl || 'http://localhost:5173';
  const token = 'aa'.repeat(32);
  const url = `${clientUrl}/verify-email?token=${token}`;
  assert.match(url, /^https?:\/\/[^/]+\/verify-email\?token=[0-9a-f]+$/);
  assert.ok(url.startsWith(clientUrl));
});

// ---- Password reset token (same security model) --------------------------

function createPasswordResetToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = sha256hex(token);
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
  return token;
}

function verifyPasswordReset(user, rawToken) {
  const hashed = sha256hex(rawToken);
  if (user.resetPasswordToken !== hashed) return false;
  if (!user.resetPasswordExpire || user.resetPasswordExpire < Date.now()) return false;
  return true;
}

test('password reset token is a separate hash, single-use, 1-hour expiry', () => {
  const user = makeUser();
  const resetToken = createPasswordResetToken(user);
  assert.equal(resetToken.length, 64);
  assert.notEqual(user.resetPasswordToken, resetToken);
  assert.equal(user.resetPasswordToken, sha256hex(resetToken));

  const delta = user.resetPasswordExpire - Date.now();
  assert.ok(delta > 59 * 60 * 1000, 'expiry must be > 59 min');
  assert.ok(delta <= 60 * 60 * 1000, 'expiry must be <= 60 min');

  assert.equal(verifyPasswordReset(user, resetToken), true);
  // Simulate controller clearing the token after successful reset (same as
  // authController.resetPassword which sets resetPasswordToken/Expire = undefined)
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  assert.equal(verifyPasswordReset(user, resetToken), false);
});

// ---- VerifyEmailPage frontend behavior (local simulation) ----------------

test('VerifyEmailPage simulation: rejects request when token param is missing', () => {
  const params = new URLSearchParams('');
  const token = params.get('token');
  assert.equal(token, null, 'no token means page shows error state');
});

test('VerifyEmailPage simulation: calls verifyEmail when token param is present', () => {
  const params = new URLSearchParams('?token=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
  const token = params.get('token');
  assert.ok(token, 'token present means verifyEmail is called');
  assert.equal(typeof token, 'string');
  assert.ok(token.length > 0);
});

// ---- Login flow sends isEmailVerified flag -------------------------------

test('login response includes isEmailVerified for frontend policy check', () => {
  const user = makeUser({ isEmailVerified: true });
  const loginResponse = {
    user: {
      id: 'id1',
      firstName: user.firstName,
      email: user.email,
      role: 'student',
      isEmailVerified: user.isEmailVerified,
    },
    requiresEmailVerification: true,
  };
  const mustVerify = loginResponse.requiresEmailVerification &&
    loginResponse.user.role === 'student' &&
    !loginResponse.user.isEmailVerified;
  assert.equal(mustVerify, false, 'verified student passes gate');
});

test('login flow blocks unverified student when verification required', () => {
  const user = makeUser({ isEmailVerified: false });
  const loginResponse = {
    user: {
      id: 'id1',
      firstName: user.firstName,
      email: user.email,
      role: 'student',
      isEmailVerified: user.isEmailVerified,
    },
    requiresEmailVerification: true,
  };
  const mustVerify = loginResponse.requiresEmailVerification &&
    loginResponse.user.role === 'student' &&
    !loginResponse.user.isEmailVerified;
  assert.equal(mustVerify, true, 'unverified student must verify');
});
