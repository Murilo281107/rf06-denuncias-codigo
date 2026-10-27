// src/components/denuncias/LinhaDoTempo.tsx

import Image from 'next/image';
import { formatarDataHora } from '@/lib/formatadores';
import type { HistoricoDenuncia } from '@/types/api';
import { ROTULO_SITUACAO_DENUNCIA } from './situacoes';

interface LinhaDoTempoProps {
  historico: HistoricoDenuncia[];
}

export function LinhaDoTempo({ historico }: LinhaDoTempoProps) {
  const ultima = historico.length - 1;

  return (
    <ol aria-label="Linha do tempo da denúncia">
      {historico.map((etapa, indice) => (
        <li
          key={`${etapa.situacao}-${etapa.dataHora}`}
          aria-current={indice === ultima ? 'step' : undefined}
        >
          <strong>{ROTULO_SITUACAO_DENUNCIA[etapa.situacao]}</strong>
          <time dateTime={etapa.dataHora}> {formatarDataHora(etapa.dataHora)}</time>
          {etapa.fotoUrl ? (
            <Image
              src={etapa.fotoUrl}
              alt={`Foto da etapa ${ROTULO_SITUACAO_DENUNCIA[etapa.situacao]}`}
              width={400}
              height={300}
              unoptimized
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
