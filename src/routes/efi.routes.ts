import { Router } from 'express';
import { criarCobranca } from '../controllers/cobranca.controller.ts';
import { consultarStatus } from '../controllers/status.controller.ts';
import { processarWebhook } from '../controllers/webhook.controller.ts';
import { authenticateBase44 } from '../middleware/auth.middleware.ts';
import { validateCriarCobranca } from '../middleware/validation.middleware.ts';
import { rateLimiter } from '../middleware/rateLimit.middleware.ts';

export const efiRouter = Router();

/**
 * @route POST /api/efi/criar-cobranca
 * @desc Cria uma nova cobrança Pix na Efí e retorna os dados de pagamento (QR Code e Copia e Cola)
 * @access Protegido (Base44 API Key)
 */
efiRouter.post(
  '/criar-cobranca',
  rateLimiter,
  authenticateBase44,
  validateCriarCobranca,
  criarCobranca
);

/**
 * @route GET /api/efi/status/:id
 * @desc Consulta o status de uma cobrança Pix na Efí (txid ou loc.id)
 * @access Protegido (Base44 API Key)
 */
efiRouter.get(
  '/status/:id',
  rateLimiter,
  authenticateBase44,
  consultarStatus
);

/**
 * @route POST /api/efi/webhook
 * @desc Recebe notificações de pagamento e atualizações de status enviadas pela Efí
 * @access Público / Validado pela assinatura Efí
 */
efiRouter.post(
  '/webhook',
  rateLimiter,
  processarWebhook
);
