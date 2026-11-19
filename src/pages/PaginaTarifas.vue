<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar rounded size="52px" color="green-1" text-color="green-8" icon="attach_money" />
        <div class="col">
          <div class="text-caption text-grey-7">Configurações</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Tarifas</h1>
          <div class="text-grey-7 q-mt-xs">
            Cada tarifa vale para uma cidade, um estado ou o país todo. Ao cobrar uma corrida, a da
            <b>cidade</b> vence a do <b>estado</b>, que vence a <b>geral</b>. O preço é a tarifa
            base + distância + tempo; o preço dinâmico entra por cima, e a taxa de regulação é
            somada ao que o passageiro paga.
          </div>
        </div>
        <q-btn
          outline
          color="primary"
          icon="calculate"
          label="Simular preço"
          @click="abrirSimulador"
        />
        <q-btn
          v-if="pode('configuracoes.gerenciar')"
          color="primary"
          icon="add"
          label="Nova tarifa"
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
            v-model="filtroEscopo"
            class="q-mr-md"
            toggle-color="primary"
            no-caps
            :options="[
              { label: 'Todas', value: null },
              { label: 'Cidade', value: 'cidade' },
              { label: 'Estado', value: 'estado' },
              { label: 'Geral', value: 'geral' },
            ]"
            @update:model-value="carregar"
          />
          <q-space />
          <q-input
            v-model="busca"
            filled
            dense
            debounce="300"
            placeholder="Pesquisar categoria ou local"
            @update:model-value="carregar"
          >
            <template v-if="busca" #append>
              <q-icon name="close" class="cursor-pointer" @click="limparBusca" />
            </template>
          </q-input>
        </template>

        <template #body="props">
          <q-tr :props="props" :class="{ 'text-grey-6': !props.row.ativo }">
            <q-td key="produto">
              <div class="text-weight-bold">{{ props.row.produto.nome }}</div>
              <q-badge :color="corDoEscopo(props.row.escopo)" class="q-mt-xs">
                {{ props.row.escopo_rotulo }}
              </q-badge>
            </q-td>

            <q-td key="valores">
              <div>Base {{ emReais(props.row.tarifa_base) }}</div>
              <div class="text-grey-7">
                {{ emReais(props.row.valor_por_km) }}/km ·
                {{ emReais(props.row.valor_por_minuto) }}/min
              </div>
              <div class="text-grey-7">Mínimo {{ emReais(props.row.valor_minimo_corrida) }}</div>
            </q-td>

            <q-td key="taxas">
              <div>Plataforma {{ numero(props.row.taxa_plataforma_percentual) }}%</div>
              <div class="text-grey-7">{{ rotuloRegulacao(props.row) }}</div>
            </q-td>

            <q-td key="quando">
              <div>{{ rotuloHorario(props.row) }}</div>
              <div class="text-grey-7">{{ rotuloDias(props.row.dias_semana) }}</div>
            </q-td>

            <q-td key="ativo" auto-width>
              <q-badge :color="props.row.ativo ? 'green' : 'grey'">
                {{ props.row.ativo ? 'ativa' : 'inativa' }}
              </q-badge>
            </q-td>

            <q-td key="acoes" align="center" auto-width>
              <template v-if="pode('configuracoes.gerenciar')">
                <q-btn
                  dense
                  flat
                  icon="edit"
                  aria-label="Editar tarifa"
                  @click="abrirFormulario(props.row)"
                >
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
                <q-btn
                  dense
                  flat
                  icon="delete"
                  color="negative"
                  aria-label="Remover tarifa"
                  @click="remover(props.row)"
                >
                  <q-tooltip>Remover</q-tooltip>
                </q-btn>
              </template>
            </q-td>
          </q-tr>
        </template>

        <template #no-data>
          <div class="full-width text-center text-grey-7 q-pa-lg">Nenhuma tarifa cadastrada.</div>
        </template>
      </q-table>
    </q-card>

    <!-- formulário -->
    <q-dialog v-model="formulario.aberto" persistent>
      <q-card style="width: 760px; max-width: 95vw">
        <q-form @submit.prevent="salvar">
          <q-card-section class="row items-center">
            <div class="text-h6">{{ formulario.id ? 'Editar tarifa' : 'Nova tarifa' }}</div>
            <q-space />
            <q-btn v-close-popup flat round dense icon="close" />
          </q-card-section>

          <q-card-section class="q-pt-none scroll" style="max-height: 70vh">
            <div class="text-subtitle2 q-mb-sm">Onde vale</div>
            <q-btn-toggle
              v-model="formulario.escopo"
              spread
              no-caps
              toggle-color="primary"
              class="q-mb-md"
              :options="[
                { label: 'Cidade', value: 'cidade' },
                { label: 'Estado', value: 'estado' },
                { label: 'Geral', value: 'geral' },
              ]"
            />
            <q-select
              v-if="formulario.escopo === 'cidade'"
              v-model="formulario.cidade_id"
              outlined
              dense
              use-input
              emit-value
              map-options
              label="Cidade"
              :options="cidadesFiltradas"
              option-value="id"
              option-label="rotulo"
              :rules="[(v) => !!v || 'Escolha a cidade']"
              @filter="filtrarCidades"
            />
            <q-select
              v-if="formulario.escopo === 'estado'"
              v-model="formulario.estado_id"
              outlined
              dense
              emit-value
              map-options
              label="Estado"
              :options="estadosOpcoes"
              option-value="id"
              option-label="rotulo"
              :rules="[(v) => !!v || 'Escolha o estado']"
            />
            <div v-if="formulario.escopo === 'geral'" class="text-grey-7 q-mb-sm">
              Vale em todo lugar que não tem tarifa de estado nem de cidade.
            </div>

            <q-select
              v-model="formulario.produto_id"
              outlined
              dense
              emit-value
              map-options
              label="Categoria"
              class="q-mt-sm"
              :options="produtosOpcoes"
              option-value="id"
              option-label="nome"
              :rules="[(v) => !!v || 'Escolha a categoria']"
            />

            <div class="text-subtitle2 q-mt-md q-mb-sm">Preço da corrida</div>
            <div class="row q-col-gutter-md">
              <div v-for="c in camposDeValor" :key="c.chave" class="col-6 col-sm-4">
                <q-input
                  v-model.number="formulario[c.chave]"
                  type="number"
                  outlined
                  dense
                  step="0.01"
                  prefix="R$"
                  :label="c.rotulo"
                  :rules="[regraDeValor]"
                />
              </div>
            </div>

            <div class="text-subtitle2 q-mt-md q-mb-sm">Taxas</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="formulario.taxa_plataforma_percentual"
                  type="number"
                  outlined
                  dense
                  step="0.1"
                  suffix="%"
                  label="Taxa da plataforma"
                  hint="Descontada do motorista"
                  :rules="[(v) => (v >= 0 && v <= 95) || 'De 0 a 95']"
                />
              </div>
              <div class="col-6 col-sm-4">
                <q-select
                  v-model="formulario.regulacao_tipo"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  label="Taxa de regulação"
                  hint="Somada ao passageiro"
                  :options="[
                    { label: 'Percentual (%)', value: 'percentual' },
                    { label: 'Valor fixo (R$)', value: 'valor_fixo' },
                  ]"
                />
              </div>
              <div class="col-6 col-sm-4">
                <q-input
                  v-model.number="formulario.regulacao_valor"
                  type="number"
                  outlined
                  dense
                  step="0.01"
                  :disable="!formulario.regulacao_tipo"
                  :prefix="formulario.regulacao_tipo === 'valor_fixo' ? 'R$' : undefined"
                  :suffix="formulario.regulacao_tipo === 'percentual' ? '%' : undefined"
                  label="Valor da regulação"
                  :rules="[regraDeRegulacao]"
                />
              </div>
            </div>

            <div class="text-subtitle2 q-mt-md q-mb-sm">Quando vale</div>
            <div class="row q-col-gutter-md">
              <div class="col-6 col-sm-3">
                <q-input
                  v-model="formulario.horario_inicio"
                  outlined
                  dense
                  type="time"
                  label="Das"
                />
              </div>
              <div class="col-6 col-sm-3">
                <q-input v-model="formulario.horario_fim" outlined dense type="time" label="Às" />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="formulario.dias_semana"
                  outlined
                  dense
                  multiple
                  use-chips
                  emit-value
                  map-options
                  label="Dias da semana"
                  hint="Vazio = todos os dias"
                  :options="diasOpcoes"
                />
              </div>
            </div>
            <div class="text-caption text-grey-7 q-mt-xs">
              Sem horário, vale o dia todo. Se o fim for antes do início (ex.: 22:00 às 06:00), a
              tarifa atravessa a meia-noite.
            </div>

            <div class="row q-col-gutter-md q-mt-sm">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="formulario.raio_busca_motorista_km"
                  type="number"
                  outlined
                  dense
                  step="0.1"
                  suffix="km"
                  label="Raio de busca do motorista"
                  :rules="[(v) => v > 0 || 'Informe o raio']"
                />
              </div>
              <div class="col-12 col-sm-6 flex items-center">
                <q-toggle v-model="formulario.ativo" label="Tarifa ativa" />
              </div>
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

    <!-- simulador de preço -->
    <q-dialog v-model="simulador.aberto">
      <q-card style="width: 560px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6">Simular preço de uma corrida</div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="text-grey-7 q-mb-md">
            Usa a tarifa que valeria agora para a cidade e a categoria, na hierarquia cidade, estado
            e geral.
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-select
                v-model="simulador.cidade_id"
                outlined
                dense
                use-input
                emit-value
                map-options
                clearable
                label="Cidade"
                :options="cidadesFiltradas"
                option-value="id"
                option-label="rotulo"
                @filter="filtrarCidades"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="simulador.produto_id"
                outlined
                dense
                emit-value
                map-options
                label="Categoria"
                :options="produtosOpcoes"
                option-value="id"
                option-label="nome"
              />
            </div>
            <div class="col-4">
              <q-input
                v-model.number="simulador.distancia_km"
                type="number"
                outlined
                dense
                suffix="km"
                label="Distância"
              />
            </div>
            <div class="col-4">
              <q-input
                v-model.number="simulador.tempo_min"
                type="number"
                outlined
                dense
                suffix="min"
                label="Tempo"
              />
            </div>
            <div class="col-4">
              <q-input
                v-model.number="simulador.multiplicador"
                type="number"
                outlined
                dense
                step="0.1"
                suffix="x"
                label="Dinâmico"
                hint="1 = sem dinâmico"
              />
            </div>
          </div>

          <q-btn
            class="q-mt-md"
            color="primary"
            icon="calculate"
            label="Calcular"
            :loading="simulador.calculando"
            :disable="!simulador.produto_id"
            @click="simular"
          />

          <q-banner v-if="simulador.erro" rounded class="bg-red-1 text-negative q-mt-md">
            {{ simulador.erro }}
          </q-banner>

          <q-markup-table v-if="simulador.resultado" flat dense bordered class="q-mt-md">
            <tbody>
              <tr>
                <td>Tarifa usada</td>
                <td class="text-right">
                  <q-badge :color="corDoEscopo(simulador.resultado.escopo)">
                    {{ rotuloDoEscopo(simulador.resultado.escopo) }}
                  </q-badge>
                </td>
              </tr>
              <tr>
                <td>Tarifa base</td>
                <td class="text-right">
                  {{ emReais(simulador.resultado.composicao.tarifa_base) }}
                </td>
              </tr>
              <tr>
                <td>Distância</td>
                <td class="text-right">
                  {{ emReais(simulador.resultado.composicao.valor_distancia) }}
                </td>
              </tr>
              <tr>
                <td>Tempo</td>
                <td class="text-right">
                  {{ emReais(simulador.resultado.composicao.valor_tempo) }}
                </td>
              </tr>
              <tr v-if="simulador.resultado.composicao.aplicou_minimo">
                <td colspan="2" class="text-grey-7">Valor mínimo da corrida aplicado</td>
              </tr>
              <tr>
                <td>Preço dinâmico</td>
                <td class="text-right">
                  {{ emReais(simulador.resultado.composicao.valor_dinamico) }}
                </td>
              </tr>
              <tr>
                <td>Motorista recebe</td>
                <td class="text-right">
                  {{ emReais(simulador.resultado.valores.valor_motorista) }}
                </td>
              </tr>
              <tr>
                <td>Taxa da plataforma</td>
                <td class="text-right">
                  {{ emReais(simulador.resultado.valores.taxa_plataforma) }}
                </td>
              </tr>
              <tr>
                <td>Taxa de regulação</td>
                <td class="text-right">
                  {{ emReais(simulador.resultado.valores.taxa_regulacao) }}
                </td>
              </tr>
              <tr class="text-weight-bold">
                <td>Passageiro paga</td>
                <td class="text-right">
                  {{ emReais(simulador.resultado.valores.valor_passageiro) }}
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'src/stores/auth'

const $q = useQuasar()
const { pode } = useAuthStore()

const emReais = (valor) =>
  valor === null || valor === undefined || valor === ''
    ? '—'
    : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const numero = (valor) => Number(valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })

const DIAS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' },
]
const diasOpcoes = DIAS

const rotuloDias = (dias) =>
  !dias?.length || dias.length === 7
    ? 'Todos os dias'
    : DIAS.filter((d) => dias.includes(d.value))
        .map((d) => d.label)
        .join(', ')

const rotuloHorario = (t) =>
  t.horario_inicio && t.horario_fim
    ? `${t.horario_inicio.slice(0, 5)} às ${t.horario_fim.slice(0, 5)}${t.vira_dia ? ' (vira o dia)' : ''}`
    : 'O dia todo'

const rotuloRegulacao = (t) => {
  if (!t.regulacao_tipo) return 'Sem regulação'
  return t.regulacao_tipo === 'percentual'
    ? `Regulação ${numero(t.regulacao_valor)}%`
    : `Regulação ${emReais(t.regulacao_valor)}`
}

const corDoEscopo = (escopo) => ({ cidade: 'deep-purple', estado: 'blue', geral: 'grey-7' })[escopo]
const rotuloDoEscopo = (escopo) =>
  ({ cidade: 'Da cidade', estado: 'Do estado', geral: 'Geral' })[escopo]

const colunas = [
  { name: 'produto', label: 'Categoria / escopo', align: 'left' },
  { name: 'valores', label: 'Valores', align: 'left' },
  { name: 'taxas', label: 'Taxas', align: 'left' },
  { name: 'quando', label: 'Quando vale', align: 'left' },
  { name: 'ativo', label: 'Status', align: 'left' },
  { name: 'acoes', label: 'Ações', align: 'center' },
]

// ---- lista
const linhas = ref([])
const carregando = ref(false)
const busca = ref('')
const filtroEscopo = ref(null)

async function carregar() {
  carregando.value = true
  try {
    const { data } = await api.get('/tarifas', {
      params: { escopo: filtroEscopo.value ?? undefined, search: busca.value || undefined },
    })
    linhas.value = data.data
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível carregar as tarifas.' })
  } finally {
    carregando.value = false
  }
}

function limparBusca() {
  busca.value = ''
  carregar()
}

// ---- opções (estados, cidades, categorias)
const opcoes = reactive({ estados: [], cidades: [], produtos: [] })
const cidadesFiltradas = ref([])
const estadosOpcoes = computed(() =>
  opcoes.estados.map((e) => ({ id: e.id, rotulo: `${e.nome} (${e.sigla})` })),
)
const produtosOpcoes = computed(() => opcoes.produtos)
const todasAsCidades = computed(() =>
  opcoes.cidades.map((c) => ({ id: c.id, rotulo: `${c.nome}/${c.uf}` })),
)

async function garantirOpcoes() {
  if (opcoes.produtos.length) return
  const { data } = await api.get('/tarifas/opcoes')
  Object.assign(opcoes, data)
  cidadesFiltradas.value = todasAsCidades.value.slice(0, 50)
}

function filtrarCidades(texto, atualizar) {
  garantirOpcoes()
    .then(() =>
      atualizar(() => {
        const termo = texto.trim().toLowerCase()
        cidadesFiltradas.value = (
          termo
            ? todasAsCidades.value.filter((c) => c.rotulo.toLowerCase().includes(termo))
            : todasAsCidades.value
        ).slice(0, 50)
      }),
    )
    .catch(() => atualizar(() => (cidadesFiltradas.value = [])))
}

// ---- formulário
const camposDeValor = [
  { chave: 'tarifa_base', rotulo: 'Tarifa base' },
  { chave: 'valor_por_km', rotulo: 'Valor por km' },
  { chave: 'valor_por_minuto', rotulo: 'Valor por minuto' },
  { chave: 'valor_por_minuto_espera', rotulo: 'Minuto de espera' },
  { chave: 'valor_minimo_corrida', rotulo: 'Valor mínimo' },
]

const regraDeValor = (v) => (v !== '' && v !== null && v >= 0) || 'Informe um valor'
const regraDeRegulacao = (v) =>
  !formulario.regulacao_tipo ||
  (v !== '' && v !== null && v >= 0 && (formulario.regulacao_tipo === 'valor_fixo' || v <= 100)) ||
  'Informe o valor (percentual até 100)'

const vazio = () => ({
  aberto: false,
  id: null,
  escopo: 'geral',
  cidade_id: null,
  estado_id: null,
  produto_id: null,
  tarifa_base: 0,
  valor_por_km: 0,
  valor_por_minuto: 0,
  valor_por_minuto_espera: 0,
  valor_minimo_corrida: 0,
  taxa_plataforma_percentual: 0,
  regulacao_tipo: null,
  regulacao_valor: null,
  horario_inicio: '',
  horario_fim: '',
  dias_semana: [],
  raio_busca_motorista_km: 5,
  ativo: true,
  salvando: false,
  erro: '',
})
const formulario = reactive(vazio())

async function abrirFormulario(tarifa) {
  await garantirOpcoes()
  Object.assign(formulario, vazio())
  if (tarifa) {
    Object.assign(formulario, {
      id: tarifa.id,
      escopo: tarifa.escopo,
      cidade_id: tarifa.cidade_id,
      estado_id: tarifa.estado_id,
      produto_id: tarifa.produto_id,
      tarifa_base: Number(tarifa.tarifa_base),
      valor_por_km: Number(tarifa.valor_por_km),
      valor_por_minuto: Number(tarifa.valor_por_minuto),
      valor_por_minuto_espera: Number(tarifa.valor_por_minuto_espera),
      valor_minimo_corrida: Number(tarifa.valor_minimo_corrida),
      taxa_plataforma_percentual: Number(tarifa.taxa_plataforma_percentual),
      regulacao_tipo: tarifa.regulacao_tipo,
      regulacao_valor: tarifa.regulacao_valor === null ? null : Number(tarifa.regulacao_valor),
      horario_inicio: tarifa.horario_inicio?.slice(0, 5) ?? '',
      horario_fim: tarifa.horario_fim?.slice(0, 5) ?? '',
      dias_semana: tarifa.dias_semana,
      raio_busca_motorista_km: Number(tarifa.raio_busca_motorista_km),
      ativo: tarifa.ativo,
    })
  }
  formulario.aberto = true
}

async function salvar() {
  formulario.salvando = true
  formulario.erro = ''

  const corpo = {
    produto_id: formulario.produto_id,
    cidade_id: formulario.escopo === 'cidade' ? formulario.cidade_id : null,
    estado_id: formulario.escopo === 'estado' ? formulario.estado_id : null,
    tarifa_base: formulario.tarifa_base,
    valor_por_km: formulario.valor_por_km,
    valor_por_minuto: formulario.valor_por_minuto,
    valor_por_minuto_espera: formulario.valor_por_minuto_espera,
    valor_minimo_corrida: formulario.valor_minimo_corrida,
    taxa_plataforma_percentual: formulario.taxa_plataforma_percentual,
    regulacao_tipo: formulario.regulacao_tipo || null,
    regulacao_valor: formulario.regulacao_tipo ? formulario.regulacao_valor : null,
    horario_inicio: formulario.horario_inicio || null,
    horario_fim: formulario.horario_fim || null,
    dias_semana: formulario.dias_semana,
    raio_busca_motorista_km: formulario.raio_busca_motorista_km,
    ativo: formulario.ativo,
  }

  try {
    if (formulario.id) await api.put(`/tarifas/${formulario.id}`, corpo)
    else await api.post('/tarifas', corpo)
    $q.notify({ type: 'positive', message: 'Tarifa salva.' })
    formulario.aberto = false
    await carregar()
  } catch (e) {
    const erros = e.response?.data?.errors
    formulario.erro = erros
      ? Object.values(erros).flat().join(' ')
      : (e.response?.data?.message ?? 'Não foi possível salvar a tarifa.')
  } finally {
    formulario.salvando = false
  }
}

function remover(tarifa) {
  $q.dialog({
    title: 'Remover tarifa',
    message: `Remover a tarifa de ${tarifa.produto.nome} (${tarifa.escopo_rotulo})? As corridas já feitas não mudam.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Remover', color: 'negative' },
  }).onOk(async () => {
    try {
      await api.delete(`/tarifas/${tarifa.id}`)
      $q.notify({ type: 'positive', message: 'Tarifa removida.' })
      await carregar()
    } catch {
      $q.notify({ type: 'negative', message: 'Não foi possível remover a tarifa.' })
    }
  })
}

// ---- simulador de preço
const simulador = reactive({
  aberto: false,
  cidade_id: null,
  produto_id: null,
  distancia_km: 5,
  tempo_min: 12,
  multiplicador: 1,
  calculando: false,
  resultado: null,
  erro: '',
})

async function abrirSimulador() {
  await garantirOpcoes()
  simulador.aberto = true
}

async function simular() {
  simulador.calculando = true
  simulador.erro = ''
  simulador.resultado = null
  try {
    const { data } = await api.post('/tarifas/simular', {
      produto_id: simulador.produto_id,
      cidade_id: simulador.cidade_id,
      distancia_km: simulador.distancia_km,
      tempo_min: simulador.tempo_min,
      multiplicador: simulador.multiplicador > 1 ? simulador.multiplicador : undefined,
    })
    simulador.resultado = data
  } catch (e) {
    simulador.erro = e.response?.data?.message ?? 'Não foi possível calcular.'
  } finally {
    simulador.calculando = false
  }
}

onMounted(carregar)
</script>
