import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const ssoRedirect = asyncHandler(async (req, res) => {
  // Placeholder: redirect to identity provider
  const returnUrl = req.query.return || '/';
  // In production, build auth request (OIDC) and redirect
  res.redirect(returnUrl);
});

export const ssoCallback = asyncHandler(async (req, res) => {
  // Placeholder: handle provider callback, exchange code for token, find/create user
  // For now respond with success
  sendSuccess(res, { message: 'SSO callback received (stub)' });
});
