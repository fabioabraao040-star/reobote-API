import { Request, Response, NextFunction } from 'express';
import { efiService } from '../services/efi/efi.service.ts';
import { logger } from '../utils/logger.ts';

export async function consultarStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      res.status(400).json({
        sucesso: false,
        erro: 'Parâmetro ":id" (identificador da transação ou cobrança) é obrigatório.',
      });
      return;
    }

    const resultado = await efiService.consultarStatus(id.trim());

    logger.info(`Status da cobrança [${id}] obtido: ${resultado.status}`);

    res.status(200).json({
      sucesso: true,
      id_cobranca: resultado.id_cobranca,
      identificador_transacao: resultado.identificador_transacao,
      status: resultado.status,
      valor: resultado.valor,
      data: resultado.data_pagamento || resultado.data_criacao,
      data_criacao: resultado.data_criacao,
      data_pagamento: resultado.data_pagamento,
      pix_recebido: resultado.pix_recebido,
      // Dados estruturados prontos para consumo pelo Base44
      dados_para_base44: {
        id_cobranca: resultado.id_cobranca,
        id_transacao: resultado.identificador_transacao,
        status: resultado.status,
        valor: resultado.valor,
        data_pagamento: resultado.data_pagamento,
        data_atualizacao: new Date().toISOString(),
        id_pedido: resultado.detalhes?.id_pedido,
        id_motoboy: resultado.detalhes?.id_motoboy,
        referencia_externa: resultado.detalhes?.referencia_externa,
      },
    });
  } catch (error) {
    next(error);
  }
}
