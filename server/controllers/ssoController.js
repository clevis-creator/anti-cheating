import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const ssoRedirect = asyncHandler(async (req, res) => {
  // Only allow internal (relative) redirects to prevent open-redirect abuse.
  // Absolute URLs and protocol-relative URLs ("//evil.com") are rejected.
  const returnUrl = req.query.return || '/';
  const isSafeRelative =
    typeof returnUrl === 'string' &&
    returnUrl.startsWith('/') &&
    !returnUrl.startsWith('//') &&
    !returnUrl.startsWith('/\\');
  res.redirect(isSafeRelative ? returnUrl : '/');
});

export const ssoCallback = asyncHandler(async (req, res) => {
  // Placeholder: handle provider callback, exchange code for token, find/create user
  // For now respond with success
  sendSuccess(res, { message: 'SSO callback received (stub)' });
});
