import dotenv from 'dotenv';
dotenv.config();

const errors = [];
const warnings = [];

const requiredAlways = ['MONGODB_URI'];
requiredAlways.forEach((k) => {
  if (!process.env[k]) errors.push(`${k} is required but not set`);
});

const mongoUri = process.env.MONGODB_URI;
if (mongoUri && !/^mongodb(\+srv)?:\/\//i.test(mongoUri)) {
  warnings.push('MONGODB_URI does not look like a MongoDB connection string (expected mongodb:// or mongodb+srv://)');
}

const nodeEnv = process.env.NODE_ENV || 'development';
if (!process.env.NODE_ENV) warnings.push('NODE_ENV not set, defaulting to development');

const jwt = process.env.JWT_SECRET;
if (nodeEnv === 'production') {
  if (!jwt) errors.push('JWT_SECRET is required in production');
  else if (jwt.length < 32 || /change|dev|test/i.test(jwt)) warnings.push('JWT_SECRET looks weak or default-like; use a strong random secret (>=32 chars)');
} else {
  if (!jwt) warnings.push('JWT_SECRET is not set; development will use a default secret');
  else if (/change|dev|test/i.test(jwt)) warnings.push('JWT_SECRET contains "change/dev/test" suggesting a placeholder secret');
}

const clientUrl = process.env.CLIENT_URL;
if (!clientUrl) warnings.push('CLIENT_URL not set; useful for CORS configuration');
else {
  try {
    new URL(clientUrl);
  } catch (e) {
    errors.push(`CLIENT_URL is not a valid URL: ${clientUrl}`);
  }
}

if (process.env.PORT && Number.isNaN(Number(process.env.PORT))) errors.push('PORT must be a number');
if (process.env.EMAIL_PORT && Number.isNaN(Number(process.env.EMAIL_PORT))) errors.push('EMAIL_PORT must be a number');
if (process.env.PROCTORING_RETENTION_DAYS && Number.isNaN(Number(process.env.PROCTORING_RETENTION_DAYS))) errors.push('PROCTORING_RETENTION_DAYS must be a number');

// MEDIA_SIGN_SECRET may fallback to JWT_SECRET in config; warn if neither present in production
if (nodeEnv === 'production' && !process.env.MEDIA_SIGN_SECRET && !jwt) warnings.push('MEDIA_SIGN_SECRET and JWT_SECRET are both missing; signing secrets should be set in production');

// AI keys are optional but warn if none configured
if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) warnings.push('No AI provider API keys configured (GEMINI_API_KEY or OPENAI_API_KEY). This is optional unless you use AI features.');

// Summarize
console.log('Environment validation summary');
console.log('NODE_ENV:', nodeEnv);

if (errors.length) {
  console.error('\nErrors:');
  for (const e of errors) console.error(' -', e);
}

if (warnings.length) {
  console.warn('\nWarnings:');
  for (const w of warnings) console.warn(' -', w);
}

if (errors.length) {
  console.error('\nEnvironment validation failed');
  process.exit(1);
}

console.log('\nEnvironment validation passed' + (warnings.length ? ' (with warnings)' : ''));
process.exit(0);
