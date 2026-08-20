import AppError from '../utils/helpers.js';

/**
 * Safe Exam Browser detection via request headers / user-agent.
 * SEB sends X-SafeExamBrowser-* headers on configured requests.
 */
export function isSEBRequest(req) {
  const ua = req.get('user-agent') || '';
  if (/SafeExamBrowser/i.test(ua)) return true;

  const sebHeaders = [
    'x-safeexambrowser-requesthash',
    'x-safeexambrowser-configkeyhash',
    'x-safeexambrowser-version',
  ];
  return sebHeaders.some((h) => req.get(h));
}

export function assertSEBIfRequired(exam, req) {
  if (!exam.settings?.requireSEB) return;
  if (!isSEBRequest(req)) {
    throw new AppError('This exam requires Safe Exam Browser', 403);
  }
}

export default isSEBRequest;
