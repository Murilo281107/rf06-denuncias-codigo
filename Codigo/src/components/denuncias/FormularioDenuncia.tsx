// src/components/denuncias/FormularioDenuncia.tsx
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CampoFoto } from '@/components/comum/CampoFoto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useCriarDenuncia } from '@/hooks/useDenuncias';
import { useGeolocalizacao } from '@/hooks/useGeolocalizacao';
import { ehApiErro } from '@/lib/fetcher';
import { DESCRICAO_DENUNCIA_MAX, criarDenunciaSchema } from '@/schemas/denuncias';

const CAMPOS_COM_ERRO = ['localizacao', 'fotoUrl', 'descricao'] as const;

function lerCoordenada(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.');

  if (limpo === '') return null;

  const numero = Number(limpo);

  return Number.isNaN(numero) ? null : numero;
}

export function FormularioDenuncia() {
  const router = useRouter();
  const toast = useToast();
  const criar = useCriarDenuncia();
  const geo = useGeolocalizacao({ automatico: false });

  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!geo.coordenadas) return;
    setLat(String(geo.coordenadas.lat));
    setLng(String(geo.coordenadas.lng));
  }, [geo.coordenadas]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();

    const latitude = lerCoordenada(lat);
    const longitude = lerCoordenada(lng);
    const candidata = {
      localizacao: latitude === null || longitude === null ? undefined : [longitude, latitude],
      fotoUrl: fotoUrl ?? undefined,
      descricao,
    };

    // Mesma regra do servidor: se algo falta ou está inválido, nada é enviado.
    const validacao = criarDenunciaSchema.safeParse(candidata);

    if (!validacao.success) {
      const novos: Record<string, string> = {};

      for (const problema of validacao.error.issues) {
        const campo = String(problema.path[0]);

        if ((CAMPOS_COM_ERRO as readonly string[]).includes(campo))
          novos[campo] ??= problema.message;
      }
      setErros(novos);

      return;
    }
    setErros({});

    try {
      const criada = await criar.mutateAsync(validacao.data);

      toast.sucesso(`Denúncia registrada. Protocolo ${criada.protocolo}.`);
      router.push(`/denuncias/${criada.protocolo}`);
    } catch (e) {
      if (ehApiErro(e)) {
        setErros(e.campos);
        toast.erro(e.message);
      } else {
        toast.erro('Não foi possível enviar a denúncia. Tente novamente.');
      }
    }
  }

  return (
    <form onSubmit={(e) => void aoEnviar(e)} noValidate>
      <fieldset>
        <legend>Localização da ocorrência *</legend>
        <Button onClick={() => geo.obter()} disabled={geo.status === 'carregando'}>
          {geo.status === 'carregando' ? 'Buscando...' : 'Usar minha localização'}
        </Button>
        {geo.status === 'negado' ? (
          <p role="alert">Permissão negada. Digite as coordenadas manualmente.</p>
        ) : null}
        {geo.status === 'indisponivel' ? (
          <p role="alert">Não foi possível obter sua posição. Digite as coordenadas manualmente.</p>
        ) : null}
        <label htmlFor="denuncia-lat">Latitude</label>
        <Input
          id="denuncia-lat"
          inputMode="decimal"
          value={lat}
          aria-invalid={Boolean(erros.localizacao)}
          onChange={(e) => setLat(e.target.value)}
        />
        <label htmlFor="denuncia-lng">Longitude</label>
        <Input
          id="denuncia-lng"
          inputMode="decimal"
          value={lng}
          aria-invalid={Boolean(erros.localizacao)}
          onChange={(e) => setLng(e.target.value)}
        />
        {erros.localizacao ? <p role="alert">{erros.localizacao}</p> : null}
      </fieldset>

      <CampoFoto valor={fotoUrl} aoMudar={setFotoUrl} rotulo="Foto da ocorrência" obrigatoria />
      {erros.fotoUrl ? <p role="alert">{erros.fotoUrl}</p> : null}

      <div>
        <label htmlFor="denuncia-descricao">Descrição *</label>
        <textarea
          id="denuncia-descricao"
          name="descricao"
          value={descricao}
          maxLength={DESCRICAO_DENUNCIA_MAX}
          rows={4}
          aria-invalid={Boolean(erros.descricao)}
          onChange={(e) => setDescricao(e.target.value)}
        />
        {erros.descricao ? <p role="alert">{erros.descricao}</p> : null}
      </div>

      <Button type="submit" disabled={criar.isPending}>
        {criar.isPending ? 'Enviando...' : 'Enviar denúncia'}
      </Button>
    </form>
  );
}
