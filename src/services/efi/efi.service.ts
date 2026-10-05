import { config } from '../../config/env.ts';
import { logger } from '../../utils/logger.ts';
import { mapEfiStatusToReobote } from '../../utils/statusMapper.ts';
import { efiClient } from './efi.client.ts';
import {
  EfiCriarCobrancaInput,
  EfiCobrancaPayload,
  EfiCobrancaResponse,
  EfiQrCodeResponse,
  ReoboteCobrancaResult,
  ReoboteStatusResult,
} from './efi.types.ts';

export class EfiService {
  /**
   * Cria uma nova cobrança PIX imediata na Efí com geração de QR Code.
   */
  async criarCobrancaPix(input: EfiCriarCobrancaInput): Promise<ReoboteCobrancaResult> {
    const { id_pedido, id_motoboy, valor, descricao, referencia_externa, expiracao_segundos } = input;

    logger.info('Criando cobrança Pix na Efí', {
      id_pedido,
      id_motoboy,
      valor,
      referencia_externa,
    });

    const infoAdicionais = [
      { nome: 'id_pedido', valor: String(id_pedido) },
      { nome: 'id_motoboy', valor: String(id_motoboy) },
    ];

    if (referencia_externa) {
      infoAdicionais.push({ nome: 'referencia', valor: String(referencia_externa) });
    }

    const payload: EfiCobrancaPayload = {
      calendario: {
        expiracao: expiracao_segundos || 3600,
      },
      valor: {
        original: valor.toFixed(2),
      },
      chave: config.efi.pixKey || 'reobote-pix-key',
      solicitacaoPagador: descricao.slice(0, 140),
      infoAdicionais,
    };

    // 1. Criar a cobrança na Efí (POST /v2/cob)
    const cobranca = await efiClient.request<EfiCobrancaResponse>('/v2/cob', {
      method: 'POST',
      body: payload,
    });

    if (!cobranca || !cobranca.txid) {
      throw new Error('A Efí não retornou o identificador da transação (txid).');
    }

    // 2. Gerar QR Code e Copia e Cola associados ao loc.id da cobrança
    let qrCodeData: EfiQrCodeResponse = {
      qrcode: '',
      imagemQrcode: '',
    };

    if (cobranca.loc?.id) {
      try {
        qrCodeData = await efiClient.request<EfiQrCodeResponse>(`/v2/loc/${cobranca.loc.id}/qrcode`, {
          method: 'GET',
        });
      } catch (qrErr) {
        logger.warn('Não foi possível obter o QR Code gerado pelo loc.id da Efí.', qrErr);
      }
    }

    const reoboteStatus = mapEfiStatusToReobote(cobranca.status);

    const resultado: ReoboteCobrancaResult = {
      sucesso: true,
      id_cobranca: String(cobranca.loc?.id || cobranca.txid),
      identificador_transacao: cobranca.txid,
      status: reoboteStatus,
      valor,
      codigo_pix: qrCodeData.qrcode,
      qr_code: qrCodeData.imagemQrcode,
      pix_copia_e_cola: qrCodeData.qrcode,
      data_criacao: cobranca.criacao || new Date().toISOString(),
      detalhes: {
        id_pedido,
        id_motoboy,
        referencia_externa,
      },
    };

    logger.info('Cobrança Pix criada com sucesso na Efí', {
      txid: cobranca.txid,
      id_cobranca: resultado.id_cobranca,
      status: resultado.status,
    });

    return resultado;
  }

  /**
   * Consulta o status atual de uma cobrança Pix na Efí pelo txid.
   */
  async consultarStatus(idOrTxid: string): Promise<ReoboteStatusResult> {
    logger.info(`Consultando status da cobrança na Efí: ${idOrTxid}`);

    const cobranca = await efiClient.request<EfiCobrancaResponse>(`/v2/cob/${idOrTxid}`, {
      method: 'GET',
    });

    if (!cobranca || !cobranca.txid) {
      throw new Error(`Cobrança [${idOrTxid}] não encontrada na Efí.`);
    }

    const statusMapeado = mapEfiStatusToReobote(cobranca.status);
    const valorOriginal = cobranca.valor?.original ? parseFloat(cobranca.valor.original) : 0;

    // Extrair dados adicionais se presentes
    const detalhes: Record<string, string> = {};
    if (Array.isArray(cobranca.infoAdicionais)) {
      for (const info of cobranca.infoAdicionais) {
        detalhes[info.nome] = info.valor;
      }
    }

    // Verificar se houve pix recebido
    let pixRecebido: ReoboteStatusResult['pix_recebido'] = undefined;
    let dataPagamento: string | undefined = undefined;

    if (Array.isArray(cobranca.pix) && cobranca.pix.length > 0) {
      const primeiroPix = cobranca.pix[0];
      dataPagamento = primeiroPix.horario;
      pixRecebido = {
        end_to_end_id: primeiroPix.endToEndId,
        horario: primeiroPix.horario,
        valor: parseFloat(primeiroPix.valor),
      };
    }

    return {
      sucesso: true,
      id_cobranca: String(cobranca.loc?.id || cobranca.txid),
      identificador_transacao: cobranca.txid,
      status: statusMapeado,
      status_original_efi: cobranca.status,
      valor: valorOriginal,
      data_criacao: cobranca.criacao,
      data_pagamento: dataPagamento,
      pix_recebido: pixRecebido,
      detalhes: {
        id_pedido: detalhes.id_pedido,
        id_motoboy: detalhes.id_motoboy,
        referencia_externa: detalhes.referencia || detalhes.referencia_externa,
      },
    };
  }
}

export const efiService = new EfiService();
