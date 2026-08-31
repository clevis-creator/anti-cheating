

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import { Server } from 'socket.io';

import config from './config/index.js';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './socket/index.js';
import securityHeaders from './middleware/securityHeaders.js';
import { startCleanupScheduler } from './utils/cleanupUploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
app.set('trust proxy', 1);






const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header
    // (curl, server-to-server requests, health checks, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const isLocalhostOrigin =
      /^(https?:)?\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

    const configuredOrigins = (config.clientUrl || '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    const isConfiguredOrigin = configuredOrigins.includes(origin);

    // Allow your Vercel production + preview/deployment URLs
    const isVercelOrigin =
      /^https:\/\/anti-cheating-[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
      /^https:\/\/anti-cheating-kappa\.vercel\.app$/i.test(origin);

    if (isLocalhostOrigin || isConfiguredOrigin || isVercelOrigin) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Exam-Session',
  ],
};








const io = new Server(server, { cors: corsOptions });

app.set('io', io);
initSocket(io);

// Security & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS must run for BOTH preflight and actual API requests.
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(securityHeaders);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

app.get('/healthz', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    status: dbConnected ? 'ready' : 'starting',
    db: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Proctoring media is served via authenticated signed URLs (/api/responses/media/download).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Prometheus metrics (optional)
import('prom-client')
  .then((promClient) => {
    const collectDefaultMetrics = promClient.collectDefaultMetrics;
    collectDefaultMetrics();
    app.get('/metrics', async (_req, res) => {
      try {
        res.set('Content-Type', promClient.register.contentType);
        res.end(await promClient.register.metrics());
      } catch (err) {
        res.status(500).end(err.message);
      }
    });
  })
  .catch(() => {
    // prom-client not installed; metrics endpoint unavailable
  });

// Sentry initialization — optional, set SENTRY_DSN in env
if (process.env.SENTRY_DSN) {
  import('@sentry/node')
    .then((Sentry) => {
      Sentry.init({ dsn: process.env.SENTRY_DSN });
      app.use(Sentry.Handlers.requestHandler());
    })
    .catch((err) => {
      console.warn('Sentry failed to initialize:', err.message);
    });
}
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    // start periodic cleanup of proctoring uploads
    startCleanupScheduler();
    server.listen(config.port, '0.0.0.0', () => {
      console.log(`ExamAI server running at http://0.0.0.0:${config.port} [${config.nodeEnv}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();

export { app, server, io };


