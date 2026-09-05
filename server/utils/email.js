import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter = null;

let warnedMissing = false;

// ---- Production-safe email diagnostics -------------------------------------
// These helpers never return or log secrets: EMAIL_PASS, JWT, tokens.
// EMAIL_USER / EMAIL_PASS are reported only as "set" or "missing". The link
// base URL is safe to log because it is the public frontend origin that the
// verification link points to.

export const getEmailConfigStatus = () => ({
  nodeEnv: config.nodeEnv,
  host: config.email.host || '(unset)',
  port: config.email.port,
  secure: config.email.port === 465,
  user: config.email.user ? 'set' : 'missing',
  pass: config.email.pass ? 'set' : 'missing',
  from: config.email.from || '(unset)',
  linksBase: config.clientUrl,
});

export const classifySmtpError = (err) => {
  const msg = (err && err.message) || String(err);
  if (/invalid login|authentication|credentials|username and password|535|534|5\.7\.8|5\.7\.9/i.test(msg)) {
    return 'auth-rejected';
  }
  if (/connect|ECONN|ETIMEDOUT|EHOST|ESOCKET|TLS|STARTTLS/i.test(msg)) {
    return 'connection-failed';
  }
  if (/554|550|553|sender|recipient|rejected|spam|policy/i.test(msg)) {
    return 'message-rejected';
  }
  return 'unknown-error';
};

export const testSmtpConnection = async () => {
  const status = getEmailConfigStatus();
  const transport = getTransporter();
  if (!transport) {
    return {
      ok: false,
      status: 'config-missing',
      detail: 'EMAIL_USER or EMAIL_PASS is missing — no SMTP connection attempted',
      ...status,
    };
  }
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
      detail: sanitizeErrorDetail(err),
      ...status,
    };
  }
};

const sanitizeErrorDetail = (err) => {
  const msg = (err && err.message) || String(err);
  return msg.replace(/(pass(?:word)?\s*[:=]\s*)[^\s,;"']+/gi, '$1<redacted>').slice(0, 300);
};

const buildTransporter = () => {
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
  return transporter;
};

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

export const sendEmail = async ({ to, subject, html, text }) => {
  const transport = getTransporter();
  if (!transport) {
    console.error(
      `[Email] SKIPPED — SMTP credentials not configured | to=${to} | subject=${subject}`
    );
    return { skipped: true };
  }

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
      `category=${classifySmtpError(err)} | detail=${sanitizeErrorDetail(err)}`
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
