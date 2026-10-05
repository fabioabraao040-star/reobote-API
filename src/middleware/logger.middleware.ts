import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.ts';
import { sanitizeData } from '../utils/sanitizer.ts';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const method = req.method;
  const url = req.originalUrl || req.url;

  // Intercepta o término da resposta para registrar status e tempo de execução
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    const logData = {
      method,
      url,
      status: statusCode,
      durationMs: duration,
      ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      query: sanitizeData(req.query),
      body: ['POST', 'PUT', 'PATCH'].includes(method) ? sanitizeData(req.body) : undefined,
    };

    if (statusCode >= 500) {
      logger.error(`HTTP Request Error [${method}] ${url} - ${statusCode} (${duration}ms)`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP Request Warn [${method}] ${url} - ${statusCode} (${duration}ms)`, logData);
    } else {
      logger.info(`HTTP Request [${method}] ${url} - ${statusCode} (${duration}ms)`, logData);
    }
  });

  next();
}
