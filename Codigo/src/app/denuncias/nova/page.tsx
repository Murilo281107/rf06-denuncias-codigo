// src/app/denuncias/nova/page.tsx
import type { Metadata } from 'next';
import { FormularioDenuncia } from '@/components/denuncias/FormularioDenuncia';

export const metadata: Metadata = { title: 'Nova denúncia' };

export default function PaginaNovaDenuncia() {
  return (
    <section>
      <h1>Nova denúncia</h1>
      <p>Informe onde está o problema, anexe uma foto e descreva o que está acontecendo.</p>
      <FormularioDenuncia />
    </section>
  );
}
