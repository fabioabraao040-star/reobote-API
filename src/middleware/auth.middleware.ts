import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.ts';
import { logger } from '../utils/logger.ts';

/**
 * Middleware para validar a autenticação de chamadas vindas do Base44 para a REOBOTE API.
 * Verifica o cabeçalho 'x-api-key' ou 'Authorization: Bearer <token>'.
 */
export function authenticateBase44(req: Request, res: Response, next: NextFunction): void {
  // Se nenhuma chave estiver configurada no .env (modo inicial de configuração),
  // permitir em desenvolvimento com aviso, mas bloquear em produção.
  if (!config.apiAuthToken) {
    if (config.env === 'production') {
      logger.error('REOBOTE_API_KEY não configurada no ambiente de produção.');
      res.status(500).json({
        sucesso: false,
        erro: 'Configuração de segurança incompleta no servidor (REOBOTE_API_KEY não configurada).',
      });
      return;
    }
    // Em desenvolvimento sem chave configurada, alertar no log
    logger.warn('Atenção: REOBOTE_API_KEY não definida no ambiente. Autenticação desativada temporariamente para desenvolvimento.');
    next();
    return;
  }

  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers['authorization'] as string | undefined;

  let providedToken: string | undefined;

  if (apiKeyHeader) {
    providedToken = apiKeyHeader.trim();
  } else if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      providedToken = parts[1].trim();
    } else {
      providedToken = authHeader.trim();
    }
  }

  if (!providedToken) {
    logger.warn('Tentativa de acesso não autorizada: Token/API Key ausente.', {
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
    });
    res.status(401).json({
      sucesso: false,
      erro: 'Acesso não autorizado. Envie a chave de autenticação via header x-api-key ou Authorization Bearer.',
    });
    return;
  }

  if (providedToken !== config.apiAuthToken) {
    logger.warn('Tentativa de acesso não autorizada: Chave de API inválida.', {
      ip: req.ip,
      path: req.originalUrl,
    });
    res.status(403).json({
      sucesso: false,
      erro: 'Acesso negado. Chave de autenticação fornecida é inválida.',
    });
    return;
  }

  next();
}
