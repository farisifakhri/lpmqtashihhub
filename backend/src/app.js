import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

import { ENV } from './config/env.js';

const app = express();

// Security & utility middlewares
app.use(helmet());

const corsOptions = {
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (seperti mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ENV.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Akses diblokir oleh kebijakan CORS untuk origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redirect root / to /api/v1
app.get('/', (req, res) => res.redirect('/api/v1'));

// Mount API v1
app.use('/api/v1', apiRouter);

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
