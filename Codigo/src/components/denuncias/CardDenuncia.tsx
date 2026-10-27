// src/components/denuncias/CardDenuncia.tsx

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatarDataHora } from '@/lib/formatadores';
import type { Denuncia } from '@/types/api';
import { ROTULO_SITUACAO_DENUNCIA } from './situacoes';

interface CardDenunciaProps {
  denuncia: Denuncia;
}

export function CardDenuncia({ denuncia }: CardDenunciaProps) {
  const { protocolo, situacao, descricao, criadoEm } = denuncia;

  return (
    <Card data-testid="card-denuncia">
      <CardHeader>
        <CardTitle>
          <Link href={`/denuncias/${protocolo}`}>{protocolo}</Link>
        </CardTitle>
        <strong>{ROTULO_SITUACAO_DENUNCIA[situacao]}</strong>
      </CardHeader>
      <CardContent>
        <p>{descricao}</p>
        <p>Aberta em {formatarDataHora(criadoEm)}</p>
      </CardContent>
    </Card>
  );
}
