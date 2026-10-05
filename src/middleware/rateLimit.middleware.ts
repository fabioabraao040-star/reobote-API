import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.ts';
import { logger } from '../utils/logger.ts';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRequests = new Map<string, RateLimitRecord>();

// Limpeza de IPs antigos a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequests.entries()) {
    if (now > record.resetTime) {
      ipRequests.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref?.();

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const now = Date.now();
  const windowMs = config.rateLimitWindowMs;
  const maxRequests = config.rateLimitMax;

  let record = ipRequests.get(ip);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    ipRequests.set(ip, record);
    next();
    return;
  }

  record.count += 1;

  if (record.count > maxRequests) {
    logger.warn(`Rate limit excedido para IP: ${ip}`, { count: record.count, max: maxRequests });
    res.status(429).json({
      sucesso: false,
      erro: 'Limite de requisições excedido. Tente novamente em instantes.',
      retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
    });
    return;
  }

  next();
}
