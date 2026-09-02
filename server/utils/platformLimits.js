import { User, Settings } from '../models/index.js';
import config from '../config/index.js';
import AppError from './helpers.js';

async function readSetting(key) {
  const setting = await Settings.findOne({ key });
  return setting?.value;
}

export async function assertStudentEnrollmentAllowed() {
  const marketingMode =
    config.marketingMode === true || (await readSetting('marketing_mode')) === true;

  if (marketingMode) return;

  const configuredLimit =
    config.studentLimit ?? (await readSetting('student_limit'));

  if (configuredLimit == null || configuredLimit === '' || Number(configuredLimit) < 0) {
    return;
  }

  const limit = Number(configuredLimit);
  const activeStudents = await User.countDocuments({ role: 'student', isActive: true });
  if (activeStudents >= limit) {
    throw new AppError('Student enrollment limit reached. Please contact your administrator.', 403);
  }
}
