// src/components/denuncias/situacoes.ts
import type { SituacaoDenuncia } from '@/types/api';

export const ROTULO_SITUACAO_DENUNCIA: Record<SituacaoDenuncia, string> = {
  RECEBIDA: 'Recebida',
  ENCAMINHADA_REGIONAL: 'Encaminhada à regional',
  EQUIPE_DESIGNADA: 'Equipe designada',
  RESOLVIDA: 'Resolvida',
};
