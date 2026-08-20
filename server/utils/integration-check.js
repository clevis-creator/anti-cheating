import { spawnSync } from 'child_process';
import path from 'path';

const root = process.cwd();

console.log('Running migrations...');
let res = spawnSync('node', ['utils/migrate.js'], { cwd: root, stdio: 'inherit' });
if (res.status !== 0) process.exit(res.status || 1);

console.log('\nRunning seed (non-force)...');
res = spawnSync('node', ['utils/seed.js'], { cwd: root, stdio: 'inherit' });
if (res.status !== 0) {
  console.error('Seeding failed (non-force). Consider running with --force if appropriate.');
  process.exit(res.status || 1);
}

console.log('\nValidating seeds...');
res = spawnSync('node', ['utils/validate-seed.js'], { cwd: root, stdio: 'inherit' });
if (res.status !== 0) {
  console.error('Seed validation failed');
  process.exit(res.status || 1);
}

console.log('\nIntegration check passed');
process.exit(0);
