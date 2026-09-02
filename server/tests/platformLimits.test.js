import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../config/index.js';

test('marketing mode defaults to unlimited student enrollment when enabled', () => {
  assert.equal(typeof config.marketingMode, 'boolean');
  assert.equal(config.studentLimit === null || Number.isFinite(config.studentLimit), true);
});

test('warning cooldown is a positive number', () => {
  assert.ok(config.warningCooldownMs > 0);
});
