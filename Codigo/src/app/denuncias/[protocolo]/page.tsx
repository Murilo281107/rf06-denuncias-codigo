// src/app/denuncias/[protocolo]/page.tsx
'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { EstadoCarregando } from '@/components/comum/EstadoCarregando';
import { EstadoErro } from '@/components/comum/EstadoErro';
import { LinhaDoTempo } from '@/components/denuncias/LinhaDoTempo';
import { ROTULO_SITUACAO_DENUNCIA } from '@/components/denuncias/situacoes';
import { useDenuncia } from '@/hooks/useDenuncias';
import { ehApiErro } from '@/lib/fetcher';
import { formatarDataHora } from '@/lib/formatadores';
import { linkDeRota } from '@/lib/geo';

export default function PaginaDetalheDenuncia({
  params,
}: {
  params: Promise<{ protocolo: string }>;
}) {
  const { protocolo } = use(params);
  const { data, isLoading, isError, error, refetch } = useDenuncia(protocolo);

  if (isLoading) return <EstadoCarregando />;
  if (isError) {
    const status = ehApiErro(error) ? error.status : 0;

    if (status === 403) {
      return (
        <EstadoErro
          titulo="Sem acesso a esta denúncia"
          mensagem="Só quem registrou a denúncia pode acompanhá-la."
        />
      );
    }
    if (status === 404) {
      return (
        <EstadoErro
          titulo="Denúncia não encontrada"
          mensagem="Confira o protocolo e tente novamente."
        />
      );
    }

    return <EstadoErro aoTentarDeNovo={() => void refetch()} />;
  }
  if (!data) return null;

  return (
    <article>
      <Link href="/denuncias">Voltar</Link>
      <h1>Denúncia {data.protocolo}</h1>
      <p data-testid="situacao-atual">
        Situação: <strong>{ROTULO_SITUACAO_DENUNCIA[data.situacao]}</strong>
      </p>
      <p>Aberta em {formatarDataHora(data.criadoEm)}</p>
      {data.usuarioNome ? <p>Denunciante: {data.usuarioNome}</p> : null}
      <Image src={data.fotoUrl} alt="Foto da ocorrência" width={800} height={600} unoptimized />
      <p>{data.descricao}</p>
      <a href={linkDeRota(data.localizacao)} target="_blank" rel="noreferrer">
        Ver no mapa
      </a>

      <h2>Linha do tempo</h2>
      <LinhaDoTempo historico={data.historico} />
    </article>
  );
}
