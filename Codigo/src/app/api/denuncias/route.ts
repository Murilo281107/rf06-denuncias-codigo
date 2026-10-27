// src/app/api/denuncias/route.ts
import { criado, lerCorpo, rotaProtegida } from '@/lib/api-handler';
import { PARTICIPANTES } from '@/lib/perfis';
import { criarDenunciaSchema } from '@/schemas/denuncias';
import { criarDenuncia } from '@/services/denuncias';

export const runtime = 'nodejs';

export const POST = rotaProtegida(PARTICIPANTES, async ({ req, sessao }) =>
  criado(await criarDenuncia(sessao, await lerCorpo(req, criarDenunciaSchema))),
);
