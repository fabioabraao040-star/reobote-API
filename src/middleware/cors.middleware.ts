import cors from 'cors';
import { config } from '../config/env.ts';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (como curl, mobile apps, Base44 backend server-to-server)
    if (!origin) return callback(null, true);

    if (config.corsOrigin === '*') {
      return callback(null, true);
    }

    const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim());
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Bloqueado por CORS: Origem não autorizada.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-idempotency-key', 'x-webhook-signature'],
  credentials: true,
});
