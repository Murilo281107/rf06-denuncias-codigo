// src/app/api/denuncias/[protocolo]/route.ts
import { rotaProtegida } from '@/lib/api-handler';
import { erro } from '@/lib/erros';
import { TODOS_LOGADOS } from '@/lib/perfis';
import { protocoloDenunciaSchema } from '@/schemas/denuncias';
import { obterDenuncia } from '@/services/denuncias';

export const runtime = 'nodejs';

export const GET = rotaProtegida<{ protocolo: string }>(
  TODOS_LOGADOS,
  async ({ params, sessao }) => {
    const parsed = protocoloDenunciaSchema.safeParse(params);

    if (!parsed.success) throw erro('NAO_ENCONTRADO', 'Denúncia não encontrada.');

    return obterDenuncia(sessao, parsed.data.protocolo);
  },
);
