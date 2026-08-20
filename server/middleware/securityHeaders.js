export default function securityHeaders(req, res, next) {
  res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' data: blob: http: https:;");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}
