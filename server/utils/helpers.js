class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({ success: true, message, data });
};

export const sendError = (res, message = 'Error', statusCode = 500, errors = null) => {
  res.status(statusCode).json({ success: false, message, errors });
};

/** Escape user input before interpolating it into a RegExp constructor. */
export const escapeRegex = (input) =>
  String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default AppError;
