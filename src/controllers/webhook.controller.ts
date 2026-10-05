import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.ts';
import { logger } from '../utils/logger.ts';
import { idempotencyStore } from '../utils/idempotency.ts';
import { mapEfiStatusToReobote, ReoboteStatus } from '../utils/statusMapper.ts';
import { base44Service } from '../services/base44/base44.service.ts';
import { efiService } from '../services/efi/efi.service.ts';
import { EfiWebhookPayload } from '../services/efi/efi.types.ts';

export async function processarWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Validação de Handshake / Verificação da Efí
    // No momento do cadastro do webhook, a Efí envia uma requisição de validação que deve retornar HTTP 200
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.info('Efí Webhook: Handshake/validação de URL recebido com sucesso.');
      res.status(200).json({ sucesso: true, mensagem: 'Webhook validado com sucesso.' });
      return;
    }

    // 2. Validação de Segurança Opcional (Secret Token via query ou header)
    if (config.efi.webhookSecret) {
      const providedSecret = (req.query.secret as string) || (req.headers['x-webhook-secret'] as string);
      if (providedSecret !== config.efi.webhookSecret) {
        logger.warn('Efí Webhook: Tentativa rejeitada por secret inválido.');
        res.status(403).json({ sucesso: false, erro: 'Webhook secret não autorizado.' });
        return;
      }
    }

    const payload = req.body as EfiWebhookPayload;
    logger.info('Efí Webhook: Notificação recebida', payload);

    // 3. Processamento de lista de PIX recebidos (Padrão Efí)
    if (Array.isArray(payload.pix) && payload.pix.length > 0) {
      for (const item of payload.pix) {
        const txid = item.txid;
        const endToEndId = item.endToEndId;
        const valor = parseFloat(item.valor) || 0;
        const dataPagamento = item.horario;

        const idempotencyKey = `webhook_endtoend_${endToEndId || txid}`;

        // Evitar processamento duplicado
        if (idempotencyStore.has(idempotencyKey)) {
          logger.info(`Efí Webhook: Evento já processado anteriormente [${idempotencyKey}]. Ignorando duplicação.`);
          continue;
        }

        // Buscar detalhes da cobrança para recuperar id_pedido e id_motoboy se disponíveis
        let idPedido: string | number | undefined;
        let idMotoboy: string | number | undefined;
        let referenciaExterna: string | undefined;

        try {
          if (txid) {
            const cobrancaInfo = await efiService.consultarStatus(txid);
            idPedido = cobrancaInfo.detalhes?.id_pedido;
            idMotoboy = cobrancaInfo.detalhes?.id_motoboy;
            referenciaExterna = cobrancaInfo.detalhes?.referencia_externa;
          }
        } catch (fetchErr) {
          logger.warn(`Não foi possível recuperar detalhes adicionais da cobrança [${txid}].`, fetchErr);
        }

        // Notificar Base44 com status PAGO
        await base44Service.notificarAtualizacaoPagamento({
          id_cobranca: txid,
          id_transacao: txid,
          referencia_externa: referenciaExterna,
          id_pedido: idPedido,
          id_motoboy: idMotoboy,
          valor,
          status: 'PAGO',
          data_pagamento: dataPagamento,
          data_atualizacao: new Date().toISOString(),
          detalhes_pix: {
            end_to_end_id: endToEndId,
            chave_pix: item.chave,
          },
        });

        // Registrar como processado por 24 horas
        idempotencyStore.set(idempotencyKey, true, 24 * 60 * 60 * 1000);
      }

      res.status(200).json({ sucesso: true, mensagem: 'Notificações PIX processadas com sucesso.' });
      return;
    }

    // 4. Processamento de Notificação de Status Único (ex: EXPIRADA, CANCELADA, ATIVA)
    const txid = payload.txid || (payload as { id?: string }).id;
    if (txid) {
      const rawStatus = payload.status || 'ATIVA';
      const statusMapeado: ReoboteStatus = mapEfiStatusToReobote(rawStatus);
      const idempotencyKey = `webhook_status_${txid}_${statusMapeado}`;

      if (idempotencyStore.has(idempotencyKey)) {
        logger.info(`Efí Webhook: Status [${statusMapeado}] já processado para txid [${txid}]. Ignorando.`);
        res.status(200).json({ sucesso: true, mensagem: 'Notificação já processada previamente.' });
        return;
      }

      const valor = payload.valor ? parseFloat(payload.valor) : 0;

      await base44Service.notificarAtualizacaoPagamento({
        id_cobranca: txid,
        id_transacao: txid,
        valor,
        status: statusMapeado,
        data_pagamento: statusMapeado === 'PAGO' ? payload.horario || new Date().toISOString() : undefined,
        data_atualizacao: new Date().toISOString(),
      });

      idempotencyStore.set(idempotencyKey, true, 24 * 60 * 60 * 1000);

      res.status(200).json({ sucesso: true, mensagem: 'Status de cobrança processado e enviado ao Base44.' });
      return;
    }

    // Caso de payload não reconhecido, responde 200 para evitar retentativas infinitas da Efí
    logger.warn('Efí Webhook: Payload não possui formato esperado de PIX nem txid.', payload);
    res.status(200).json({ sucesso: true, mensagem: 'Webhook recebido mas nenhum PIX identificado.' });
  } catch (error) {
    logger.error('Erro crítico no processamento de webhook da Efí.', error);
    next(error);
  }
}
