import { Router, Request, Response } from 'express';
import { config } from '../config/env.ts';
import { efiClient } from '../services/efi/efi.client.ts';
import { base44Client } from '../services/base44/base44.client.ts';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const missingEfi: string[] = [];
  if (!config.efi.clientId) missingEfi.push('EFI_CLIENT_ID');
  if (!config.efi.clientSecret) missingEfi.push('EFI_CLIENT_SECRET');
  if (!config.efi.certificate) missingEfi.push('EFI_CERTIFICATE');
  if (!config.efi.pixKey) missingEfi.push('EFI_PIX_KEY');

  res.status(200).json({
    sucesso: true,
    sistema: 'REOBOTE API',
    versao: '1.0.0',
    ambiente: config.env,
    vercelEnv: process.env.VERCEL_ENV || (config.env === 'production' ? 'Production' : 'Development'),
    timestamp: new Date().toISOString(),
    status_servicos: {
      api: {
        status: 'OK',
      },
      autenticacao: {
        configurada: Boolean(config.apiAuthToken),
      },
      efi: {
        configurado: efiClient.isConfigured(),
        ambiente: config.efi.environment,
        modo_simulacao: config.efi.simulationMode,
        chave_pix_definida: Boolean(config.efi.pixKey),
        missing_vars: missingEfi,
      },
      base44: {
        configurado: base44Client.isConfigured(),
        url_definida: Boolean(config.base44.apiUrl),
        endpoint_atualizacao: config.base44.paymentUpdateEndpoint,
      },
      webhook: {
        disponivel: true,
        endpoint: '/api/efi/webhook',
      },
      seguranca: {
        autenticacao_base44_ativa: Boolean(config.apiAuthToken),
        cors: config.corsOrigin,
        rate_limit: `${config.rateLimitMax} reqs / ${config.rateLimitWindowMs / 1000}s`,
      },
    },
  });
});

healthRouter.get('/docs', (_req: Request, res: Response) => {
  res.status(200).json({
    titulo: 'REOBOTE API - Documentação Técnica de Integração',
    descricao: 'API intermediária segura entre o sistema REOBOTE no Base44 e a API de pagamentos da Efí.',
    versao: '1.0.0',
    autenticacao: {
      tipo: 'API Key ou Bearer Token',
      headers_aceitos: ['x-api-key: SEU_TOKEN', 'Authorization: Bearer SEU_TOKEN'],
      variavel_servidor: 'REOBOTE_API_KEY',
    },
    endpoints: [
      {
        metodo: 'POST',
        caminho: '/api/efi/criar-cobranca',
        descricao: 'Cria uma cobrança Pix imediata na Efí com QR Code e Copia e Cola',
        autenticacao_obrigatoria: true,
        parametros_body: {
          id_pedido: { tipo: 'string | number', obrigatorio: true, descricao: 'ID do pedido no Base44' },
          id_motoboy: { tipo: 'string | number', obrigatorio: true, descricao: 'ID do motoboy no Base44' },
          valor: { tipo: 'number', obrigatorio: true, descricao: 'Valor em reais (ex: 25.50)' },
          descricao: { tipo: 'string', obrigatorio: false, descricao: 'Texto da solicitação ao pagador (máx 140 carac)' },
          referencia_externa: { tipo: 'string', obrigatorio: false, descricao: 'Código externo ou identificador auxiliar' },
          expiracao_segundos: { tipo: 'number', obrigatorio: false, padrao: 3600, descricao: 'Tempo de expiração do Pix' },
        },
        exemplo_requisicao: {
          id_pedido: 'PED-10293',
          id_motoboy: 'MOTO-44',
          valor: 15.00,
          descricao: 'Recarga de Créditos Reobote',
          referencia_externa: 'REF-2026-X',
        },
        exemplo_resposta: {
          sucesso: true,
          id_cobranca: '123456',
          identificador_transacao: '7978c0c97ea847e78e3199663707ecd9',
          status: 'PENDENTE',
          valor: 15.00,
          codigo_pix: '00020126580014br.gov.bcb.pix01367978c0c97ea847e78e3199663707ecd9520400005303986540515.005802BR5916REOBOTE SISTEMAS6009SAO PAULO62070503***6304ABCD',
          qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          pix_copia_e_cola: '00020126580014br.gov.bcb.pix...',
          data_criacao: '2026-10-04T18:00:00.000Z',
        },
      },
      {
        metodo: 'GET',
        caminho: '/api/efi/status/:id',
        descricao: 'Consulta o status de uma cobrança Pix pelo identificador (txid)',
        autenticacao_obrigatoria: true,
        parametros_rota: {
          id: 'Identificador da transação (txid)',
        },
        exemplo_resposta: {
          sucesso: true,
          id_cobranca: '123456',
          identificador_transacao: '7978c0c97ea847e78e3199663707ecd9',
          status: 'PAGO',
          valor: 15.00,
          data: '2026-10-04T18:05:12.000Z',
          dados_para_base44: {
            id_cobranca: '123456',
            id_transacao: '7978c0c97ea847e78e3199663707ecd9',
            status: 'PAGO',
            valor: 15.00,
            data_pagamento: '2026-10-04T18:05:12.000Z',
            data_atualizacao: '2026-10-04T18:05:13.000Z',
            id_pedido: 'PED-10293',
            id_motoboy: 'MOTO-44',
          },
        },
      },
      {
        metodo: 'POST',
        caminho: '/api/efi/webhook',
        descricao: 'Endpoint de webhook registrado na Efí para receber notificações Pix automáticas',
        autenticacao_obrigatoria: false,
        notificacao_base44: {
          url_destino: 'Configurada via BASE44_API_URL + BASE44_PAYMENT_UPDATE_ENDPOINT',
          seguranca: 'Header x-webhook-signature (HMAC-SHA256) com BASE44_WEBHOOK_SECRET',
        },
      },
    ],
  });
});
