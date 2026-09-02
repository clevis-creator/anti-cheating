import { Settings } from '../models/index.js';
import config from '../config/index.js';

export async function getProctoringRetentionDays() {
  const setting = await Settings.findOne({ key: 'proctoring_retention_days' });
  if (setting?.value != null && Number(setting.value) > 0) {
    return Number(setting.value);
  }
  return Number(config.proctoringRetentionDays || 30);
}

export async function getRequireEmailVerification() {
  if (config.marketingMode) return false;

  const setting = await Settings.findOne({ key: 'require_email_verification' });
  if (setting?.value !== undefined && setting?.value !== null) {
    return Boolean(setting.value);
  }

  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true') return true;
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'false') return false;

  return Boolean(config.requireEmailVerification);
}
