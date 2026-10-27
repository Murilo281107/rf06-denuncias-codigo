// e2e/cidadao-denuncia.spec.ts
// RF-06: precisa do banco populado (`pnpm seed:reset`).

import { expect, test, type Page } from '@playwright/test';

const PROTOCOLO = /REC-\d{4}-\d{5}/;
const PROTOCOLO_DO_SEED = 'REC-2026-00123'; // denúncia da Rosana, já RESOLVIDA, com 4 etapas
const FOTO_FALSA = 'https://exemplo.public.blob.vercel-storage.com/e2e/ocorrencia.jpg';

// PNG 1x1 válido
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(process.env.SEED_SENHA ?? '');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
}

test.describe('denúncia cidadã', () => {
  test.use({
    geolocation: { latitude: -19.9167, longitude: -43.9345 },
    permissions: ['geolocation'],
  });

  test('cidadão denuncia, recebe o protocolo e acompanha a situação', async ({ page }) => {
    // O envio da foto vai para o Vercel Blob; no e2e respondemos com uma URL fixa.
    await page.route('**/api/upload', (rota) => rota.fulfill({ json: { url: FOTO_FALSA } }));

    await entrar(page, 'rosana.lima@email.com');
    await page.goto('/denuncias/nova');

    await page.getByRole('button', { name: 'Usar minha localização' }).click();
    await expect(page.getByLabel('Latitude')).toHaveValue(/^-19\.9/);
    await expect(page.getByLabel('Longitude')).toHaveValue(/^-43\.9/);

    await page
      .getByTestId('campo-foto')
      .setInputFiles({ name: 'ocorrencia.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByRole('button', { name: 'Remover' })).toBeVisible();

    await page.getByLabel('Descrição').fill('Entulho acumulado na calçada há uma semana.');
    await page.getByRole('button', { name: 'Enviar denúncia' }).click();

    await expect(page).toHaveURL(/\/denuncias\/REC-\d{4}-\d{5}$/);

    const protocolo = page.url().match(PROTOCOLO)![0];

    await expect(page.getByRole('heading', { name: `Denúncia ${protocolo}` })).toBeVisible();
    await expect(page.getByTestId('situacao-atual')).toContainText('Recebida');
    await expect(page.getByRole('list', { name: 'Linha do tempo da denúncia' })).toContainText(
      'Recebida',
    );

    await page.goto('/denuncias');
    await expect(page.getByRole('link', { name: protocolo })).toBeVisible();
  });

  test('não envia e mostra os erros quando faltam localização, foto e descrição', async ({
    page,
  }) => {
    await entrar(page, 'rosana.lima@email.com');
    await page.goto('/denuncias/nova');
    await page.getByRole('button', { name: 'Enviar denúncia' }).click();

    await expect(page.getByText('Informe a localização da ocorrência.')).toBeVisible();
    await expect(page.getByText('A foto é obrigatória.')).toBeVisible();
    await expect(page.getByText('Descreva a ocorrência com ao menos 10 caracteres.')).toBeVisible();
    await expect(page).toHaveURL(/\/denuncias\/nova$/);
  });
});

test('o dono vê a linha do tempo completa da sua denúncia', async ({ page }) => {
  await entrar(page, 'rosana.lima@email.com');
  await page.goto(`/denuncias/${PROTOCOLO_DO_SEED}`);

  await expect(page.getByTestId('situacao-atual')).toContainText('Resolvida');

  const linha = page.getByRole('list', { name: 'Linha do tempo da denúncia' });

  await expect(linha.getByRole('listitem')).toHaveCount(4);
  await expect(linha).toContainText('Encaminhada à regional');
  await expect(linha).toContainText('Equipe designada');
});

test('outro usuário não acessa a denúncia (403); o gestor acessa', async ({ page }) => {
  await entrar(page, 'fatima.souza@email.com');
  await page.goto(`/denuncias/${PROTOCOLO_DO_SEED}`);

  await expect(page.getByText('Sem acesso a esta denúncia')).toBeVisible();
  expect((await page.request.get(`/api/denuncias/${PROTOCOLO_DO_SEED}`)).status()).toBe(403);

  await page.context().clearCookies();
  await entrar(page, 'ana.lopes@slu.exemplo.gov.br');
  expect((await page.request.get(`/api/denuncias/${PROTOCOLO_DO_SEED}`)).status()).toBe(200);
});
