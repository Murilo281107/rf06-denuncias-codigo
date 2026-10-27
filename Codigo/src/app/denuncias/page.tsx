// src/app/denuncias/page.tsx
'use client';

import Link from 'next/link';
import { EstadoCarregando } from '@/components/comum/EstadoCarregando';
import { EstadoErro } from '@/components/comum/EstadoErro';
import { EstadoVazio } from '@/components/comum/EstadoVazio';
import { CardDenuncia } from '@/components/denuncias/CardDenuncia';
import { useMinhasDenuncias } from '@/hooks/useDenuncias';

export default function PaginaMinhasDenuncias() {
  const { data, isLoading, isError, refetch } = useMinhasDenuncias();

  return (
    <section>
      <h1>Minhas denúncias</h1>
      <Link href="/denuncias/nova">Nova denúncia</Link>

      {isLoading ? <EstadoCarregando mensagem="Carregando denúncias..." /> : null}
      {isError ? <EstadoErro aoTentarDeNovo={() => void refetch()} /> : null}
      {data && data.length === 0 ? (
        <EstadoVazio
          titulo="Você ainda não fez nenhuma denúncia"
          mensagem="Viu descarte irregular ou lixo acumulado? Registre e acompanhe pelo protocolo."
          acao={<Link href="/denuncias/nova">Fazer uma denúncia</Link>}
        />
      ) : null}
      {data && data.length > 0 ? (
        <ul>
          {data.map((denuncia) => (
            <li key={denuncia.id}>
              <CardDenuncia denuncia={denuncia} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
