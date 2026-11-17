<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="cabecalho q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar
          rounded
          size="52px"
          color="orange-1"
          text-color="deep-orange"
          icon="local_fire_department"
        />
        <div class="col">
          <div class="text-caption text-grey-7">Configurações</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Preço dinâmico</h1>
          <div class="text-grey-7 q-mt-xs">
            Onde há mais pedidos do que motoristas livres, a região esquenta no mapa do motorista e
            a corrida pedida ali custa mais. A regra é por cidade: cada uma liga, escolhe o modo de
            cobrança e os limites.
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div v-if="carregando" class="text-center q-pa-xl" role="status">
      <q-spinner color="primary" size="36px" />
      <div class="q-mt-sm">Carregando...</div>
    </div>
    <q-banner v-else-if="erro" rounded class="bg-red-1 text-negative">
      {{ erro }}
      <template #action><q-btn flat label="Tentar novamente" @click="carregar" /></template>
    </q-banner>

    <div v-else class="row q-col-gutter-lg">
      <div class="col-12 col-lg-8">
        <q-card flat bordered class="cartao">
          <q-card-section class="row items-center">
            <div class="col text-h6 text-weight-bold">Cidades</div>
            <q-btn
              color="primary"
              no-caps
              icon="add_location_alt"
              label="Adicionar cidade"
              @click="abrirFormulario()"
            />
          </q-card-section>
          <q-table
            flat
            :rows="cidades"
            :columns="colunas"
            row-key="cidade_id"
            hide-pagination
            :rows-per-page-options="[0]"
            no-data-label="Nenhuma cidade configurada. Adicione a primeira."
          >
            <template #body-cell-ativo="props">
              <q-td :props="props">
                <q-toggle
                  :model-value="props.row.ativo"
                  :disable="salvando"
                  @update:model-value="(valor) => alternar(props.row, valor)"
                />
              </q-td>
            </template>
            <template #body-cell-modo="props">
              <q-td :props="props">{{ rotuloDoModo(props.row.modo) }}</q-td>
            </template>
            <template #body-cell-regioes="props">
              <q-td :props="props">
                <q-badge
                  :color="props.row.regioes_ativas > 0 ? 'deep-orange' : 'grey-5'"
                  :label="props.row.regioes_ativas"
                />
              </q-td>
            </template>
            <template #body-cell-acoes="props">
              <q-td :props="props" class="text-right">
                <q-btn
                  flat
                  dense
                  no-caps
                  icon="hexagon"
                  label="Regiões"
                  @click="abrirRegioes(props.row)"
                />
                <q-btn flat dense round icon="edit" @click="abrirFormulario(props.row)">
                  <q-tooltip>Editar regras</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>

        <q-card v-if="selecionada" flat bordered class="cartao q-mt-lg">
          <q-card-section class="row items-center q-gutter-sm">
            <div class="col">
              <div class="text-h6 text-weight-bold">
                Regiões quentes: {{ selecionada.nome }}/{{ selecionada.uf }}
              </div>
              <div class="text-caption text-grey-7">
                Hexágonos esquentados agora. As calculadas pela demanda se refazem a cada minuto.
              </div>
            </div>
            <q-btn
              flat
              no-caps
              icon="refresh"
              label="Recalcular"
              :loading="recalculando"
              @click="recalcular"
            />
            <q-btn
              color="deep-orange"
              no-caps
              icon="add"
              label="Forçar região"
              @click="abrirForcar"
            />
          </q-card-section>
          <q-table
            flat
            :rows="regioes"
            :columns="colunasRegioes"
            row-key="id"
            :loading="carregandoRegioes"
            hide-pagination
            :rows-per-page-options="[0]"
            no-data-label="Nenhuma região quente agora."
          >
            <template #body-cell-rotulo="props">
              <q-td :props="props">
                <q-badge
                  :style="{ background: corDaIntensidade(props.row.intensidade) }"
                  class="text-weight-bold"
                >
                  {{ props.row.rotulo }}
                </q-badge>
              </q-td>
            </template>
            <template #body-cell-origem="props">
              <q-td :props="props">
                <q-chip
                  dense
                  :color="props.row.manual ? 'blue-1' : 'grey-3'"
                  :text-color="props.row.manual ? 'primary' : 'grey-8'"
                >
                  {{ props.row.manual ? 'Forçada' : 'Calculada' }}
                </q-chip>
              </q-td>
            </template>
            <template #body-cell-expira="props">
              <q-td :props="props">{{
                props.row.expira_em ? hora(props.row.expira_em) : 'Sem prazo'
              }}</q-td>
            </template>
            <template #body-cell-acoes="props">
              <q-td :props="props" class="text-right">
                <q-btn
                  flat
                  dense
                  round
                  color="negative"
                  icon="delete"
                  @click="removerRegiao(props.row)"
                >
                  <q-tooltip>Remover</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>

      <div class="col-12 col-lg-4">
        <q-card flat bordered class="cartao q-mb-lg">
          <q-card-section>
            <div class="text-h6 text-weight-bold q-mb-xs">Grade de regiões</div>
            <div class="text-grey-7 q-mb-md">
              O mapa é dividido em hexágonos. Quanto menor o hexágono, mais fina a região. Mudar o
              tamanho apaga as regiões atuais, que são refeitas em seguida.
            </div>
            <q-input
              v-model.number="tamanho"
              type="number"
              outlined
              label="Raio do hexágono"
              suffix="m"
              min="300"
              max="5000"
              step="100"
              :rules="[(v) => (v >= 300 && v <= 5000) || 'De 300 a 5000 m']"
            />
            <q-btn
              color="primary"
              no-caps
              label="Salvar tamanho"
              :loading="salvandoTamanho"
              :disable="tamanho === tamanhoSalvo || !(tamanho >= 300 && tamanho <= 5000)"
              @click="salvarTamanho"
            />
          </q-card-section>
        </q-card>

        <q-card flat bordered class="cartao">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Como funciona</div>
            <ul class="text-grey-7 q-pl-md q-mb-none">
              <li>
                Todo minuto contamos os pedidos sem motorista (janela configurável) e os motoristas
                livres em cada hexágono e nos vizinhos.
              </li>
              <li>
                Acima da <b>razão mínima</b> (pedidos por motorista livre) a região esquenta; na
                <b>razão máxima</b> chega ao teto.
              </li>
              <li>
                <b>Multiplicador</b>: a corrida custa 1,5x, por exemplo. <b>Valor fixo</b>: soma R$
                2,25 à corrida. O teto de cada modo é seu.
              </li>
              <li>
                O preço vale pela origem da corrida e fica fixo depois de pedida, mesmo que a região
                esfrie.
              </li>
              <li>
                A taxa da plataforma continua a mesma: ela incide sobre o valor já com a dinâmica.
              </li>
              <li>
                O motorista só vê o mapa quente da própria cidade, e só com a cidade ligada aqui.
              </li>
            </ul>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="formulario.aberto" persistent>
      <q-card style="width: 640px; max-width: 95vw">
        <q-form @submit.prevent="salvarCidade">
          <q-card-section class="text-h6">
            {{ formulario.cidade_id && jaConfigurada ? 'Editar regras' : 'Adicionar cidade' }}
          </q-card-section>
          <q-card-section class="q-gutter-md">
            <q-select
              v-model="formulario.cidade"
              :options="opcoesDeCidade"
              option-label="rotulo"
              option-value="id"
              label="Cidade"
              outlined
              use-input
              input-debounce="150"
              :disable="jaConfigurada"
              :rules="[(v) => !!v || 'Escolha a cidade']"
              @filter="filtrarCidades"
            >
              <template #no-option
                ><q-item
                  ><q-item-section>Nenhuma cidade encontrada</q-item-section></q-item
                ></template
              >
            </q-select>

            <q-toggle v-model="formulario.ativo" label="Preço dinâmico ligado nesta cidade" />

            <div>
              <div class="text-subtitle2 q-mb-xs">Como cobrar</div>
              <q-btn-toggle
                v-model="formulario.modo"
                no-caps
                unelevated
                toggle-color="primary"
                :options="[
                  { label: 'Multiplicador (1,5x)', value: 'multiplicador' },
                  { label: 'Valor fixo (+R$)', value: 'valor_fixo' },
                ]"
              />
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="formulario.multiplicador_maximo"
                  type="number"
                  outlined
                  label="Multiplicador máximo"
                  suffix="x"
                  step="0.1"
                  hint="Teto no modo multiplicador"
                  :rules="[intervalo(1.1, 10)]"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="formulario.valor_maximo"
                  type="number"
                  outlined
                  label="Valor adicional máximo"
                  prefix="R$"
                  step="0.5"
                  hint="Teto no modo valor fixo"
                  :rules="[intervalo(0.5, 500)]"
                />
              </div>
            </div>

            <div class="text-subtitle2">Área atendida</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="formulario.centro_latitude"
                  type="number"
                  outlined
                  label="Latitude do centro"
                  step="any"
                  :rules="[intervalo(-90, 90, true)]"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="formulario.centro_longitude"
                  type="number"
                  outlined
                  label="Longitude do centro"
                  step="any"
                  :rules="[intervalo(-180, 180, true)]"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="formulario.raio_km"
                  type="number"
                  outlined
                  label="Raio"
                  suffix="km"
                  :rules="[intervalo(1, 200)]"
                />
              </div>
            </div>
            <div class="text-caption text-grey-7" style="margin-top: -8px">
              Só pedidos e motoristas dentro deste raio contam. O centro é obrigatório para ligar.
            </div>

            <div class="text-subtitle2">Quando esquenta</div>
            <div class="row q-col-gutter-md">
              <div class="col-6 col-sm-3">
                <q-input
                  v-model.number="formulario.razao_minima"
                  type="number"
                  outlined
                  label="Razão mínima"
                  step="0.1"
                  :rules="[intervalo(0.5, 20)]"
                />
              </div>
              <div class="col-6 col-sm-3">
                <q-input
                  v-model.number="formulario.razao_maxima"
                  type="number"
                  outlined
                  label="Razão máxima"
                  step="0.1"
                  :rules="[intervalo(0.6, 50), maiorQueMinima]"
                />
              </div>
              <div class="col-6 col-sm-3">
                <q-input
                  v-model.number="formulario.pedidos_minimos"
                  type="number"
                  outlined
                  label="Pedidos mín."
                  :rules="[intervalo(1, 200)]"
                />
              </div>
              <div class="col-6 col-sm-3">
                <q-input
                  v-model.number="formulario.janela_minutos"
                  type="number"
                  outlined
                  label="Janela"
                  suffix="min"
                  :rules="[intervalo(1, 120)]"
                />
              </div>
            </div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="formulario.validade_minutos"
                  type="number"
                  outlined
                  label="Validade da região"
                  suffix="min"
                  hint="Quanto tempo a região fica quente sem novo cálculo"
                  :rules="[intervalo(1, 120)]"
                />
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              flat
              no-caps
              label="Cancelar"
              :disable="salvando"
              @click="formulario.aberto = false"
            />
            <q-btn type="submit" color="primary" no-caps label="Salvar" :loading="salvando" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="forcar.aberto" persistent>
      <q-card style="width: 480px; max-width: 95vw">
        <q-form @submit.prevent="salvarForcada">
          <q-card-section class="text-h6">Forçar região quente</q-card-section>
          <q-card-section class="q-gutter-md">
            <div class="text-grey-7">
              Esquenta o hexágono que contém este ponto, no modo da cidade ({{
                rotuloDoModo(selecionada?.modo)
              }}). Os valores respeitam o teto da cidade.
            </div>
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model.number="forcar.latitude"
                  type="number"
                  outlined
                  label="Latitude"
                  step="any"
                  :rules="[intervalo(-90, 90, true)]"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model.number="forcar.longitude"
                  type="number"
                  outlined
                  label="Longitude"
                  step="any"
                  :rules="[intervalo(-180, 180, true)]"
                />
              </div>
            </div>
            <q-input
              v-if="selecionada?.modo === 'multiplicador'"
              v-model.number="forcar.multiplicador"
              type="number"
              outlined
              label="Multiplicador"
              suffix="x"
              step="0.1"
              :rules="[intervalo(1.1, 10)]"
            />
            <q-input
              v-else
              v-model.number="forcar.valor_adicional"
              type="number"
              outlined
              label="Valor adicional"
              prefix="R$"
              step="0.5"
              :rules="[intervalo(0.5, 500)]"
            />
            <q-input
              v-model.number="forcar.minutos"
              type="number"
              outlined
              label="Duração"
              suffix="min"
              hint="Vazio: fica até você remover"
              clearable
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              flat
              no-caps
              label="Cancelar"
              :disable="salvando"
              @click="forcar.aberto = false"
            />
            <q-btn type="submit" color="deep-orange" no-caps label="Forçar" :loading="salvando" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()
const carregando = ref(false)
const erro = ref('')
const salvando = ref(false)

const cidades = ref([])
const tamanho = ref(600)
const tamanhoSalvo = ref(600)
const salvandoTamanho = ref(false)

const colunas = [
  {
    name: 'cidade',
    label: 'Cidade',
    align: 'left',
    field: (l) => `${l.nome}/${l.uf}`,
    sortable: true,
  },
  { name: 'ativo', label: 'Ligado', align: 'left', field: 'ativo' },
  { name: 'modo', label: 'Cobrança', align: 'left', field: 'modo' },
  { name: 'regioes', label: 'Regiões quentes', align: 'left', field: 'regioes_ativas' },
  { name: 'acoes', label: '', align: 'right' },
]

const colunasRegioes = [
  { name: 'rotulo', label: 'Valor', align: 'left', field: 'rotulo' },
  { name: 'celula', label: 'Hexágono', align: 'left', field: 'celula' },
  {
    name: 'centro',
    label: 'Centro',
    align: 'left',
    field: (r) => `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`,
  },
  { name: 'pedidos', label: 'Pedidos', align: 'right', field: 'pedidos' },
  { name: 'motoristas', label: 'Motoristas', align: 'right', field: 'motoristas' },
  { name: 'origem', label: 'Origem', align: 'left', field: 'manual' },
  { name: 'expira', label: 'Vale até', align: 'left', field: 'expira_em' },
  { name: 'acoes', label: '', align: 'right' },
]

const rotuloDoModo = (modo) => (modo === 'valor_fixo' ? 'Valor fixo (+R$)' : 'Multiplicador (1,5x)')

const hora = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

// de amarelo a vermelho, como o mapa do motorista
const corDaIntensidade = (i) => {
  const h = Math.round(50 - 50 * Math.min(Math.max(i, 0), 1))
  return `hsl(${h}, 90%, 45%)`
}

const intervalo =
  (min, max, permiteNegativo = false) =>
  (v) => {
    if (v === '' || v === null || Number.isNaN(Number(v))) return 'Informe um valor'
    const n = Number(v)
    if (n < min || n > max) return permiteNegativo ? `De ${min} a ${max}` : `De ${min} a ${max}`
    return true
  }

const maiorQueMinima = (v) =>
  Number(v) > Number(formulario.razao_minima) || 'Precisa ser maior que a razão mínima'

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const { data } = await api.get('/dinamica')
    cidades.value = data.cidades
    tamanho.value = tamanhoSalvo.value = data.tamanho_celula_metros
    if (selecionada.value) {
      selecionada.value =
        data.cidades.find((c) => c.cidade_id === selecionada.value.cidade_id) ?? null
    }
  } catch (e) {
    erro.value = e.response?.data?.message || 'Não foi possível carregar o preço dinâmico.'
  } finally {
    carregando.value = false
  }
}

async function salvarTamanho() {
  salvandoTamanho.value = true
  try {
    await api.put('/dinamica/geral', { tamanho_celula_metros: tamanho.value })
    $q.notify({ type: 'positive', message: 'Tamanho do hexágono salvo.' })
    await carregar()
    if (selecionada.value) await carregarRegioes()
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Não foi possível salvar.',
    })
  } finally {
    salvandoTamanho.value = false
  }
}

async function alternar(linha, valor) {
  salvando.value = true
  try {
    await api.put(`/dinamica/cidades/${linha.cidade_id}`, { ativo: valor })
    $q.notify({
      type: 'positive',
      message: valor
        ? `Preço dinâmico ligado em ${linha.nome}.`
        : `Preço dinâmico desligado em ${linha.nome}.`,
    })
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Não foi possível alterar.',
    })
  } finally {
    salvando.value = false
    await carregar()
  }
}

// ---- formulário da cidade
const todasAsCidades = ref([])
const opcoesDeCidade = ref([])
const formulario = reactive({
  aberto: false,
  cidade: null,
  cidade_id: null,
  ativo: false,
  modo: 'multiplicador',
  centro_latitude: null,
  centro_longitude: null,
  raio_km: 25,
  multiplicador_maximo: 2.5,
  valor_maximo: 12,
  razao_minima: 1.5,
  razao_maxima: 3,
  pedidos_minimos: 2,
  janela_minutos: 10,
  validade_minutos: 5,
})
// só as regras (o que a API aceita no PUT), sem nome, UF nem contagens
const CAMPOS_DAS_REGRAS = [
  'ativo',
  'modo',
  'centro_latitude',
  'centro_longitude',
  'raio_km',
  'multiplicador_maximo',
  'valor_maximo',
  'razao_minima',
  'razao_maxima',
  'pedidos_minimos',
  'janela_minutos',
  'validade_minutos',
]
const soAsRegras = (origem) => Object.fromEntries(CAMPOS_DAS_REGRAS.map((c) => [c, origem[c]]))

const jaConfigurada = computed(() =>
  cidades.value.some((c) => c.cidade_id === formulario.cidade_id),
)

async function garantirCidades() {
  if (todasAsCidades.value.length) return
  const { data } = await api.get('/cidades')
  todasAsCidades.value = data.map((c) => ({ id: c.id, rotulo: `${c.nome}/${c.uf}` }))
}

function filtrarCidades(texto, atualizar) {
  garantirCidades()
    .then(() => {
      atualizar(() => {
        const busca = texto.trim().toLowerCase()
        opcoesDeCidade.value = busca
          ? todasAsCidades.value.filter((c) => c.rotulo.toLowerCase().includes(busca)).slice(0, 50)
          : todasAsCidades.value.slice(0, 50)
      })
    })
    .catch(() => atualizar(() => (opcoesDeCidade.value = [])))
}

async function abrirFormulario(linha) {
  if (linha) {
    await garantirCidades()
    Object.assign(formulario, soAsRegras(linha), {
      cidade_id: linha.cidade_id,
      cidade: { id: linha.cidade_id, rotulo: `${linha.nome}/${linha.uf}` },
    })
    opcoesDeCidade.value = [formulario.cidade]
  } else {
    Object.assign(formulario, {
      cidade: null,
      cidade_id: null,
      ativo: false,
      modo: 'multiplicador',
      centro_latitude: null,
      centro_longitude: null,
      raio_km: 25,
      multiplicador_maximo: 2.5,
      valor_maximo: 12,
      razao_minima: 1.5,
      razao_maxima: 3,
      pedidos_minimos: 2,
      janela_minutos: 10,
      validade_minutos: 5,
    })
  }
  formulario.aberto = true
}

async function salvarCidade() {
  const id = formulario.cidade?.id ?? formulario.cidade_id
  if (!id) return
  if (
    formulario.ativo &&
    (formulario.centro_latitude === null || formulario.centro_longitude === null)
  ) {
    $q.notify({ type: 'warning', message: 'Informe o centro da cidade antes de ligar.' })
    return
  }
  salvando.value = true
  try {
    await api.put(`/dinamica/cidades/${id}`, soAsRegras(formulario))
    $q.notify({ type: 'positive', message: 'Regras salvas.' })
    formulario.aberto = false
    await carregar()
  } catch (e) {
    const erros = e.response?.data?.errors
    $q.notify({
      type: 'negative',
      message:
        (erros && Object.values(erros)[0]?.[0]) ||
        e.response?.data?.message ||
        'Não foi possível salvar.',
    })
  } finally {
    salvando.value = false
  }
}

// ---- regiões quentes da cidade escolhida
const selecionada = ref(null)
const regioes = ref([])
const carregandoRegioes = ref(false)
const recalculando = ref(false)

async function carregarRegioes() {
  carregandoRegioes.value = true
  try {
    const { data } = await api.get(`/dinamica/cidades/${selecionada.value.cidade_id}/regioes`)
    regioes.value = data.data
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Não foi possível carregar as regiões.',
    })
  } finally {
    carregandoRegioes.value = false
  }
}

function abrirRegioes(linha) {
  selecionada.value = linha
  regioes.value = []
  carregarRegioes()
}

async function recalcular() {
  recalculando.value = true
  try {
    const { data } = await api.post(`/dinamica/cidades/${selecionada.value.cidade_id}/recalcular`)
    regioes.value = data.data
    await carregar()
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Não foi possível recalcular.',
    })
  } finally {
    recalculando.value = false
  }
}

const forcar = reactive({
  aberto: false,
  latitude: null,
  longitude: null,
  multiplicador: 1.5,
  valor_adicional: 2,
  minutos: 30,
})

function abrirForcar() {
  Object.assign(forcar, {
    aberto: true,
    latitude: selecionada.value.centro_latitude,
    longitude: selecionada.value.centro_longitude,
    multiplicador: 1.5,
    valor_adicional: 2,
    minutos: 30,
  })
}

async function salvarForcada() {
  salvando.value = true
  try {
    const corpo = {
      latitude: forcar.latitude,
      longitude: forcar.longitude,
      minutos: forcar.minutos || null,
    }
    if (selecionada.value.modo === 'multiplicador') corpo.multiplicador = forcar.multiplicador
    else corpo.valor_adicional = forcar.valor_adicional
    await api.post(`/dinamica/cidades/${selecionada.value.cidade_id}/regioes`, corpo)
    $q.notify({ type: 'positive', message: 'Região forçada.' })
    forcar.aberto = false
    await carregarRegioes()
    await carregar()
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Não foi possível forçar.',
    })
  } finally {
    salvando.value = false
  }
}

function removerRegiao(regiao) {
  $q.dialog({
    title: 'Remover região',
    message: `Remover o hexágono ${regiao.celula} (${regiao.rotulo})? Se a demanda continuar alta, ele volta no próximo cálculo.`,
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Remover', color: 'negative', noCaps: true },
    persistent: true,
  }).onOk(async () => {
    try {
      await api.delete(`/dinamica/cidades/${selecionada.value.cidade_id}/regioes/${regiao.id}`)
      await carregarRegioes()
      await carregar()
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e.response?.data?.message || 'Não foi possível remover.',
      })
    }
  })
}

onMounted(carregar)
</script>

<style scoped>
.cabecalho,
.cartao {
  border-radius: 14px;
}
</style>
