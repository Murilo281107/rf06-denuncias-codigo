// src/hooks/useDenuncias.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetcher';
import type { Coordenadas, Denuncia } from '@/types/api';

export const CHAVE_DENUNCIAS = ['denuncias'] as const;

export function useMinhasDenuncias() {
  return useQuery({
    queryKey: [...CHAVE_DENUNCIAS, 'minhas'],
    queryFn: () => api<Denuncia[]>('/api/denuncias/minhas'),
  });
}

export function useDenuncia(protocolo: string) {
  return useQuery({
    queryKey: [...CHAVE_DENUNCIAS, 'detalhe', protocolo],
    queryFn: () => api<Denuncia>(`/api/denuncias/${protocolo}`),
  });
}

export interface NovaDenuncia {
  localizacao: Coordenadas;
  fotoUrl: string;
  descricao: string;
}

export function useCriarDenuncia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (corpo: NovaDenuncia) => api<Denuncia>('/api/denuncias', { method: 'POST', corpo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_DENUNCIAS }),
  });
}
