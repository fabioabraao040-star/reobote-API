export type ReoboteStatus = 'PENDENTE' | 'PAGO' | 'EXPIRADO' | 'CANCELADO';

/**
 * Mapeia o status da API da Efí (Gerencianet) para o padrão REOBOTE/Base44
 */
export function mapEfiStatusToReobote(efiStatus: string | undefined | null): ReoboteStatus {
  if (!efiStatus) return 'PENDENTE';

  const normalized = efiStatus.toUpperCase().trim();

  switch (normalized) {
    case 'ATIVA':
    case 'PENDENTE':
    case 'CRIADA':
    case 'EM_PROCESSAMENTO':
    case 'WAITING':
      return 'PENDENTE';

    case 'CONCLUIDA':
    case 'PAGO':
    case 'PAGA':
    case 'RECEBIDO':
    case 'APROVADO':
    case 'SETTLED':
      return 'PAGO';

    case 'EXPIRADA':
    case 'EXPIRADO':
    case 'TIMEOUT':
      return 'EXPIRADO';

    case 'REMOVIDA_PELO_USUARIO_RECEBEDOR':
    case 'REMOVIDA_PELO_PSP':
    case 'CANCELADO':
    case 'CANCELADA':
    case 'DEVOLVIDO':
    case 'ESTORNADO':
      return 'CANCELADO';

    default:
      return 'PENDENTE';
  }
}
