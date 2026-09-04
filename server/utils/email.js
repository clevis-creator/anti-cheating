import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter = null;

let warnedMissing = false;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!config.email.user || !config.email.pass) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn(
        '[Email] SMTP credentials not configured — emails will NOT be delivered.\n' +
        '  Set EMAIL_USER and EMAIL_PASS environment variables (see .env.example).'
      );
    }
    return null;
  }

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

export const sendEmail = async ({ to, subject, html, text }) => {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email skipped] To: ${to} | Subject: ${subject}`);
    return { skipped: true };
  }

  const info = await transport.sendMail({
    from: config.email.from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });
  return info;
};

export const sendVerificationEmail = async (user, token) => {
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
