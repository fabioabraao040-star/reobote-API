import { config } from '../../config/env.ts';
import { logger } from '../../utils/logger.ts';
import { base44Client } from './base44.client.ts';
import { Base44PaymentNotification, Base44NotificationResponse } from './base44.types.ts';

export class Base44Service {
  /**
   * Notifica o Base44 sobre a atualização de status de uma cobrança (Ex: PAGO, EXPIRADO, CANCELADO).
   */
  async notificarAtualizacaoPagamento(dados: Base44PaymentNotification): Promise<Base44NotificationResponse> {
    const payload = {
      id_cobranca: dados.id_cobranca,
      id_transacao: dados.id_transacao,
      referencia_externa: dados.referencia_externa,
      id_pedido: dados.id_pedido,
      id_motoboy: dados.id_motoboy,
      valor: dados.valor,
      status: dados.status,
      data_pagamento: dados.data_pagamento,
      data_atualizacao: dados.data_atualizacao || new Date().toISOString(),
      detalhes_pix: dados.detalhes_pix,
    };

    logger.info('Notificando Base44 sobre status de pagamento', {
      id_cobranca: payload.id_cobranca,
      id_transacao: payload.id_transacao,
      status: payload.status,
      valor: payload.valor,
    });

    try {
      const response = await base44Client.post(config.base44.paymentUpdateEndpoint, payload);

      return {
        sucesso: true,
        mensagem: 'Base44 atualizado com sucesso.',
        resposta_base44: response.data,
      };
    } catch (error) {
      logger.error('Erro ao notificar Base44 sobre pagamento.', error);
      return {
        sucesso: false,
        mensagem: error instanceof Error ? error.message : 'Falha ao notificar Base44.',
      };
    }
  }
}

export const base44Service = new Base44Service();
