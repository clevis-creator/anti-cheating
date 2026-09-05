#!/usr/bin/env node
// SMTP connectivity check for ExamAI.
// Read-only: never sends an email, never logs secrets (EMAIL_USER/EMAIL_PASS only report set/missing).
// Usage: node tools/check-smtp.mjs  (runs from repo root, reads server/.env if present)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

const serverEnv = path.join(here, '..', 'server', '.env');
if (fs.existsSync(serverEnv)) {
  const parsed = dotenv.parse(fs.readFileSync(serverEnv));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
dotenv.config();

const { testSmtpConnection } = await import('../server/utils/email.js');

const r = await testSmtpConnection();

console.log('[Email] SMTP connectivity check');
console.log('  status   :', r.status);
console.log('  detail   :', r.detail);
console.log('  host     :', r.host);
console.log('  port     :', r.port, '(secure: ' + r.secure + ')');
console.log('  user     :', r.user);
console.log('  pass     :', r.pass);
console.log('  from     :', r.from);
console.log('  linksBase:', r.linksBase);
console.log('  nodeEnv  :', r.nodeEnv);

process.exit(r.ok ? 0 : 1);