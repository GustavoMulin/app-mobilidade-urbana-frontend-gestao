<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar
          rounded
          size="52px"
          color="pink-1"
          text-color="pink-7"
          icon="confirmation_number"
        />
        <div class="col">
          <div class="text-caption text-grey-7">Configurações</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Cupons</h1>
          <div class="text-grey-7 q-mt-xs">
            Os cupons criados aqui são os que o passageiro vê na aba Cupons do app. Um cupom pode
            ser
            <b>resgatado pelo código</b> (público) ou <b>entregue por você</b> na carteira de
            passageiros escolhidos ou de todos. O desconto abate o valor da corrida; o motorista
            recebe o mesmo.
          </div>
        </div>
        <q-btn
          v-if="pode('configuracoes.gerenciar')"
          color="primary"
          icon="add"
          label="Novo cupom"
          @click="abrirFormulario(null)"
        />
      </q-card-section>
    </q-card>

    <q-card>
      <q-table
        :rows="linhas"
        :columns="colunas"
        row-key="id"
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #top>
          <q-btn-toggle
            v-model="filtroSituacao"
            class="q-mr-md"
            toggle-color="primary"
            no-caps
            :options="[
              { label: 'Todos', value: null },
              { label: 'Vigentes', value: 'vigente' },
              { label: 'Agendados', value: 'agendado' },
              { label: 'Inativos', value: 'inativo' },
              { label: 'Expirados', value: 'expirado' },
              { label: 'Esgotados', value: 'esgotado' },
            ]"
            @update:model-value="carregar"
          />
          <q-space />
          <q-input
            v-model="busca"
            filled
            dense
            debounce="300"
            placeholder="Pesquisar código ou título"
            @update:model-value="carregar"
          >
            <template v-if="busca" #append>
              <q-icon name="close" class="cursor-pointer" @click="limparBusca" />
            </template>
          </q-input>
        </template>

        <template #body="props">
          <q-tr :props="props" :class="{ 'text-grey-6': props.row.situacao === 'inativo' }">
            <q-td key="cupom">
              <div class="text-weight-bold">{{ props.row.titulo }}</div>
              <q-badge color="pink-7" class="q-mr-xs">{{ props.row.codigo }}</q-badge>
              <q-badge outline color="grey-8">{{ props.row.rotulo }}</q-badge>
              <div v-if="props.row.descricao" class="text-grey-7 text-caption q-mt-xs">
                {{ props.row.descricao }}
              </div>
            </q-td>

            <q-td key="regras">
              <div>{{ regrasDoCupom(props.row) }}</div>
              <div class="text-grey-7">{{ rotuloDaValidade(props.row) }}</div>
              <div class="text-grey-7">
                {{ props.row.publico ? 'Resgatável pelo código' : 'Só entregue pela gestão' }}
              </div>
            </q-td>

            <q-td key="entrega">
              <div>
                <b>{{ props.row.concedidos }}</b> receberam
                <span v-if="props.row.limite_resgates" class="text-grey-7">
                  de {{ props.row.limite_resgates }}
                </span>
              </div>
              <div class="text-grey-7">
                {{ props.row.usados }} usados · {{ props.row.reservados }} em corrida
              </div>
              <div class="text-grey-7">Abateu {{ emReais(props.row.desconto_total) }}</div>
            </q-td>

            <q-td key="situacao" auto-width>
              <q-badge :color="corDaSituacao(props.row.situacao)">
                {{ props.row.situacao }}
              </q-badge>
            </q-td>

            <q-td key="acoes" align="center" auto-width>
              <template v-if="pode('configuracoes.gerenciar')">
                <q-btn
                  dense
                  flat
                  icon="card_giftcard"
                  aria-label="Entregar cupom"
                  :disable="!['vigente'].includes(props.row.situacao)"
                  @click="abrirEntrega(props.row)"
                >
                  <q-tooltip>Entregar na carteira</q-tooltip>
                </q-btn>
                <q-btn
                  dense
                  flat
                  icon="edit"
                  aria-label="Editar cupom"
                  @click="abrirFormulario(props.row)"
                >
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
                <q-btn
                  dense
                  flat
                  :icon="props.row.ativo ? 'toggle_on' : 'toggle_off'"
                  :color="props.row.ativo ? 'green' : 'grey'"
                  aria-label="Ligar ou desligar"
                  @click="alternarAtivo(props.row)"
                >
                  <q-tooltip>{{ props.row.ativo ? 'Desligar' : 'Ligar' }}</q-tooltip>
                </q-btn>
                <q-btn
                  dense
                  flat
                  icon="delete"
                  color="negative"
                  aria-label="Remover cupom"
                  @click="remover(props.row)"
                >
                  <q-tooltip>Remover</q-tooltip>
                </q-btn>
              </template>
            </q-td>
          </q-tr>
        </template>

        <template #no-data>
          <div class="full-width text-center text-grey-7 q-pa-lg">Nenhum cupom cadastrado.</div>
        </template>
      </q-table>
    </q-card>

    <!-- formulário -->
    <q-dialog v-model="formulario.aberto" persistent>
      <q-card style="width: 720px; max-width: 95vw">
        <q-form @submit.prevent="salvar">
          <q-card-section class="row items-center">
            <div class="text-h6">{{ formulario.id ? 'Editar cupom' : 'Novo cupom' }}</div>
            <q-space />
            <q-btn v-close-popup flat round dense icon="close" />
          </q-card-section>

          <q-card-section class="q-pt-none scroll" style="max-height: 70vh">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-5">
                <q-input
                  v-model="formulario.codigo"
                  outlined
                  dense
                  label="Código"
                  hint="Letras, números, - e _ (o passageiro digita)"
                  :disable="formulario.concedidos > 0"
                  :rules="[(v) => /^[A-Za-z0-9_-]{3,40}$/.test(v || '') || 'De 3 a 40 caracteres']"
                  @update:model-value="(v) => (formulario.codigo = (v || '').toUpperCase())"
                />
              </div>
              <div class="col-12 col-sm-7">
                <q-input
                  v-model="formulario.titulo"
                  outlined
                  dense
                  label="Título"
                  maxlength="80"
                  :rules="[(v) => !!v || 'Informe o título']"
                />
              </div>
              <div class="col-12">
                <q-input
                  v-model="formulario.descricao"
                  outlined
                  dense
                  label="Descrição (aparece no app)"
                  maxlength="255"
                />
              </div>
            </div>

            <div class="text-subtitle2 q-mt-md q-mb-sm">Desconto</div>
            <q-btn-toggle
              v-model="formulario.tipo"
              spread
              no-caps
              toggle-color="primary"
              class="q-mb-md"
              :options="[
                { label: 'Percentual (%)', value: 'percentual' },
                { label: 'Valor fixo (R$)', value: 'valor_fixo' },
              ]"
            />
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="formulario.valor"
                  type="number"
                  outlined
                  dense
                  step="0.01"
                  :prefix="formulario.tipo === 'valor_fixo' ? 'R$' : undefined"
                  :suffix="formulario.tipo === 'percentual' ? '%' : undefined"
                  label="Valor do desconto"
                  :rules="[regraDoValor]"
                />
              </div>
              <div class="col-6 col-sm-4">
                <q-input
                  v-model.number="formulario.desconto_maximo"
                  type="number"
                  outlined
                  dense
                  step="0.01"
                  prefix="R$"
                  :disable="formulario.tipo !== 'percentual'"
                  label="Desconto máximo"
                  hint="Teto do percentual (vazio = sem teto)"
                  clearable
                />
              </div>
              <div class="col-6 col-sm-4">
                <q-input
                  v-model.number="formulario.valor_minimo_corrida"
                  type="number"
                  outlined
                  dense
                  step="0.01"
                  prefix="R$"
                  label="Corrida mínima"
                  :rules="[(v) => v === '' || v === null || v >= 0 || 'Valor inválido']"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="formulario.metodos_pagamento"
                  outlined
                  dense
                  multiple
                  use-chips
                  emit-value
                  map-options
                  label="Formas de pagamento"
                  hint="Vazio = todas"
                  :options="metodosOpcoes"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="formulario.cidade_id"
                  outlined
                  dense
                  use-input
                  emit-value
                  map-options
                  clearable
                  label="Cidade"
                  hint="Vazio = todas"
                  :options="cidadesFiltradas"
                  option-value="id"
                  option-label="rotulo"
                  @filter="filtrarCidades"
                />
              </div>
            </div>

            <div class="text-subtitle2 q-mt-md q-mb-sm">Quando e quantos</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="formulario.inicio_em"
                  outlined
                  dense
                  type="datetime-local"
                  label="Começa em"
                  hint="Vazio = já vale"
                  clearable
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="formulario.expira_em"
                  outlined
                  dense
                  type="datetime-local"
                  label="Deixa de valer em"
                  hint="Vazio = sem data final"
                  clearable
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="formulario.validade_dias"
                  type="number"
                  outlined
                  dense
                  suffix="dias"
                  label="Validade depois de receber"
                  hint="Conta a partir de quando entra na carteira"
                  clearable
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="formulario.limite_resgates"
                  type="number"
                  outlined
                  dense
                  label="Limite de passageiros"
                  hint="Vazio = sem limite"
                  clearable
                />
              </div>
            </div>

            <div class="row q-mt-md">
              <q-toggle
                v-model="formulario.publico"
                label="Resgatável pelo código (aparece só para quem digitar)"
              />
            </div>
            <div class="row">
              <q-toggle v-model="formulario.ativo" label="Cupom ligado" />
            </div>

            <q-banner v-if="formulario.erro" rounded class="bg-red-1 text-negative q-mt-md">
              {{ formulario.erro }}
            </q-banner>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn v-close-popup flat label="Cancelar" />
            <q-btn type="submit" color="primary" label="Salvar" :loading="formulario.salvando" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- entrega na carteira -->
    <q-dialog v-model="entrega.aberto" persistent>
      <q-card style="width: 560px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6">Entregar {{ entrega.cupom?.codigo }}</div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="text-grey-7 q-mb-md">
            O cupom entra na carteira do passageiro e aparece no app dele. Quem já tem o cupom não
            recebe de novo.
          </div>

          <q-btn-toggle
            v-model="entrega.alvo"
            spread
            no-caps
            toggle-color="primary"
            class="q-mb-md"
            :options="[
              { label: 'Passageiros escolhidos', value: 'passageiros' },
              { label: 'Todos os ativos', value: 'todos' },
            ]"
          />

          <q-select
            v-if="entrega.alvo === 'passageiros'"
            v-model="entrega.passageiros"
            outlined
            dense
            multiple
            use-chips
            use-input
            input-debounce="300"
            label="Passageiros"
            hint="Pesquise por nome, CPF, e-mail ou telefone"
            :options="entrega.opcoes"
            option-label="rotulo"
            option-value="id"
            @filter="filtrarPassageiros"
          />
          <q-banner v-else rounded class="bg-orange-1">
            Todos os passageiros ativos vão receber o cupom
            <span v-if="entrega.cupom?.limite_resgates">
              (até o limite de {{ entrega.cupom.limite_resgates }})</span
            >. Isso não tem desfazer.
          </q-banner>

          <q-banner v-if="entrega.erro" rounded class="bg-red-1 text-negative q-mt-md">
            {{ entrega.erro }}
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn v-close-popup flat label="Cancelar" />
          <q-btn
            color="primary"
            icon="card_giftcard"
            label="Entregar"
            :loading="entrega.enviando"
            :disable="entrega.alvo === 'passageiros' && !entrega.passageiros.length"
            @click="entregar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'src/stores/auth'

const $q = useQuasar()
const { pode } = useAuthStore()

const emReais = (valor) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const METODOS = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'Pix' }
const metodosOpcoes = Object.entries(METODOS).map(([value, label]) => ({ value, label }))

const corDaSituacao = (situacao) =>
  ({
    vigente: 'green',
    agendado: 'blue',
    inativo: 'grey',
    expirado: 'red-5',
    esgotado: 'orange',
  })[situacao]

const dataCurta = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

const regrasDoCupom = (c) => {
  const partes = []
  if (c.valor_minimo_corrida > 0) partes.push(`A partir de ${emReais(c.valor_minimo_corrida)}`)
  if (c.tipo === 'percentual' && c.desconto_maximo) partes.push(`Até ${emReais(c.desconto_maximo)}`)
  if (c.metodos_pagamento?.length)
    partes.push(`Só ${c.metodos_pagamento.map((m) => METODOS[m] ?? m).join(' ou ')}`)
  if (c.cidade) partes.push(c.cidade)
  return partes.length ? partes.join(' · ') : 'Sem restrição'
}

const rotuloDaValidade = (c) => {
  const partes = []
  if (c.inicio_em) partes.push(`de ${dataCurta(c.inicio_em)}`)
  if (c.expira_em) partes.push(`até ${dataCurta(c.expira_em)}`)
  if (c.validade_dias) partes.push(`${c.validade_dias} dias na carteira`)
  return partes.length ? `Vale ${partes.join(' ')}` : 'Sem prazo'
}

const colunas = [
  { name: 'cupom', label: 'Cupom', align: 'left' },
  { name: 'regras', label: 'Regras', align: 'left' },
  { name: 'entrega', label: 'Entrega e uso', align: 'left' },
  { name: 'situacao', label: 'Situação', align: 'left' },
  { name: 'acoes', label: 'Ações', align: 'center' },
]

// ---- lista
const linhas = ref([])
const carregando = ref(false)
const busca = ref('')
const filtroSituacao = ref(null)

async function carregar() {
  carregando.value = true
  try {
    const { data } = await api.get('/cupons', {
      params: { situacao: filtroSituacao.value ?? undefined, search: busca.value || undefined },
    })
    linhas.value = data.data
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível carregar os cupons.' })
  } finally {
    carregando.value = false
  }
}

function limparBusca() {
  busca.value = ''
  carregar()
}

const mensagemDoErro = (e, padrao) => {
  const erros = e.response?.data?.errors
  return erros ? Object.values(erros).flat().join(' ') : (e.response?.data?.message ?? padrao)
}

// ---- cidades
const cidades = ref([])
const cidadesFiltradas = ref([])

async function garantirCidades() {
  if (cidades.value.length) return
  const { data } = await api.get('/tarifas/opcoes')
  cidades.value = data.cidades.map((c) => ({ id: c.id, rotulo: `${c.nome}/${c.uf}` }))
  cidadesFiltradas.value = cidades.value.slice(0, 50)
}

function filtrarCidades(texto, atualizar) {
  garantirCidades()
    .then(() =>
      atualizar(() => {
        const termo = texto.trim().toLowerCase()
        cidadesFiltradas.value = (
          termo
            ? cidades.value.filter((c) => c.rotulo.toLowerCase().includes(termo))
            : cidades.value
        ).slice(0, 50)
      }),
    )
    .catch(() => atualizar(() => (cidadesFiltradas.value = [])))
}

// ---- formulário
const regraDoValor = (v) =>
  (v !== '' && v !== null && v > 0 && (formulario.tipo === 'valor_fixo' || v <= 100)) ||
  'Informe o desconto (percentual até 100)'

// o campo datetime-local quer "AAAA-MM-DDTHH:mm" no horário local
const paraCampo = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const dois = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`
}

const vazio = () => ({
  aberto: false,
  id: null,
  concedidos: 0,
  codigo: '',
  titulo: '',
  descricao: '',
  tipo: 'percentual',
  valor: null,
  desconto_maximo: null,
  valor_minimo_corrida: 0,
  metodos_pagamento: [],
  cidade_id: null,
  publico: true,
  inicio_em: '',
  expira_em: '',
  validade_dias: 30,
  limite_resgates: null,
  ativo: true,
  salvando: false,
  erro: '',
})
const formulario = reactive(vazio())

async function abrirFormulario(cupom) {
  await garantirCidades()
  Object.assign(formulario, vazio())
  if (cupom) {
    Object.assign(formulario, {
      id: cupom.id,
      concedidos: cupom.concedidos,
      codigo: cupom.codigo,
      titulo: cupom.titulo,
      descricao: cupom.descricao ?? '',
      tipo: cupom.tipo,
      valor: cupom.valor,
      desconto_maximo: cupom.desconto_maximo,
      valor_minimo_corrida: cupom.valor_minimo_corrida,
      metodos_pagamento: cupom.metodos_pagamento ?? [],
      cidade_id: cupom.cidade_id,
      publico: cupom.publico,
      inicio_em: paraCampo(cupom.inicio_em),
      expira_em: paraCampo(cupom.expira_em),
      validade_dias: cupom.validade_dias,
      limite_resgates: cupom.limite_resgates,
      ativo: cupom.ativo,
    })
  }
  formulario.aberto = true
}

const corpoDoCupom = (origem) => ({
  codigo: origem.codigo,
  titulo: origem.titulo,
  descricao: origem.descricao || null,
  tipo: origem.tipo,
  valor: origem.valor,
  desconto_maximo: origem.tipo === 'percentual' ? origem.desconto_maximo || null : null,
  valor_minimo_corrida: origem.valor_minimo_corrida || 0,
  metodos_pagamento: origem.metodos_pagamento?.length ? origem.metodos_pagamento : null,
  cidade_id: origem.cidade_id || null,
  publico: origem.publico,
  inicio_em: origem.inicio_em || null,
  expira_em: origem.expira_em || null,
  validade_dias: origem.validade_dias || null,
  limite_resgates: origem.limite_resgates || null,
  ativo: origem.ativo,
})

async function salvar() {
  formulario.salvando = true
  formulario.erro = ''
  try {
    if (formulario.id) await api.put(`/cupons/${formulario.id}`, corpoDoCupom(formulario))
    else await api.post('/cupons', corpoDoCupom(formulario))
    $q.notify({ type: 'positive', message: 'Cupom salvo.' })
    formulario.aberto = false
    await carregar()
  } catch (e) {
    formulario.erro = mensagemDoErro(e, 'Não foi possível salvar o cupom.')
  } finally {
    formulario.salvando = false
  }
}

async function alternarAtivo(cupom) {
  try {
    await api.put(
      `/cupons/${cupom.id}`,
      corpoDoCupom({
        ...cupom,
        inicio_em: cupom.inicio_em ? paraCampo(cupom.inicio_em) : '',
        expira_em: cupom.expira_em ? paraCampo(cupom.expira_em) : '',
        ativo: !cupom.ativo,
      }),
    )
    await carregar()
  } catch (e) {
    $q.notify({ type: 'negative', message: mensagemDoErro(e, 'Não foi possível alterar o cupom.') })
  }
}

function remover(cupom) {
  $q.dialog({
    title: 'Remover cupom',
    message: `Remover o cupom ${cupom.codigo}? Só dá para remover cupom que ninguém recebeu; os demais podem ser desligados.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Remover', color: 'negative' },
  }).onOk(async () => {
    try {
      await api.delete(`/cupons/${cupom.id}`)
      $q.notify({ type: 'positive', message: 'Cupom removido.' })
      await carregar()
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: mensagemDoErro(e, 'Não foi possível remover o cupom.'),
      })
    }
  })
}

// ---- entrega na carteira
const entrega = reactive({
  aberto: false,
  cupom: null,
  alvo: 'passageiros',
  passageiros: [],
  opcoes: [],
  enviando: false,
  erro: '',
})

function abrirEntrega(cupom) {
  Object.assign(entrega, {
    aberto: true,
    cupom,
    alvo: 'passageiros',
    passageiros: [],
    opcoes: [],
    enviando: false,
    erro: '',
  })
}

function filtrarPassageiros(texto, atualizar) {
  api
    .get('/passageiros', { params: { search: texto, rowsPerPage: 10 } })
    .then(({ data }) =>
      atualizar(() => {
        entrega.opcoes = data.data.map((p) => ({
          id: p.id,
          rotulo: `#${p.id} ${p.name ?? ''} ${p.email ? `· ${p.email}` : ''}`.trim(),
        }))
      }),
    )
    .catch(() => atualizar(() => (entrega.opcoes = [])))
}

async function entregar() {
  entrega.enviando = true
  entrega.erro = ''
  try {
    const { data } = await api.post(`/cupons/${entrega.cupom.id}/conceder`, {
      alvo: entrega.alvo,
      passageiro_ids:
        entrega.alvo === 'passageiros' ? entrega.passageiros.map((p) => p.id) : undefined,
    })
    $q.notify({ type: data.concedidos ? 'positive' : 'info', message: data.message })
    entrega.aberto = false
    await carregar()
  } catch (e) {
    entrega.erro = mensagemDoErro(e, 'Não foi possível entregar o cupom.')
  } finally {
    entrega.enviando = false
  }
}

onMounted(carregar)
</script>
