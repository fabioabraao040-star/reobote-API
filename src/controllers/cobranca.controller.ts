import { Request, Response, NextFunction } from 'express';
import { efiService } from '../services/efi/efi.service.ts';
import { idempotencyStore } from '../utils/idempotency.ts';
import { logger } from '../utils/logger.ts';
import { ValidatedCriarCobrancaBody } from '../middleware/validation.middleware.ts';
import { ReoboteCobrancaResult } from '../services/efi/efi.types.ts';

export async function criarCobranca(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id_pedido, id_motoboy, valor, descricao, referencia_externa, expiracao_segundos } = req.body as ValidatedCriarCobrancaBody;

    // Idempotência: chave personalizada no header ou composta pelo ID do pedido
    const customIdempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    const idempotencyKey = customIdempotencyKey || `cobranca_pedido_${id_pedido}`;

    // Se já processamos essa cobrança recentemente, retorna a resposta em cache para evitar duplicações na Efí
    const cachedResponse = idempotencyStore.get<ReoboteCobrancaResult>(idempotencyKey);
    if (cachedResponse) {
      logger.info(`Idempotência ativada: retornando cobrança previamente criada para [${idempotencyKey}]`);
      res.status(200).json({
        ...cachedResponse,
        recuperado_cache_idempotencia: true,
      });
      return;
    }

    // Chama o serviço da Efí para criar a cobrança e obter o QR Code
    const cobranca = await efiService.criarCobrancaPix({
      id_pedido,
      id_motoboy,
      valor,
      descricao,
      referencia_externa,
      expiracao_segundos,
    });

    // Salva no store de idempotência (válido por 1 hora)
    idempotencyStore.set(idempotencyKey, cobranca, 60 * 60 * 1000);

    res.status(201).json({
      sucesso: true,
      id_cobranca: cobranca.id_cobranca,
      identificador_transacao: cobranca.identificador_transacao,
      status: cobranca.status,
      valor: cobranca.valor,
      codigo_pix: cobranca.codigo_pix,
      qr_code: cobranca.qr_code,
      pix_copia_e_cola: cobranca.pix_copia_e_cola,
      data_criacao: cobranca.data_criacao,
      detalhes: cobranca.detalhes,
    });
  } catch (error) {
    next(error);
  }
}
