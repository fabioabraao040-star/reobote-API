import winston from 'winston';
import { sanitizeData } from './sanitizer.ts';
import { config } from '../config/env.ts';

const sanitizingFormat = winston.format((info) => {
  if (info.meta !== undefined) {
    info.meta = sanitizeData(info.meta);
  }
  if (info.message && typeof info.message === 'object') {
    info.message = JSON.stringify(sanitizeData(info.message));
  } else if (typeof info.message === 'string') {
    info.message = sanitizeData(info.message) as string;
  }
  // Sanitiza quaisquer propriedades adicionais passadas no log
  for (const key of Object.keys(info)) {
    if (!['level', 'message', 'timestamp', 'service'].includes(key)) {
      info[key] = sanitizeData(info[key]);
    }
  }
  return info;
});

const isProduction = config.env === 'production';

export const winstonLogger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    sanitizingFormat(),
    isProduction ? winston.format.json() : winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` | meta: ${JSON.stringify(meta)}` : '';
        const stackStr = stack ? `\n${stack}` : '';
        return `[${timestamp}] [${level}] [REOBOTE-API]: ${message}${metaStr}${stackStr}`;
      })
    )
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

export const logger = {
  info: (message: string, meta?: unknown) => winstonLogger.info(message, { meta }),
  warn: (message: string, meta?: unknown) => winstonLogger.warn(message, { meta }),
  error: (message: string, error?: unknown) => {
    const errorMeta = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    winstonLogger.error(message, { error: errorMeta });
  },
  debug: (message: string, meta?: unknown) => winstonLogger.debug(message, { meta }),
};
