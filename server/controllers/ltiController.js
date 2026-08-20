import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const ltiLaunch = asyncHandler(async (req, res) => {
  // LTI launch placeholder: validate JWT/OAuth signature, extract user/course, redirect
  sendSuccess(res, { message: 'LTI launch received (stub)' });
});

export const ltiConfig = asyncHandler(async (req, res) => {
  // Return basic LTI configuration for platforms
  sendSuccess(res, { title: 'ExamAI LTI Tool', description: 'LTI 1.3/Advantage placeholder' });
});
