
import dotenv from 'dotenv';

dotenv.config();

const defaultJwtSecret = 'dev_secret_change_me';
const nodeEnv = process.env.NODE_ENV || 'development';
const effectiveJwtSecret = nodeEnv === 'production' ? process.env.JWT_SECRET || '' : process.env.JWT_SECRET || defaultJwtSecret;
const effectiveMediaSignSecret = nodeEnv === 'production'
  ? process.env.MEDIA_SIGN_SECRET || process.env.JWT_SECRET || ''
  : process.env.MEDIA_SIGN_SECRET || process.env.JWT_SECRET || defaultJwtSecret;

const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/examai',
  jwtSecret: effectiveJwtSecret,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  sebConfigKeyHash: process.env.SEB_CONFIG_KEY_HASH || '',
  email: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'ExamAI <noreply@examai.com>',
  },
  ai: {
    geminiKey: process.env.GEMINI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'gemini',
  },
  proctoringRetentionDays: Number(process.env.PROCTORING_RETENTION_DAYS) || 30,
  mediaSignSecret: effectiveMediaSignSecret,
  warningCooldownMs: Number(process.env.WARNING_COOLDOWN_MS) || 10_000,
  marketingMode:
    process.env.MARKETING_MODE === 'true' ||
    process.env.MARKETING_MODE === '1' ||
    process.env.MARKETING_MODE === 'yes',
  studentLimit:
    process.env.STUDENT_LIMIT === undefined || process.env.STUDENT_LIMIT === ''
      ? null
      : Number(process.env.STUDENT_LIMIT),
};

if (config.nodeEnv === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === defaultJwtSecret)) {
  throw new Error('Production requires JWT_SECRET to be explicitly set.');
}

if (config.nodeEnv === 'production' && (!process.env.MEDIA_SIGN_SECRET || process.env.MEDIA_SIGN_SECRET === defaultJwtSecret)) {
  throw new Error('Production requires MEDIA_SIGN_SECRET to be explicitly set.');
}

export default config;
