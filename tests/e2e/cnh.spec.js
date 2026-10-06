import { test, expect } from '@playwright/test'
import { pdfFile } from '../helpers/pdf.mjs'
import { tiposDocumento } from '../fixtures/tipos-documento.mjs'

const user = {
  id: 42,
  name: 'Pessoa de teste',
  email: 'teste@example.com',
  cpf: '01149897295',
  telefone: '69999999999',
  status: 'ativo',
}
const motorista = { id: 7, user_id: user.id, user, status: 'pendente' }
const paginated = (data) => ({
  data,
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: data.length,
})
const cnh = pdfFile([
  'NOME: JOAO DA SILVA',
  'CPF: 52998224725',
  'DATA NASCIMENTO: 20/05/1990',
  'NUMERO DE REGISTRO: 00024681357',
  'CATEGORIA: AD',
  'PRIMEIRA HABILITACAO: 10/06/2008',
  'DATA EMISSAO: 15/01/2026',
  'VALIDADE: 15/01/2036',
  'EAR: Nao',
  'OBSERVACOES: A, B',
])

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('token', 'token-de-teste'))
  await page.route('**/*', async (route) => {
    const request = route.request()
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    }
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers })
      return
    }
    if (!['xhr', 'fetch'].includes(request.resourceType())) {
      if (new URL(request.url()).origin === 'http://127.0.0.1:18789') await route.continue()
      else await route.abort()
      return
    }
    const url = new URL(request.url())
    if (url.origin === 'http://127.0.0.1:18789' && /^\/(?:assets|ocr|pdfjs)\//.test(url.pathname)) {
      await route.continue()
      return
    }
    const endpoint = url.pathname.replace(/^\/api/, '')
    let data
    if (endpoint === '/usuario-logado') data = { id: 90, name: 'Operador', status: 'ativo' }
    else if (endpoint === '/motoristas') data = paginated([motorista])
    else if (endpoint === '/motoristas/7') data = motorista
    else if (endpoint === '/motorista-documentos/tipos') data = { data: tiposDocumento }
    else if (endpoint === '/motorista-documentos/7/resumo')
      data = {
        data: tiposDocumento.map((tipo) => ({ ...tipo, id: null, status: null, observacao: null })),
      }
    else if (endpoint === '/motorista-documentos' && request.method() === 'POST') {
      data = {
        message: 'Arquivo enviado com sucesso',
        data: {
          id: 100,
          motorista_id: 7,
          tipo_documento: request.postData().match(/name="tipo_documento"\r\n\r\n([a-z_]+)/)?.[1],
          status: 'em_analise',
        },
      }
    } else {
      await route.abort()
      return
    }
    await route.fulfill({ status: request.method() === 'POST' ? 201 : 200, headers, json: data })
  })
  await page.goto('/motoristas')
  await page
    .locator('button')
    .filter({ has: page.locator('.q-icon', { hasText: /^list_alt$/ }) })
    .click()
  await page
    .locator('.q-dialog .q-icon.cursor-pointer')
    .filter({ hasText: /^upload$/ })
    .first()
    .click()
  await expect(page.locator('.documento-dialog input[type=date]').first()).toBeEnabled()
  await expect(page.getByLabel('Número da CNH', { exact: true })).toHaveCount(0)
})

async function reabrirDocumentos(page) {
  const upload = page.locator('.documento-dialog')
  await upload.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(upload).not.toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.documentos-usuario-dialog')).not.toBeVisible()
  await page
    .locator('button')
    .filter({ has: page.locator('.q-icon', { hasText: /^list_alt$/ }) })
    .click()
}

test('usa os títulos e a ordem do catálogo da API e aguarda seu carregamento', async ({ page }) => {
  const consultas = []
  page.on('request', (request) => {
    if (request.method() === 'GET' && request.url().includes('/motorista-documentos/'))
      consultas.push(new URL(request.url()).pathname.replace(/^\/api/, ''))
  })
  const catalogo = [...tiposDocumento]
    .reverse()
    .map((tipo) => ({ ...tipo, titulo: `API: ${tipo.titulo}` }))
  let liberar
  const aguardar = new Promise((resolve) => {
    liberar = resolve
  })
  await page.route('**/motorista-documentos/7/resumo', async (route) => {
    await aguardar
    await route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: { data: catalogo },
    })
  })
  await reabrirDocumentos(page)
  const documentos = page.locator('.documentos-usuario-dialog')
  try {
    await expect(documentos.locator('.q-inner-loading').getByRole('status')).toContainText(
      'Carregando documentos',
    )
    await expect(documentos.locator('.q-icon.cursor-pointer')).toHaveCount(0)
    await expect(documentos.locator('.q-table .q-item__label.text-h6')).toHaveCount(0)
  } finally {
    liberar()
  }
  await expect(documentos.locator('.q-table .q-item__label.text-h6')).toHaveText(
    catalogo.map((tipo) => tipo.titulo),
  )
  await expect(documentos.locator('.q-icon.cursor-pointer')).toHaveCount(4)
  expect(consultas).toEqual(['/motorista-documentos/7/resumo'])
})

test('permite tentar novamente quando o catálogo de documentos falha', async ({ page }) => {
  let consultas = 0
  await page.route('**/motorista-documentos/7/resumo', async (route) => {
    consultas++
    await route.fulfill({
      status: consultas === 1 ? 500 : 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: consultas === 1 ? { message: 'Catálogo indisponível' } : { data: tiposDocumento },
    })
  })
  await reabrirDocumentos(page)
  const documentos = page.locator('.documentos-usuario-dialog')
  await expect(documentos.locator('.q-banner')).toContainText(
    'Não foi possível carregar os documentos',
  )
  await expect(documentos.locator('.q-icon.cursor-pointer')).toHaveCount(0)
  await documentos.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(documentos.locator('.q-table .q-item__label.text-h6')).toHaveText(
    tiposDocumento.map((tipo) => tipo.titulo),
  )
  await expect(documentos.locator('.q-banner')).toHaveCount(0)
})

for (const tipo of tiposDocumento.filter((item) => !item.possui_dados_cnh)) {
  test(`envia ${tipo.titulo} com o valor do enum retornado pela API`, async ({ page }) => {
    const upload = page.locator('.documento-dialog')
    await upload.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(upload).not.toBeVisible()
    await page
      .locator('.documentos-usuario-dialog tr')
      .filter({ hasText: tipo.titulo })
      .locator('.q-icon.cursor-pointer')
      .click()
    await expect(upload.getByRole('group', { name: 'Campos da CNH' })).toHaveCount(0)
    await upload.locator('input[type=file]').setInputFiles(cnh)
    const enviado = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/motorista-documentos'),
    )
    await upload.getByRole('button', { name: 'Enviar', exact: true }).click()
    const request = await enviado
    expect(request.postData()).toContain(`name="tipo_documento"\r\n\r\n${tipo.tipo_documento}`)
    expect(request.postData()).not.toContain('name="cnh[')
    await expect(upload).not.toBeVisible()
  })
}

test('preenche os campos, exibe a previa e envia os dados no motorista correto', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const dialog = page.locator('.documento-dialog')
  await dialog.locator('input[type=file]').setInputFiles(cnh)
  await expect(dialog.getByRole('status')).toContainText('10 campos preenchidos')
  await expect(dialog.getByLabel('Nome na CNH', { exact: true })).toHaveValue('JOAO DA SILVA')
  await expect(dialog.getByLabel('CPF', { exact: true })).toHaveValue('529.982.247-25')
  await expect(dialog.getByLabel('Número de registro', { exact: true })).toHaveValue('00024681357')
  await expect(dialog.getByLabel('Data de emissão', { exact: true })).toHaveValue('2026-01-15')
  await expect(dialog.getByLabel('Observações da CNH', { exact: true })).toHaveValue('A, B')
  await expect(dialog.locator('iframe')).toHaveAttribute('src', /^blob:/)
  const [left, right] = await Promise.all([
    dialog.locator('.dados-documento').boundingBox(),
    dialog.locator('.previa-documento').boundingBox(),
  ])
  expect(left.x + left.width).toBeLessThanOrEqual(right.x + 1)
  const sent = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/motorista-documentos'),
  )
  await dialog.getByRole('button', { name: 'Enviar', exact: true }).click()
  const request = await sent
  expect(request.postData()).toContain('name="motorista_id"\r\n\r\n7')
  expect(request.postData()).toContain('name="tipo_documento"\r\n\r\ncnh')
  expect(request.postData()).toContain('name="cnh[numero_registro]"\r\n\r\n00024681357')
  expect(request.postData()).not.toContain('cnh[cnh_numero]')
  expect(request.postData()).toContain('name="cnh[observacao]"\r\n\r\nA, B')
  await expect(dialog).not.toBeVisible()
  expect(errors).toEqual([])
})

test('troca o PDF e preserva o nome editado manualmente', async ({ page }) => {
  const dialog = page.locator('.documento-dialog')
  const file = dialog.locator('input[type=file]')
  await file.setInputFiles(cnh)
  await expect(dialog.getByRole('status')).toContainText('10 campos preenchidos')
  await dialog.getByLabel('Nome na CNH', { exact: true }).fill('NOME CONFERIDO')
  await file.setInputFiles(pdfFile(['NOME: OUTRA PESSOA', 'NUMERO DE REGISTRO: 00033333333']))
  await expect(dialog.getByRole('status')).toContainText('1 campo preenchido')
  await expect(dialog.getByLabel('Nome na CNH', { exact: true })).toHaveValue('NOME CONFERIDO')
  await expect(dialog.getByLabel('Número de registro', { exact: true })).toHaveValue('00033333333')
  await expect(dialog.getByLabel('CPF', { exact: true })).toHaveValue('')
  await dialog.locator('.q-file [aria-label="Clear"]').click()
  await expect(dialog.locator('iframe')).toHaveCount(0)
  await expect(dialog.getByRole('status')).toHaveCount(0)
})

test('carrega observações salvas com um único loading e bloqueia todo o grupo', async ({
  page,
}) => {
  const dialog = page.locator('.documento-dialog')
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  let liberar
  const aguardar = new Promise((resolve) => {
    liberar = resolve
  })
  await page.route('**/motoristas/7', async (route) => {
    await aguardar
    await route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: { ...motorista, observacao: 'EAR\nA, B' },
    })
  })
  await page
    .locator('.q-dialog .q-icon.cursor-pointer')
    .filter({ hasText: /^upload$/ })
    .first()
    .click()
  const group = dialog.getByRole('group', { name: 'Campos da CNH' })
  try {
    await expect(group).toHaveAttribute('aria-busy', 'true')
    await expect(group.getByRole('status')).toContainText('Carregando dados da CNH')
    await expect(group.locator('.q-spinner')).toHaveCount(1)
    for (const campo of await group.locator('input, textarea').all())
      await expect(campo).toBeDisabled()
  } finally {
    liberar()
  }
  await expect(group).toHaveAttribute('aria-busy', 'false')
  await expect(group.locator('.q-spinner')).toHaveCount(0)
  await expect(dialog.getByLabel('Observações da CNH', { exact: true })).toHaveValue('EAR\nA, B')
  for (const campo of await group.locator('input, textarea').all())
    await expect(campo).toBeEnabled()
})

test('explica o preenchimento manual para PDF sem texto ou invalido', async ({ page }) => {
  const dialog = page.locator('.documento-dialog')
  await dialog.locator('input[type=file]').setInputFiles(pdfFile())
  await expect(dialog.getByRole('status')).toContainText('não tem texto disponível')
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'invalido.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('PDF invalido'),
  })
  await expect(dialog.getByRole('status')).toContainText('Não foi possível ler os dados')
  for (const campo of await dialog
    .getByRole('group', { name: 'Campos da CNH' })
    .locator('input, textarea')
    .all())
    await expect(campo).toBeEnabled()
  await expect(dialog.getByRole('button', { name: 'Enviar', exact: true })).toBeEnabled()
})

test('diferencia arquivo grande e formato incorreto, aceitando selecionar novamente um PDF valido', async ({
  page,
}) => {
  const file = page.locator('.documento-dialog input[type=file]')
  await file.setInputFiles({
    name: 'grande.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(2097153),
  })
  await expect(page.locator('.q-notification')).toContainText('ultrapassa o limite de 2 MB')
  await file.setInputFiles({
    name: 'arquivo.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('texto'),
  })
  await expect(
    page.locator('.q-notification').filter({ hasText: 'Formato não permitido' }),
  ).toBeVisible()
  await file.setInputFiles(cnh)
  await expect(page.locator('.documento-dialog').getByRole('status')).toContainText(
    '10 campos preenchidos',
  )
  await file.setInputFiles(cnh)
  await expect(page.locator('.documento-dialog').getByRole('status')).toContainText(
    '10 campos preenchidos',
  )
})

test('empilha os paineis no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const dialog = page.locator('.documento-dialog')
  await dialog.locator('input[type=file]').setInputFiles(cnh)
  await expect(dialog.getByRole('status')).toContainText('10 campos preenchidos')
  const [left, right, box] = await Promise.all([
    dialog.locator('.dados-documento').boundingBox(),
    dialog.locator('.previa-documento').boundingBox(),
    dialog.boundingBox(),
  ])
  expect(right.y).toBeGreaterThanOrEqual(left.y + left.height - 1)
  expect(box.width).toBeLessThanOrEqual(390)
})

test('preenche o PDF real de CNH-e com OCR da imagem', async ({ page }) => {
  test.skip(!process.env.CNH_PDF_PATH, 'Defina CNH_PDF_PATH para validar o documento local.')
  test.setTimeout(120000)
  const dialog = page.locator('.documento-dialog')
  await dialog.locator('input[type=file]').setInputFiles(process.env.CNH_PDF_PATH)
  await expect(dialog.getByRole('status')).toContainText('por leitura da imagem', {
    timeout: 110000,
  })
  await expect(dialog.getByLabel('Nome na CNH', { exact: true })).toHaveValue(
    /^[\p{L}][\p{L}\s.'’-]{2,254}$/u,
  )
  await expect(dialog.getByLabel('CPF', { exact: true })).toHaveValue(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
  await expect(dialog.getByLabel('Número de registro', { exact: true })).toHaveValue(/^\d{11}$/)
  for (const label of [
    'Data de nascimento',
    'Data de emissão',
    'Primeira habilitação',
    'Validade da CNH',
  ]) {
    await expect(dialog.getByLabel(label, { exact: true })).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)
  }
  await expect(dialog.getByLabel('Categoria', { exact: true })).toHaveValue(/^(?:A[B-E]?|[B-E])$/)
  for (const [label, value] of Object.entries(
    JSON.parse(process.env.CNH_EXPECTED_FIELDS || '{}'),
  )) {
    await expect(dialog.getByLabel(label, { exact: true })).toHaveValue(value)
  }
  await expect(dialog.locator('iframe')).toHaveAttribute('src', /^blob:/)
  await expect(page.locator('.q-notification')).toHaveCount(0)
})

test('cancela o OCR ao trocar o PDF e preserva a edição manual', async ({ page }) => {
  test.skip(!process.env.CNH_PDF_PATH, 'Defina CNH_PDF_PATH para validar o documento local.')
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const dialog = page.locator('.documento-dialog')
  const file = dialog.locator('input[type=file]')
  await dialog.getByLabel('Nome na CNH', { exact: true }).fill('NOME CONFERIDO')
  await file.setInputFiles(process.env.CNH_PDF_PATH)
  await expect(dialog.getByRole('status')).toContainText(/Preparando a leitura|Lendo a imagem/)
  const group = dialog.getByRole('group', { name: 'Campos da CNH' })
  await expect(group).toHaveAttribute('aria-busy', 'true')
  await expect(group.locator('.q-spinner')).toHaveCount(1)
  for (const campo of await group.locator('input, textarea').all())
    await expect(campo).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Enviar', exact: true })).toBeDisabled()
  await file.setInputFiles(cnh)
  await expect(dialog.getByRole('status')).toContainText('9 campos preenchidos')
  await expect(group).toHaveAttribute('aria-busy', 'false')
  for (const campo of await group.locator('input, textarea').all())
    await expect(campo).toBeEnabled()
  await expect(dialog.getByLabel('Nome na CNH', { exact: true })).toHaveValue('NOME CONFERIDO')
  await expect(dialog.getByLabel('CPF', { exact: true })).toHaveValue('529.982.247-25')
  await expect(dialog.getByLabel('Número de registro', { exact: true })).toHaveValue('00024681357')
  expect(errors).toEqual([])
})
