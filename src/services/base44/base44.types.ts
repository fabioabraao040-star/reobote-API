import { ReoboteStatus } from '../../utils/statusMapper.ts';

export interface Base44PaymentNotification {
  id_cobranca: string;
  id_transacao: string;
  referencia_externa?: string;
  id_pedido?: string | number;
  id_motoboy?: string | number;
  valor: number;
  status: ReoboteStatus;
  data_pagamento?: string;
  data_atualizacao: string;
  detalhes_pix?: {
    end_to_end_id?: string;
    chave_pix?: string;
  };
}

export interface Base44NotificationResponse {
  sucesso: boolean;
  mensagem?: string;
  resposta_base44?: unknown;
}
