// src/schemas/denuncias.ts
import { z } from 'zod';
import { coordenadasSchema } from './comum';

export const DESCRICAO_DENUNCIA_MIN = 10;
export const DESCRICAO_DENUNCIA_MAX = 500;

export const REGEX_PROTOCOLO = /^REC-\d{4}-\d{5}$/;

export const criarDenunciaSchema = z.object({
  localizacao: z
    .unknown()
    .refine((valor) => valor !== undefined && valor !== null, {
      message: 'Informe a localização da ocorrência.',
    })
    .pipe(coordenadasSchema),
  fotoUrl: z
    .string({
      required_error: 'A foto é obrigatória.',
      invalid_type_error: 'A foto é obrigatória.',
    })
    .trim()
    .min(1, 'A foto é obrigatória.')
    .url('URL da foto inválida.'),
  descricao: z
    .string({ required_error: 'Informe a descrição.', invalid_type_error: 'Informe a descrição.' })
    .trim()
    .min(
      DESCRICAO_DENUNCIA_MIN,
      `Descreva a ocorrência com ao menos ${DESCRICAO_DENUNCIA_MIN} caracteres.`,
    )
    .max(DESCRICAO_DENUNCIA_MAX, `A descrição pode ter até ${DESCRICAO_DENUNCIA_MAX} caracteres.`),
});

export const protocoloDenunciaSchema = z.object({
  protocolo: z.string().regex(REGEX_PROTOCOLO, 'Protocolo inválido.'),
});

export type CriarDenunciaEntrada = z.infer<typeof criarDenunciaSchema>;
