import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.ts';
import { config } from '../config/env.ts';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`Erro interno não tratado em [${req.method}] ${req.originalUrl}: ${err.message}`, err);

  const statusCode = (err as { status?: number; statusCode?: number }).statusCode || 
                     (err as { status?: number; statusCode?: number }).status || 
                     500;

  res.status(statusCode).json({
    sucesso: false,
    erro: statusCode === 500 && config.env === 'production' 
      ? 'Ocorreu um erro interno no servidor ao processar a requisição.'
      : err.message,
    codigo: (err as { code?: string }).code || 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    sucesso: false,
    erro: `Rota não encontrada: [${req.method}] ${req.originalUrl}`,
    codigo: 'NOT_FOUND',
  });
}
