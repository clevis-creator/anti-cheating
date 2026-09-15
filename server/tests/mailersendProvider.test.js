import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../config/index.js';
import {
  getEmailConfigStatus,
  classifyApiError,
  extractSenderAddress,
  extractSenderName,
  sendEmail,
} from '../utils/email.js';

const originalEnv = {
  provider: config.email.provider,
  mailersendApiKey: config.email.mailersendApiKey,
  from: config.email.from,
};

function setMailersendEnv(overrides = {}) {
  config.email.provider = 'mailersend';
  config.email.mailersendApiKey = overrides.apiKey ?? 'mlsn_test_key_1234567890abcdef1234567890ab';
  config.email.from = overrides.from ?? 'ExamAI <MS_test@trial-abc123.mailersend.net>';
}

function restoreEnv() {
  config.email.provider = originalEnv.provider;
  config.email.mailersendApiKey = originalEnv.mailersendApiKey;
  config.email.from = originalEnv.from;
}

// ---- Provider configuration tests ----------------------------------------

test('getEmailConfigStatus reports mailersendApiKey for mailersend provider', () => {
  setMailersendEnv();
  try {
    const s = getEmailConfigStatus();
    assert.equal(s.provider, 'mailersend');
    assert.equal(s.mailersendApiKey, 'set');
    assert.equal(s.apiKey, 'n/a');
  } finally {
    restoreEnv();
  }
});

test('getEmailConfigStatus reports missing when MAILERSEND_API_KEY is empty', () => {
  setMailersendEnv({ apiKey: '' });
  try {
    const s = getEmailConfigStatus();
    assert.equal(s.provider, 'mailersend');
    assert.equal(s.mailersendApiKey, 'missing');
  } finally {
    restoreEnv();
  }
});

test('selectedProvider returns mailersend when EMAIL_PROVIDER is mailersend', () => {
  setMailersendEnv();
  try {
    const s = getEmailConfigStatus();
    assert.equal(s.provider, 'mailersend');
  } finally {
    restoreEnv();
  }
});

// ---- extractSenderAddress / extractSenderName tests -----------------------

test('extractSenderName parses display-name from "Name <email>" format', () => {
  assert.equal(extractSenderName('ExamAI <test@trial-abc.mailersend.net>'), 'ExamAI');
  assert.equal(extractSenderName('test@trial-abc.mailersend.net'), '');
  assert.equal(extractSenderName(''), '');
  assert.equal(extractSenderName(null), '');
});

test('extractSenderAddress parses email from "Name <email>" format', () => {
  assert.equal(extractSenderAddress('ExamAI <MS_test@trial-abc.mailersend.net>'), 'MS_test@trial-abc.mailersend.net');
  assert.equal(extractSenderAddress('MS_test@trial-abc.mailersend.net'), 'MS_test@trial-abc.mailersend.net');
  assert.equal(extractSenderAddress(''), '');
});

// ---- Provider send request tests (mocked fetch) --------------------------

function mockFetchSuccess(messageId = 'ms_msg_abc123') {
  const calls = [];
  const handler = async (url, opts) => {
    calls.push({ url, method: opts.method, headers: opts.headers, body: opts.body });
    return {
      ok: true,
      status: 202,
      json: async () => ({ message_id: messageId }),
    };
  };
  return { handler, calls };
}

function mockFetchError(status, body = {}) {
  return async () => ({
    ok: false,
    status,
    json: async () => body,
  });
}

function mockFetchNetworkError(msg = 'fetch failed') {
  return async () => { throw new Error(msg); };
}

test('sendEmail sends POST to MailerSend API with correct headers and body', async () => {
  setMailersendEnv();
  const { handler, calls } = mockFetchSuccess('ms_msg_456');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    const result = await sendEmail({
      to: 'student@example.com',
      subject: 'Verify',
      html: '<p>Click</p>',
      text: 'Click',
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.mailersend.com/v1/email');
    assert.equal(calls[0].method, 'POST');
    assert.match(calls[0].headers.Authorization, /^Bearer /);
    assert.equal(calls[0].headers['Content-Type'], 'application/json');

    const body = JSON.parse(calls[0].body);
    assert.equal(body.from.email, 'MS_test@trial-abc123.mailersend.net');
    assert.equal(body.from.name, 'ExamAI');
    assert.deepEqual(body.to, [{ email: 'student@example.com' }]);
    assert.equal(body.subject, 'Verify');
    assert.equal(body.html, '<p>Click</p>');
    assert.equal(body.text, 'Click');

    assert.equal(result.provider, 'mailersend');
    assert.equal(result.messageId, 'ms_msg_456');
    assert.equal(result.response, 'HTTP 202');
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('sendEmail falls back to plainTextFromHtml when text is not provided', async () => {
  setMailersendEnv();
  const { handler, calls } = mockFetchSuccess();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    await sendEmail({
      to: 'student@example.com',
      subject: 'Verify',
      html: '<p style="font-size:14px">Hello <strong>Student</strong></p>',
    });
    const body = JSON.parse(calls[0].body);
    assert.equal(typeof body.text, 'string');
    assert.ok(body.text.includes('Hello Student'));
    assert.ok(!body.text.includes('<strong>'));
    assert.ok(!body.text.includes('style'));
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('sendEmail returns {skipped: true} when MAILERSEND_API_KEY is missing', async () => {
  setMailersendEnv({ apiKey: '' });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchSuccess().handler;
  try {
    const result = await sendEmail({
      to: 'student@example.com',
      subject: 'Verify',
      html: '<p>Click</p>',
    });
    assert.deepEqual(result, { skipped: true });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('sendEmail throws with category=config-error when EMAIL_FROM is empty', async () => {
  setMailersendEnv({ from: '' });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchSuccess().handler;
  try {
    await assert.rejects(
      () => sendEmail({ to: 'x@y.com', subject: 's', html: '<p>x</p>' }),
      (err) => {
        assert.equal(err.category, 'config-error');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

// ---- Provider error classification tests ---------------------------------

test('sendEmail surfaces category=auth-rejected on 401', async () => {
  setMailersendEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchError(401);
  try {
    await assert.rejects(
      () => sendEmail({ to: 'x@y.com', subject: 's', html: '<p>x</p>' }),
      (err) => {
        assert.equal(err.category, 'auth-rejected');
        assert.equal(err.statusCode, 401);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('sendEmail surfaces category=auth-rejected on 403', async () => {
  setMailersendEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchError(403);
  try {
    await assert.rejects(
      () => sendEmail({ to: 'x@y.com', subject: 's', html: '<p>x</p>' }),
      (err) => {
        assert.equal(err.category, 'auth-rejected');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('sendEmail surfaces category=message-rejected on 400', async () => {
  setMailersendEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchError(400);
  try {
    await assert.rejects(
      () => sendEmail({ to: 'x@y.com', subject: 's', html: '<p>x</p>' }),
      (err) => {
        assert.equal(err.category, 'message-rejected');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('sendEmail surfaces category=rate-limited on 429', async () => {
  setMailersendEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchError(429);
  try {
    await assert.rejects(
      () => sendEmail({ to: 'x@y.com', subject: 's', html: '<p>x</p>' }),
      (err) => {
        assert.equal(err.category, 'rate-limited');
        assert.equal(err.statusCode, 429);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('sendEmail surfaces category=api-failed on 500', async () => {
  setMailersendEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchError(500);
  try {
    await assert.rejects(
      () => sendEmail({ to: 'x@y.com', subject: 's', html: '<p>x</p>' }),
      (err) => {
        assert.equal(err.category, 'api-failed');
        assert.equal(err.statusCode, 500);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('sendEmail surfaces category=message-rejected on 422', async () => {
  setMailersendEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchError(422, { message: 'Validation failed' });
  try {
    await assert.rejects(
      () => sendEmail({ to: 'x@y.com', subject: 's', html: '<p>x</p>' }),
      (err) => {
        assert.equal(err.category, 'message-rejected');
        assert.equal(err.statusCode, 422);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('sendEmail propagates network failure as throw', async () => {
  setMailersendEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchNetworkError('ECONNREFUSED');
  try {
    await assert.rejects(
      () => sendEmail({ to: 'x@y.com', subject: 's', html: '<p>x</p>' }),
      (err) => {
        assert.ok(err.message.includes('ECONNREFUSED'));
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('sendEmail timeout propagates as AbortError on slow response', async () => {
  setMailersendEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => new Promise((_, reject) =>
    setTimeout(() => reject(new Error('The operation was aborted')), 10)
  );
  try {
    await assert.rejects(
      () => sendEmail({ to: 'x@y.com', subject: 's', html: '<p>x</p>' }),
      (err) => {
        assert.ok(/abort|timeout/i.test(err.message) || err.name === 'AbortError');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

// ---- Provider request structure tests ------------------------------------

test('sendEmail omits from.name when EMAIL_FROM has no display name', async () => {
  setMailersendEnv({ from: 'MS_test@trial-abc123.mailersend.net' });
  const { handler, calls } = mockFetchSuccess();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    await sendEmail({ to: 'x@y.com', subject: 's', html: '<p>x</p>' });
    const body = JSON.parse(calls[0].body);
    assert.equal(body.from.email, 'MS_test@trial-abc123.mailersend.net');
    assert.equal(body.from.name, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
