import { ReoboteStatus } from '../../utils/statusMapper.ts';

export interface EfiOAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  obtained_at: number;
}

export interface EfiCriarCobrancaInput {
  id_pedido: string | number;
  id_motoboy: string | number;
  valor: number;
  descricao: string;
  referencia_externa?: string;
  expiracao_segundos?: number;
}

export interface EfiCobrancaPayload {
  calendario: {
    expiracao: number;
  };
  devedor?: {
    cpf?: string;
    cnpj?: string;
    nome?: string;
  };
  valor: {
    original: string;
  };
  chave: string;
  solicitacaoPagador: string;
  infoAdicionais?: Array<{
    nome: string;
    valor: string;
  }>;
}

export interface EfiCobrancaResponse {
  txid: string;
  revisao: number;
  loc?: {
    id: number;
    location: string;
    tipoCob: string;
    criacao: string;
  };
  status: string;
  devedor?: {
    cpf?: string;
    nome?: string;
  };
  valor: {
    original: string;
  };
  chave: string;
  solicitacaoPagador?: string;
  criacao: string;
  infoAdicionais?: Array<{
    nome: string;
    valor: string;
  }>;
  pix?: Array<{
    endToEndId: string;
    txid: string;
    valor: string;
    horario: string;
  }>;
}

export interface EfiQrCodeResponse {
  qrcode: string;
  imagemQrcode: string;
  linkVisualizacao?: string;
}

export interface ReoboteCobrancaResult {
  sucesso: boolean;
  id_cobranca: string;
  identificador_transacao: string;
  status: ReoboteStatus;
  valor: number;
  codigo_pix: string;
  qr_code: string;
  pix_copia_e_cola: string;
  data_criacao: string;
  detalhes?: {
    id_pedido: string | number;
    id_motoboy: string | number;
    referencia_externa?: string;
  };
}

export interface ReoboteStatusResult {
  sucesso: boolean;
  id_cobranca: string;
  identificador_transacao: string;
  status: ReoboteStatus;
  status_original_efi: string;
  valor: number;
  data_criacao?: string;
  data_pagamento?: string;
  pix_recebido?: {
    end_to_end_id: string;
    horario: string;
    valor: number;
  };
  detalhes?: {
    id_pedido?: string | number;
    id_motoboy?: string | number;
    referencia_externa?: string;
  };
}

export interface EfiPixWebhookItem {
  endToEndId: string;
  txid: string;
  chave: string;
  valor: string;
  horario: string;
  infoPagador?: string;
  devolucoes?: unknown[];
}

export interface EfiWebhookPayload {
  evento?: string;
  pix?: EfiPixWebhookItem[];
  // Caso de notificação direta
  txid?: string;
  status?: string;
  endToEndId?: string;
  valor?: string;
  horario?: string;
}
