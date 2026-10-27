// src/services/denuncias.ts
import { Types } from 'mongoose';
import type { Sessao } from '@/lib/auth';
import { conectar, emTransacao } from '@/lib/db';
import { denunciaDto } from '@/lib/dto';
import { erro } from '@/lib/erros';
import { paraGeoPoint } from '@/lib/geo';
import { comRetentativa, proximoCodigo } from '@/lib/sequencial';
import { Denuncia, Usuario, type IDenuncia } from '@/models';
import type { CriarDenunciaEntrada } from '@/schemas/denuncias';

export type DenunciaDto = ReturnType<typeof denunciaDto>;

const PREFIXO_PROTOCOLO = 'REC';

function dataDeAbertura(d: IDenuncia): number {
  return d.historico[0]?.dataHora.getTime() ?? 0;
}

export async function criarDenuncia(
  sessao: Sessao,
  entrada: CriarDenunciaEntrada,
): Promise<DenunciaDto> {
  // Protocolo + denúncia + 1ª entrada do histórico saem na mesma transação: ou nasce
  // completa ou não nasce. Se duas denúncias pegarem o mesmo número, o índice único
  // de `protocolo` rejeita a segunda e a operação inteira é refeita.
  const criada = await comRetentativa(() =>
    emTransacao(async (session) => {
      const protocolo = await proximoCodigo(Denuncia, 'protocolo', PREFIXO_PROTOCOLO, { session });
      const [denuncia] = await Denuncia.create(
        [
          {
            protocolo,
            usuarioId: new Types.ObjectId(sessao.id),
            localizacao: paraGeoPoint(entrada.localizacao),
            fotoUrl: entrada.fotoUrl,
            descricao: entrada.descricao,
            situacao: 'RECEBIDA',
            historico: [{ situacao: 'RECEBIDA', dataHora: new Date() }],
          },
        ],
        { session },
      );

      return denuncia!.toObject();
    }),
  );

  return denunciaDto(criada);
}

export async function listarMinhasDenuncias(sessao: Sessao): Promise<DenunciaDto[]> {
  await conectar();

  const denuncias = await Denuncia.find({ usuarioId: new Types.ObjectId(sessao.id) }).lean();

  return denuncias
    .sort((a, b) => dataDeAbertura(b) - dataDeAbertura(a) || b.protocolo.localeCompare(a.protocolo))
    .map((d) => denunciaDto(d));
}

export async function obterDenuncia(sessao: Sessao, protocolo: string): Promise<DenunciaDto> {
  await conectar();

  const denuncia = await Denuncia.findOne({ protocolo }).lean();

  if (!denuncia) throw erro('NAO_ENCONTRADO', 'Denúncia não encontrada.');

  const ehGestor = sessao.perfil === 'GESTOR';

  if (!ehGestor && denuncia.usuarioId.toString() !== sessao.id) {
    throw erro('SEM_PERMISSAO', 'Você não tem acesso a esta denúncia.');
  }
  if (!ehGestor) return denunciaDto(denuncia);

  const autor = await Usuario.findById(denuncia.usuarioId).select('nome').lean();

  return denunciaDto(denuncia, { usuarioNome: autor?.nome });
}
