import { Request, Response, NextFunction } from 'express';

export interface ValidatedCriarCobrancaBody {
  id_pedido: string | number;
  id_motoboy: string | number;
  valor: number;
  descricao: string;
  referencia_externa?: string;
  expiracao_segundos?: number;
}

export function validateCriarCobranca(req: Request, res: Response, next: NextFunction): void {
  const body = req.body;

  if (!body || typeof body !== 'object') {
    res.status(400).json({
      sucesso: false,
      erro: 'Corpo da requisição inválido ou vazio. Formato JSON esperado.',
    });
    return;
  }

  // Obter id do pedido
  const idPedido = body.id_pedido ?? body.idPedido ?? body.pedido_id;
  if (idPedido === undefined || idPedido === null || String(idPedido).trim() === '') {
    res.status(400).json({
      sucesso: false,
      erro: 'Campo obrigatório ausente: "id_pedido" (identificador do pedido no Base44).',
    });
    return;
  }

  // Obter id do motoboy
  const idMotoboy = body.id_motoboy ?? body.idMotoboy ?? body.motoboy_id;
  if (idMotoboy === undefined || idMotoboy === null || String(idMotoboy).trim() === '') {
    res.status(400).json({
      sucesso: false,
      erro: 'Campo obrigatório ausente: "id_motoboy" (identificador do motoboy).',
    });
    return;
  }

  // Obter e validar valor
  let valor = body.valor;
  if (typeof valor === 'string') {
    // Normalizar caso venha com vírgula "15,50" ou "R$ 15.50"
    const cleaned = valor.replace('R$', '').replace(/\s+/g, '').replace(',', '.');
    valor = parseFloat(cleaned);
  }

  if (typeof valor !== 'number' || isNaN(valor) || valor <= 0) {
    res.status(400).json({
      sucesso: false,
      erro: 'Campo "valor" inválido. Deve ser um número positivo maior que 0.00.',
    });
    return;
  }

  // Arredondar para duas casas decimais
  valor = Math.round(valor * 100) / 100;

  // Obter descrição
  const descricao = body.descricao ?? body.solicitacaoPagador ?? `Pedido ${idPedido} - Reobote`;
  if (typeof descricao !== 'string' || descricao.trim().length === 0) {
    res.status(400).json({
      sucesso: false,
      erro: 'Campo "descricao" deve ser um texto não vazio.',
    });
    return;
  }

  // Referência externa opcional
  const referenciaExterna = body.referencia_externa ?? body.referenciaExterna ?? body.external_reference;

  // Tempo de expiração em segundos (padrão 3600 = 1h)
  const expiracao = body.expiracao_segundos ? parseInt(String(body.expiracao_segundos), 10) : 3600;

  // Atribuir dados normalizados e validados
  req.body = {
    id_pedido: idPedido,
    id_motoboy: idMotoboy,
    valor,
    descricao: descricao.trim().slice(0, 140), // Limite padrão Pix Efí
    referencia_externa: referenciaExterna ? String(referenciaExterna).trim() : undefined,
    expiracao_segundos: !isNaN(expiracao) && expiracao > 0 ? expiracao : 3600,
  } as ValidatedCriarCobrancaBody;

  next();
}
