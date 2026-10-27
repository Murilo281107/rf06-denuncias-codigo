// src/app/api/denuncias/minhas/route.ts
import { rotaProtegida } from '@/lib/api-handler';
import { PARTICIPANTES } from '@/lib/perfis';
import { listarMinhasDenuncias } from '@/services/denuncias';

export const runtime = 'nodejs';

export const GET = rotaProtegida(PARTICIPANTES, async ({ sessao }) =>
  listarMinhasDenuncias(sessao),
);
