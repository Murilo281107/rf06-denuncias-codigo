// src/services/denuncias.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { CENTRO_BH } from '@/lib/geo';
import { Denuncia } from '@/models';
import { criarDenunciaSchema } from '@/schemas/denuncias';
import { criarUsuario } from '@/test/fabricas';
import { encerrarBanco, iniciarBanco, limparBanco } from '@/test/banco';
import { criarDenuncia, listarMinhasDenuncias, obterDenuncia } from './denuncias';

const FOTO = 'https://exemplo.public.blob.vercel-storage.com/denuncia.jpg';
const LOCAL: [number, number] = [CENTRO_BH.lng, CENTRO_BH.lat];
const ENTRADA = { localizacao: LOCAL, fotoUrl: FOTO, descricao: 'Entulho acumulado na calçada.' };
const ANO = new Date().getUTCFullYear();

beforeAll(async () => {
  await iniciarBanco();
});
afterAll(async () => {
  await encerrarBanco();
});
beforeEach(async () => {
  await limparBanco();
});

async function sessaoDe(perfil: 'CIDADAO' | 'CATADOR' | 'GESTOR' = 'CIDADAO') {
  const usuario = await criarUsuario({ perfil });

  return { id: usuario._id.toString(), perfil, nome: usuario.nome };
}

describe('criarDenuncia', () => {
  it('nasce RECEBIDA, com protocolo REC-AAAA-NNNNN e a primeira entrada do histórico', async () => {
    const sessao = await sessaoDe();
    const dto = await criarDenuncia(sessao, ENTRADA);

    expect(dto.protocolo).toBe(`REC-${ANO}-00001`);
    expect(dto.situacao).toBe('RECEBIDA');
    expect(dto.historico).toHaveLength(1);
    expect(dto.historico[0]!.situacao).toBe('RECEBIDA');
    expect(dto.localizacao).toEqual(LOCAL);
    expect(dto).not.toHaveProperty('usuarioId');

    const salva = await Denuncia.findOne({ protocolo: dto.protocolo }).lean();

    expect(salva!.usuarioId.toString()).toBe(sessao.id);
    expect(salva!.historico).toHaveLength(1);
  });

  it('CATADOR também pode denunciar', async () => {
    const dto = await criarDenuncia(await sessaoDe('CATADOR'), ENTRADA);

    expect(dto.protocolo).toMatch(/^REC-\d{4}-\d{5}$/);
  });

  it('continua a numeração a partir do maior protocolo do ano (ex.: o do seed)', async () => {
    const autor = await criarUsuario();

    await Denuncia.create({
      protocolo: `REC-${ANO}-00123`,
      usuarioId: autor._id,
      localizacao: { type: 'Point', coordinates: LOCAL },
      fotoUrl: FOTO,
      descricao: 'Denúncia antiga já existente.',
      historico: [{ situacao: 'RECEBIDA', dataHora: new Date('2026-01-01') }],
    });

    const dto = await criarDenuncia(await sessaoDe(), ENTRADA);

    expect(dto.protocolo).toBe(`REC-${ANO}-00124`);
  });

  it('denúncias simultâneas recebem protocolos únicos', async () => {
    const sessoes = await Promise.all([sessaoDe(), sessaoDe(), sessaoDe(), sessaoDe()]);
    const dtos = await Promise.all(sessoes.map((s) => criarDenuncia(s, ENTRADA)));
    const protocolos = dtos.map((d) => d.protocolo);

    expect(new Set(protocolos).size).toBe(4);
    expect(await Denuncia.countDocuments()).toBe(4);
  });
});

describe('validação (schema)', () => {
  const campos = (entrada: unknown) => {
    const r = criarDenunciaSchema.safeParse(entrada);

    return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
  };

  it('exige localização, foto e descrição, com mensagens em português', () => {
    expect(campos({})).toEqual({
      localizacao: 'Informe a localização da ocorrência.',
      fotoUrl: 'A foto é obrigatória.',
      descricao: 'Informe a descrição.',
    });
  });

  it('aceita dados completos', () => {
    expect(criarDenunciaSchema.safeParse(ENTRADA).success).toBe(true);
  });

  it('rejeita coordenadas fora do intervalo, descrição curta e URL inválida', () => {
    expect(campos({ ...ENTRADA, localizacao: [-200, 0] })).toHaveProperty('localizacao');
    expect(campos({ ...ENTRADA, localizacao: [0, 95] })).toHaveProperty('localizacao');
    expect(campos({ ...ENTRADA, descricao: 'curta' })).toHaveProperty('descricao');
    expect(campos({ ...ENTRADA, descricao: 'x'.repeat(501) })).toHaveProperty('descricao');
    expect(campos({ ...ENTRADA, fotoUrl: 'nao-e-url' })).toHaveProperty('fotoUrl');
  });
});

describe('listarMinhasDenuncias', () => {
  it('lista só as minhas, da mais recente para a mais antiga', async () => {
    const eu = await sessaoDe();
    const outro = await sessaoDe();
    const base = { fotoUrl: FOTO, descricao: 'Descrição da denúncia.' };
    const local = { type: 'Point', coordinates: LOCAL };
    const meu = new Types.ObjectId(eu.id);

    await Denuncia.create([
      {
        ...base,
        protocolo: `REC-${ANO}-00001`,
        usuarioId: meu,
        localizacao: local,
        historico: [{ situacao: 'RECEBIDA', dataHora: new Date('2026-09-01') }],
      },
      {
        ...base,
        protocolo: `REC-${ANO}-00002`,
        usuarioId: new Types.ObjectId(outro.id),
        localizacao: local,
        historico: [{ situacao: 'RECEBIDA', dataHora: new Date('2026-09-02') }],
      },
      {
        ...base,
        protocolo: `REC-${ANO}-00003`,
        usuarioId: meu,
        localizacao: local,
        historico: [{ situacao: 'RECEBIDA', dataHora: new Date('2026-09-03') }],
      },
    ]);

    const lista = await listarMinhasDenuncias(eu);

    expect(lista.map((d) => d.protocolo)).toEqual([`REC-${ANO}-00003`, `REC-${ANO}-00001`]);
  });

  it('lista vazia para quem nunca denunciou', async () => {
    expect(await listarMinhasDenuncias(await sessaoDe())).toEqual([]);
  });
});

describe('obterDenuncia', () => {
  it('o dono vê situação e linha do tempo', async () => {
    const dono = await sessaoDe();
    const criada = await criarDenuncia(dono, ENTRADA);
    const dto = await obterDenuncia(dono, criada.protocolo);

    expect(dto.protocolo).toBe(criada.protocolo);
    expect(dto.situacao).toBe('RECEBIDA');
    expect(dto.historico).toHaveLength(1);
    expect(dto).not.toHaveProperty('usuarioNome');
  });

  it('SEM_PERMISSAO para outro participante', async () => {
    const criada = await criarDenuncia(await sessaoDe(), ENTRADA);

    await expect(obterDenuncia(await sessaoDe('CATADOR'), criada.protocolo)).rejects.toMatchObject({
      codigo: 'SEM_PERMISSAO',
    });
  });

  it('o gestor acessa qualquer denúncia e vê o nome do denunciante', async () => {
    const dono = await sessaoDe();
    const criada = await criarDenuncia(dono, ENTRADA);
    const dto = await obterDenuncia(await sessaoDe('GESTOR'), criada.protocolo);

    expect(dto.protocolo).toBe(criada.protocolo);
    expect(dto.usuarioNome).toBe(dono.nome);
  });

  it('NAO_ENCONTRADO para protocolo inexistente', async () => {
    await expect(obterDenuncia(await sessaoDe(), `REC-${ANO}-99999`)).rejects.toMatchObject({
      codigo: 'NAO_ENCONTRADO',
    });
  });
});
