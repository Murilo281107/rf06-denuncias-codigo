// src/app/api/denuncias/route.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Denuncia } from '@/models';
import { encerrarBanco, iniciarBanco, limparBanco } from '@/test/banco';
import { criarUsuario } from '@/test/fabricas';
import { contextoDaRota, requisicao } from '@/test/sessao';
import { GET as GET_PROTOCOLO } from './[protocolo]/route';
import { GET as GET_MINHAS } from './minhas/route';
import { POST } from './route';

const CORPO = {
  localizacao: [-43.9345, -19.9167],
  fotoUrl: 'https://exemplo.public.blob.vercel-storage.com/denuncia.jpg',
  descricao: 'Lixo e entulho acumulados na esquina.',
};

beforeAll(async () => {
  process.env.JWT_SECRET = 'x'.repeat(40);
  await iniciarBanco();
});
afterAll(async () => {
  await encerrarBanco();
});
beforeEach(async () => {
  await limparBanco();
});

async function como(perfil: 'CIDADAO' | 'CATADOR' | 'GESTOR' = 'CIDADAO') {
  const usuario = await criarUsuario({ perfil });

  return { perfil, usuarioId: usuario._id.toString() };
}

async function enviar(corpo: unknown, autor: Awaited<ReturnType<typeof como>>) {
  return POST(await requisicao({ metodo: 'POST', corpo, ...autor }), contextoDaRota());
}

describe('POST /api/denuncias', () => {
  it('401 sem login', async () => {
    const res = await POST(await requisicao({ metodo: 'POST', corpo: CORPO }), contextoDaRota());

    expect(res.status).toBe(401);
  });

  it('GESTOR não denuncia (403)', async () => {
    const res = await enviar(CORPO, await como('GESTOR'));

    expect(res.status).toBe(403);
    expect(await Denuncia.countDocuments()).toBe(0);
  });

  it('400 com erro por campo e nenhuma denúncia incompleta criada', async () => {
    const res = await enviar({}, await como());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.erro.campos).toMatchObject({
      localizacao: 'Informe a localização da ocorrência.',
      fotoUrl: 'A foto é obrigatória.',
      descricao: 'Informe a descrição.',
    });
    expect(await Denuncia.countDocuments()).toBe(0);
  });

  it('400 se faltar só a foto', async () => {
    const res = await enviar({ ...CORPO, fotoUrl: undefined }, await como());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(Object.keys(json.erro.campos)).toEqual(['fotoUrl']);
    expect(await Denuncia.countDocuments()).toBe(0);
  });

  it('cidadão cria (201) com protocolo e situação RECEBIDA', async () => {
    const res = await enviar(CORPO, await como());
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.protocolo).toMatch(/^REC-\d{4}-\d{5}$/);
    expect(json.situacao).toBe('RECEBIDA');
    expect(json.historico).toHaveLength(1);
  });
});

describe('GET /api/denuncias/minhas e /api/denuncias/:protocolo', () => {
  it('dono lista e abre o detalhe', async () => {
    const dono = await como('CATADOR');
    const criada = await (await enviar(CORPO, dono)).json();

    const lista = await GET_MINHAS(await requisicao(dono), contextoDaRota());

    expect(lista.status).toBe(200);
    expect(await lista.json()).toHaveLength(1);

    const detalhe = await GET_PROTOCOLO(
      await requisicao(dono),
      contextoDaRota({ protocolo: criada.protocolo }),
    );

    expect(detalhe.status).toBe(200);
    expect((await detalhe.json()).protocolo).toBe(criada.protocolo);
  });

  it('outro participante recebe 403; o gestor recebe 200', async () => {
    const criada = await (await enviar(CORPO, await como())).json();
    const contexto = contextoDaRota({ protocolo: criada.protocolo });

    const estranho = await GET_PROTOCOLO(await requisicao(await como()), contexto);
    const gestor = await GET_PROTOCOLO(await requisicao(await como('GESTOR')), contexto);

    expect(estranho.status).toBe(403);
    expect(gestor.status).toBe(200);
  });

  it('minhas não mostra denúncias de outras pessoas', async () => {
    await enviar(CORPO, await como());

    const res = await GET_MINHAS(await requisicao(await como()), contextoDaRota());

    expect(await res.json()).toEqual([]);
  });

  it('401 sem login', async () => {
    const res = await GET_PROTOCOLO(
      await requisicao(),
      contextoDaRota({ protocolo: 'REC-2026-00001' }),
    );

    expect(res.status).toBe(401);
  });

  it('404 para protocolo malformado ou inexistente', async () => {
    const autor = await como();
    const malformado = await GET_PROTOCOLO(
      await requisicao(autor),
      contextoDaRota({ protocolo: 'abc' }),
    );
    const inexistente = await GET_PROTOCOLO(
      await requisicao(autor),
      contextoDaRota({ protocolo: 'REC-2026-99999' }),
    );

    expect(malformado.status).toBe(404);
    expect(inexistente.status).toBe(404);
  });
});
