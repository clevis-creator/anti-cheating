#!/usr/bin/env node
/**
 * Authorization verification script.
 * Runs server unit tests and prints a concise pass/fail summary.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, '..', 'server');

const result = spawnSync('npm', ['test'], {
  cwd: serverDir,
  stdio: 'inherit',
  shell: true,
});

if (result.status !== 0) {
  console.error('\nAuthorization verification failed.');
  process.exit(result.status || 1);
}

console.log('\nAuthorization verification passed.');
