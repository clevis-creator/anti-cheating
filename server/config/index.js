
import dotenv from 'dotenv';

dotenv.config();

const defaultJwtSecret = 'dev_secret_change_me';
const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/examai',
  jwtSecret: process.env.JWT_SECRET || defaultJwtSecret,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
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
  mediaSignSecret:
    process.env.MEDIA_SIGN_SECRET || process.env.JWT_SECRET || defaultJwtSecret,
  warningCooldownMs: Number(process.env.WARNING_COOLDOWN_MS) || 10_000,
};

if (config.nodeEnv === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === defaultJwtSecret)) {
  console.warn('Production environment is using the default JWT secret. Set JWT_SECRET before deployment.');
}

export default config;
