import dns from 'node:dns/promises';
import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter = null;

let warnedMissing = false;

let warnedFromMismatch = false;

// ---- Production-safe email diagnostics -------------------------------------
// These helpers never return or log secrets: EMAIL_PASS, JWT, tokens.
// EMAIL_USER / EMAIL_PASS / RESEND_API_KEY are reported only as "set" or
// "missing". The link base URL is safe to log because it is the public
// frontend origin that the verification link points to.

// Transport selection:
//   EMAIL_PROVIDER=smtp    (default) Nodemailer on EMAIL_HOST/PORT/USER/PASS.
//   EMAIL_PROVIDER=resend  HTTPS transactional API (works on Render/Vercel
//                          without reachable SMTP ports). Uses RESEND_API_KEY.
const selectedProvider = () => (config.email.provider === 'resend' ? 'resend' : 'smtp');

export const getEmailConfigStatus = () => {
  const provider = selectedProvider();
  return {
    nodeEnv: config.nodeEnv,
    provider,
    host: config.email.host || '(unset)',
    port: config.email.port,
    secure: config.email.port === 465,
    user: config.email.user ? 'set' : 'missing',
    pass: config.email.pass ? 'set' : 'missing',
    apiKey: provider === 'resend' ? (config.email.apiKey ? 'set' : 'missing') : 'n/a',
    from: config.email.from || '(unset)',
    linksBase: config.clientUrl,
  };
};

export const classifySmtpError = (err) => {
  const msg = (err && err.message) || String(err);
  if (/invalid login|authentication|credentials|username and password|535|534|5\.7\.8|5\.7\.9/i.test(msg)) {
    return 'auth-rejected';
  }
  if (/connect|ECONN|ETIMEDOUT|EHOST|ESOCKET|TLS|STARTTLS|timeout|timed out/i.test(msg)) {
    return 'connection-failed';
  }
  if (/554|550|553|sender|recipient|rejected|spam|policy/i.test(msg)) {
    return 'message-rejected';
  }
  return 'unknown-error';
};

export const classifyApiError = (status) => {
  if (status === 401 || status === 403) return 'auth-rejected';
  if (status >= 500) return 'api-failed';
  return 'message-rejected';
};

const sanitizeErrorDetail = (err) => {
  const msg = (err && err.message) || String(err);
  return msg.replace(/(pass(?:word)?\s*[:=]\s*)[^\s,;"']+/gi, '$1<redacted>').slice(0, 300);
};

// Structured, secret-safe SMTP failure diagnostics. Never logs EMAIL_PASS or
// other secrets. Surfaces Nodemailer's own fields so an operator can tell
// apart connection failure, TLS failure, timeout, authentication rejection,
// sender/recipient rejection, and provider rejection.
export const describeSmtpFailure = (err) => {
  return {
    category: classifySmtpError(err),
    code: err && err.code ? String(err.code).slice(0, 60) : undefined,
    responseCode: err && err.responseCode != null ? Number(err.responseCode) : undefined,
    response: err && typeof err.response === 'string' ? sanitizeErrorDetail(String(err.response)) : '',
    command: err && err.command ? String(err.command).slice(0, 120) : undefined,
    timeout: Boolean(
      (err && err.code === 'ETIMEDOUT') ||
      /ETIMEDOUT|timeout|timed out/i.test((err && err.message) || String(err))
    ),
  };
};

const formatSmtpDiagnostics = (err) => {
  const d = describeSmtpFailure(err);
  const parts = [`category=${d.category}`];
  if (d.code) parts.push(`code=${d.code}`);
  if (d.responseCode != null) parts.push(`smtpCode=${d.responseCode}`);
  if (d.timeout) parts.push('timeout=true');
  if (d.command) parts.push(`command=${d.command}`);
  if (d.response) parts.push(`smtpResponse=${d.response}`);
  return parts.join(' | ');
};

const resendHeaders = () => ({
  Authorization: `Bearer ${config.email.apiKey}`,
  'Content-Type': 'application/json',
});

const API_TIMEOUT_MS = 15 * 1000;

const sendViaApi = async ({ to, subject, html, text }) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: resendHeaders(),
    body: JSON.stringify({ from: config.email.from, to: [to], subject, html, text }),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error(`Provider API rejected request (HTTP ${res.status})`);
    err.category = classifyApiError(res.status);
    err.statusCode = res.status;
    throw err;
  }
  const body = await res.json().catch(() => ({}));
  return { messageId: body.id || 'n/a', provider: 'resend', response: `HTTP ${res.status}` };
};

export const testSmtpConnection = async () => {
  const status = getEmailConfigStatus();
  if (selectedProvider() === 'resend') {
    if (!config.email.apiKey) {
      return {
        ok: false,
        status: 'config-missing',
        detail: 'RESEND_API_KEY is missing — no provider API call attempted',
        ...status,
      };
    }
    try {
      const res = await fetch('https://api.resend.com/domains', {
        method: 'GET',
        headers: resendHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      if (res.ok) {
        return {
          ok: true,
          status: 'connection-ok',
          detail: 'Provider API reachable and key accepted',
          ...status,
        };
      }
      return {
        ok: false,
        status: classifyApiError(res.status),
        detail: `Provider API responded HTTP ${res.status}`,
        ...status,
      };
    } catch (err) {
      return {
        ok: false,
        status: 'connection-failed',
        detail: sanitizeErrorDetail(err),
        ...status,
      };
    }
  }

  if (config.email.user && config.email.pass) {
    await ensureResolvedHost();
  }
  const transport = getTransporter();
  if (!transport) {
    return {
      ok: false,
      status: 'config-missing',
      detail: 'EMAIL_USER or EMAIL_PASS is missing — no SMTP connection attempted',
      ...status,
    };
  }
  warnSenderMismatch();
  try {
    await transport.verify();
    return {
      ok: true,
      status: 'connection-ok',
      detail: 'SMTP host reachable and MAIL/AUTH handshake accepted',
      ...status,
    };
  } catch (err) {
    return {
      ok: false,
      status: classifySmtpError(err),
      detail: `${formatSmtpDiagnostics(err)}`,
      ...status,
    };
  }
};

const buildTransporter = () => {
  transporter = nodemailer.createTransport(
    smtpTransportOptions({
      host: smtpHostOverride,
      servername: smtpServername,
    })
  );
  return transporter;
};

export const pickIpv4Address = (addresses) => {
  if (!Array.isArray(addresses) || !addresses.length) return null;
  const first = addresses[0];
  return first && first.address ? String(first.address) : null;
};

// smtp.gmail.com publishes AAAA (IPv6) records. Render's network has no IPv6
// route, so Nodemailer's resolver — which resolves BOTH families and randomly
// picks an address — would connect to an IPv6 address and fail with
// ESOCKET/ENETUNREACH. Prefer IPv4 by handing Nodemailer a resolved IPv4
// literal as `host` (its resolver then short-circuits) while keeping the
// original hostname as `servername` so STARTTLS/SNI still validates against
// Gmail's certificate.
let smtpHostOverride = null;
let smtpServername = null;
let smtpHostResolution = null;

const ensureResolvedHost = () => {
  if (smtpHostResolution) return smtpHostResolution;
  if (selectedProvider() !== 'smtp' || !config.email.host) return Promise.resolve();
  smtpHostResolution = dns
    .lookup(config.email.host, { family: 4, all: true })
    .then((addresses) => {
      const addr = pickIpv4Address(addresses);
      if (addr) {
        smtpHostOverride = addr;
        smtpServername = config.email.host;
        console.log(
          `[Email] smtp host resolved to IPv4 ${smtpHostOverride} | ` +
          `servername=${smtpServername} (SNI)`
        );
      }
    })
    .catch((err) => {
      console.warn(
        `[Email] IPv4 resolution skipped (${(err && err.code) || 'dns-error'}) — using hostname as-is`
      );
    });
  return smtpHostResolution;
};

// Gmail SMTP: smtp.gmail.com:587 with STARTTLS (secure=false), App Password
// auth, and requireTLS so AUTH never proceeds without an encrypted channel.
// requireTLS also turns a blocked/broken STARTTLS negotiation into a fast,
// classified failure instead of a silent stall on public ports.
export const smtpTransportOptions = (overrides = {}) => ({
  host: overrides.host || config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  servername: overrides.servername || undefined,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
  requireTLS: config.email.port !== 465,
  connectionTimeout: 10 * 1000,
  greetingTimeout: 10 * 1000,
  socketTimeout: 20 * 1000,
});

const getTransporter = () => {
  if (transporter) return transporter;
  if (!config.email.user || !config.email.pass) {
    if (!warnedMissing) {
      const status = getEmailConfigStatus();
      warnedMissing = true;
      console.warn(
        '[Email] SMTP credentials not configured — emails will NOT be sent.\n' +
        `  EMAIL_USER=${status.user} EMAIL_PASS=${status.pass}\n` +
        `  EMAIL_HOST=${status.host} EMAIL_PORT=${status.port}\n` +
        '  Set EMAIL_USER and EMAIL_PASS environment variables (see server/.env.example).'
      );
    }
    return null;
  }
  return buildTransporter();
};

export const extractSenderAddress = (from) => {
  if (!from) return '';
  const m = String(from).match(/<([^>]+)>/);
  return (m ? m[1] : String(from)).trim();
};

// Gmail SMTP only accepts EMAIL_FROM whose address matches EMAIL_USER. Emit a
// safe one-time warning with no addresses or secrets when they disagree.
const warnSenderMismatch = () => {
  if (warnedFromMismatch) return;
  const fromAddr = extractSenderAddress(config.email.from);
  const authUser = config.email.user;
  if (!fromAddr || !authUser || fromAddr.toLowerCase() === authUser.toLowerCase()) return;
  warnedFromMismatch = true;
  console.warn(
    '[Email] EMAIL_FROM sender address does not match EMAIL_USER — Gmail SMTP will REJECT sends ' +
    '("The From address does not match the authenticated identity"). ' +
    'Set EMAIL_FROM to "ExamAI <" + EMAIL_USER + ">" (see server/.env.example).'
  );
};

export const sendEmail = async ({ to, subject, html, text }) => {
  if (selectedProvider() === 'resend') {
    if (!config.email.apiKey) {
      console.error(
        `[Email] SKIPPED — RESEND_API_KEY not configured | to=${to} | subject=${subject}`
      );
      return { skipped: true };
    }
    try {
      const info = await sendViaApi({ to, subject, html, text });
      console.log(
        `[Email] provider accepted message (resend) | to=${to} | subject=${subject} | ` +
        `messageId=${info.messageId} | status=${info.response}`
      );
      return info;
    } catch (err) {
      console.error(
        `[Email] provider send FAILED | to=${to} | subject=${subject} | ` +
        `category=${err.category || 'unknown-error'} | detail=${sanitizeErrorDetail(err)}`
      );
      throw err;
    }
  }

  if (config.email.user && config.email.pass) {
    await ensureResolvedHost();
  }
  const transport = getTransporter();
  if (!transport) {
    console.error(
      `[Email] SKIPPED — SMTP credentials not configured | to=${to} | subject=${subject}`
    );
    return { skipped: true };
  }

  warnSenderMismatch();

  try {
    const info = await transport.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
    console.log(
      `[Email] SMTP accepted message | to=${to} | subject=${subject} | ` +
      `messageId=${info.messageId || 'n/a'} | smtp=${(info.response || '').slice(0, 200)}`
    );
    return info;
  } catch (err) {
    console.error(
      `[Email] SMTP send FAILED | to=${to} | subject=${subject} | ` +
      `${formatSmtpDiagnostics(err)} | detail=${sanitizeErrorDetail(err)}`
    );
    throw err;
  }
};

export const sendVerificationEmail = async (user, token) => {
  console.log(`[Email] verification requested | to=${user.email} | linkBase=${config.clientUrl}`);
  const url = `${config.clientUrl}/verify-email?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Verify your ExamAI account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2>Welcome to ExamAI, ${user.firstName}!</h2>
        <p>Please verify your email address to activate your account.</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px">
          Verify Email
        </a>
        <p style="margin-top:24px;color:#666;font-size:14px">Or copy this link: ${url}</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (user, token) => {
  const url = `${config.clientUrl}/reset-password?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset your ExamAI password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2>Password Reset</h2>
        <p>Hi ${user.firstName}, click below to reset your password. This link expires in 1 hour.</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px">
          Reset Password
        </a>
        <p style="margin-top:24px;color:#666;font-size:14px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

export const sendExamNotification = async (user, exam) => {
  return sendEmail({
    to: user.email,
    subject: `New Exam Available: ${exam.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2>New Examination</h2>
        <p>Hi ${user.firstName}, a new exam "<strong>${exam.title}</strong>" is available.</p>
        <p>Duration: ${exam.duration} minutes</p>
        <a href="${config.clientUrl}/student/exams" style="display:inline-block;padding:12px 24px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px">
          View Exams
        </a>
      </div>
    `,
  });
};
