import { body } from 'express-validator';

export const registerValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'teacher', 'student'])
    .withMessage('Invalid role'),
];

export const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

export const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const examValidator = [
  body('title').trim().notEmpty().withMessage('Exam title is required'),
  body('duration')
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
];

export const examUpdateValidator = [
  body('title')
    .optional({ values: 'falsy' })
    .trim()
    .notEmpty()
    .withMessage('Exam title cannot be empty'),
  body('duration')
    .optional({ values: 'falsy' })
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
];

export const questionValidator = [
  body('type')
    .isIn([
      'multiple_choice',
      'checkbox',
      'true_false',
      'short_answer',
      'essay',
      'fill_blank',
      'matching',
      'dropdown',
      'image',
      'video',
      'file_upload',
    ])
    .withMessage('Invalid question type'),
  body('title').trim().notEmpty().withMessage('Question title is required'),
  body('marks').optional().isFloat({ min: 0 }).withMessage('Marks must be non-negative'),
];

export const courseValidator = [
  body('title').trim().notEmpty().withMessage('Course title is required'),
  body('code').trim().notEmpty().withMessage('Course code is required'),
];
