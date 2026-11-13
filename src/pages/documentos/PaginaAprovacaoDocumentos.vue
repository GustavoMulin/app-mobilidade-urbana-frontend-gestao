<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5">Aprovação de documentos</div>
        <div class="text-caption text-grey-7">
          Documentos enviados pelos motoristas, agrupados por motorista. Os mais antigos primeiro.
        </div>
      </div>
      <q-space />
      <q-btn
        flat
        round
        icon="refresh"
        aria-label="Atualizar"
        :loading="carregando"
        @click="buscar()"
      />
    </div>

    <div class="row items-center q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-auto">
        <q-btn-toggle
          v-model="status"
          no-caps
          unelevated
          toggle-color="primary"
          :options="opcoesStatus"
          @update:model-value="aplicarFiltros"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="tipo"
          dense
          outlined
          clearable
          emit-value
          map-options
          label="Tipo de documento"
          :options="TIPOS"
          @update:model-value="aplicarFiltros"
        />
      </div>
      <div class="col">
        <q-input
          v-model="busca"
          dense
          outlined
          debounce="400"
          placeholder="Buscar por nome ou CPF"
          @update:model-value="aplicarFiltros"
        >
          <template #prepend><q-icon name="search" /></template>
          <template v-if="busca" #append>
            <q-icon name="close" class="cursor-pointer" @click="busca = ''" />
          </template>
        </q-input>
      </div>
    </div>

    <q-banner
      v-if="novosRecebidos > 0"
      class="bg-blue-1 text-primary q-mb-md"
      rounded
      dense
      role="status"
    >
      <template #avatar><q-icon name="upload_file" /></template>
      {{ novosRecebidos }}
      {{ novosRecebidos === 1 ? 'novo documento recebido' : 'novos documentos recebidos' }}
      desde que você abriu a tela.
      <template #action>
        <q-btn flat no-caps label="Marcar como vistos" @click="marcarComoVistos" />
      </template>
    </q-banner>

    <q-banner v-if="erro" class="bg-red-1 text-negative q-mb-md" rounded>
      Não foi possível carregar a fila de documentos.
      <template #action>
        <q-btn flat label="Tentar novamente" @click="buscar()" />
      </template>
    </q-banner>

    <div v-if="carregando && !motoristas.length" class="column items-center q-pa-xl text-primary">
      <q-spinner size="40px" />
      <span class="q-mt-sm">Carregando…</span>
    </div>

    <div
      v-else-if="!motoristas.length && !erro"
      class="column items-center q-pa-xl text-grey-7"
      role="status"
    >
      <q-icon :name="status === 'em_analise' ? 'task_alt' : 'inbox'" size="56px" />
      <div class="text-subtitle1 q-mt-sm">
        {{
          status === 'em_analise'
            ? 'Nenhum documento aguardando aprovação.'
            : 'Nenhum documento encontrado.'
        }}
      </div>
    </div>

    <div v-else class="column q-gutter-md" :class="{ 'fila-carregando': carregando }">
      <BlocoMotoristaDocumentos
        v-for="motorista in motoristas"
        :key="motorista.id"
        :motorista="motorista"
        :status="status"
        :ocupado="ocupados.has(motorista.id)"
        :novos-ids="novosIds"
        :baixando="baixando"
        @expandir="expandir"
        @baixar="baixarDocumento"
        @conferir="abrirCadastro"
      />
    </div>

    <div v-if="ultimaPagina > 1" class="row justify-center q-mt-lg">
      <q-pagination
        v-model="pagina"
        :max="ultimaPagina"
        max-pages="7"
        direction-links
        boundary-numbers
        :disable="carregando"
        @update:model-value="buscar()"
      />
    </div>

    <!-- Mesmos diálogos de envio e análise da página de motoristas -->
    <SubirNadaConsta
      v-if="selecionado.documento?.tipo_documento === 'nada_consta'"
      v-model="dialog.expandir"
      :motorista-id="selecionado.motorista?.id"
      :documento="selecionado.documento"
      @updated="aoAtualizar"
    />
    <SubirArquivo
      v-else-if="!selecionado.documento?.possui_dados_crlv"
      v-model="dialog.expandir"
      :motorista-id="selecionado.motorista?.id"
      :documento="selecionado.documento"
      @updated="aoAtualizar"
    />
    <SubirCrlv
      v-else
      v-model="dialog.expandir"
      :motorista-id="selecionado.motorista?.id"
      :documento="selecionado.documento"
      :veiculos="veiculosDoMotorista"
      @updated="aoAtualizar"
    />

    <DocumentosUsuario
      v-model="dialog.cadastro"
      :usuario="selecionado.motorista?.user"
      :motorista-id="selecionado.motorista?.id"
      @updated="buscar()"
    />
  </q-page>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import BlocoMotoristaDocumentos from 'src/components/documentos/BlocoMotoristaDocumentos.vue'
import SubirArquivo from 'src/components/motorista/SubirArquivo.vue'
import SubirCrlv from 'src/components/motorista/SubirCrlv.vue'
import SubirNadaConsta from 'src/components/motorista/SubirNadaConsta.vue'
import DocumentosUsuario from 'src/components/usuarios/DocumentosUsuario.vue'
import { exportFile } from 'quasar'
import { STATUS_FILA } from 'src/utils/documentosFila'
import { getEcho } from 'src/services/echo'
import { useAtualizacaoSemConexao } from 'src/composables/useAtualizacaoSemConexao'

const $q = useQuasar()

const TIPOS = [
  { label: 'CNH', value: 'cnh' },
  { label: 'CRLV', value: 'crlv' },
  { label: 'Nada consta', value: 'nada_consta' },
  { label: 'Seguro obrigatório', value: 'seguro_obrigatorio' },
]

const status = ref('em_analise')
const tipo = ref(null)
const busca = ref('')
const pagina = ref(1)
const ultimaPagina = ref(1)
const motoristas = ref([])
const totais = ref({})
const carregando = ref(false)
const erro = ref(false)
const ocupados = reactive(new Set())
const selecionado = reactive({ motorista: null, documento: {} })
const dialog = reactive({ expandir: false, cadastro: false })
const veiculosDoMotorista = ref([])
const baixando = ref(null)

const opcoesStatus = ref(montarOpcoes({}))

function montarOpcoes(valores) {
  return STATUS_FILA.map((item) => ({
    value: item.value,
    label: `${item.label}${valores[item.value] ? ` (${valores[item.value].documentos})` : ''}`,
  }))
}

const novosRecebidos = ref(0)
const novosIds = ref(new Set())
let idsConhecidos = null
let porEvento = false

// Sem toast por documento: com centenas de envios, só um contador e um selo "Novo".
function registrarNovos(data, silencioso, anteriores) {
  const ids = new Set(data.data.flatMap((motorista) => motorista.documentos.map((d) => d.id)))
  if (silencioso && idsConhecidos) {
    const adicionados = new Set(novosIds.value)
    ids.forEach((id) => {
      if (!idsConhecidos.has(id)) adicionados.add(id)
    })
    novosIds.value = adicionados
  }
  idsConhecidos = ids
  // sem o WebSocket não há eventos para contar: usa o aumento do total em análise
  const aumento = data.totais.em_analise.documentos - (anteriores ?? Infinity)
  if (silencioso && !porEvento && aumento > 0) novosRecebidos.value += aumento
  porEvento = false
}

function marcarComoVistos() {
  novosRecebidos.value = 0
  novosIds.value = new Set()
}

let versao = 0

async function buscar(silencioso = false) {
  const minha = ++versao
  if (!silencioso) {
    carregando.value = true
    erro.value = false
  }
  try {
    const { data } = await api.get('/motorista-documentos/fila', {
      params: {
        status: status.value,
        tipo_documento: tipo.value || undefined,
        search: busca.value || undefined,
        page: pagina.value,
      },
      timeout: 20000,
    })
    if (minha !== versao) return
    // a última página pode ter esvaziado depois de aprovar tudo nela
    if (!data.data.length && pagina.value > 1) {
      pagina.value = Math.max(1, data.last_page)
      return buscar()
    }
    const anteriores = totais.value.em_analise?.documentos
    motoristas.value = data.data
    ultimaPagina.value = data.last_page
    totais.value = data.totais
    opcoesStatus.value = montarOpcoes(data.totais)
    registrarNovos(data, silencioso, anteriores)
  } catch {
    if (minha === versao && !silencioso) erro.value = true
  } finally {
    if (minha === versao) carregando.value = false
  }
}

function aplicarFiltros() {
  pagina.value = 1
  buscar()
}

function selecionar(motorista, documento = {}) {
  selecionado.motorista = motorista
  selecionado.documento = documento
}

// Abre o mesmo diálogo de envio/análise da página de motoristas. O resumo do motorista traz o
// documento completo e os veículos, de que o diálogo do CRLV precisa.
async function expandir(motorista, documento) {
  selecionar(motorista, documento)
  try {
    const { data } = await api.get(`/motorista-documentos/${motorista.id}/resumo`, {
      timeout: 15000,
    })
    veiculosDoMotorista.value = data.veiculos || []
    selecionado.documento = data.data.find((item) => item.id === documento.id) || documento
  } catch {
    veiculosDoMotorista.value = []
  }
  dialog.expandir = true
}

async function baixarDocumento(documento, lado = 'frente') {
  if (baixando.value !== null) return
  const anexo = lado === 'verso' ? documento.verso : documento
  if (!anexo?.url || !documento.id) return
  baixando.value = documento.id
  try {
    const response = await api.get(`/motorista-documentos/${documento.id}/download`, {
      params: { lado },
      responseType: 'blob',
      timeout: 30000,
    })
    const nome = anexo.name || `${documento.tipo_documento}-${lado}.${anexo.type || 'pdf'}`
    const resultado = exportFile(nome, response.data, {
      mimeType: anexo.mime_type || response.data.type,
    })
    if (resultado !== true) throw resultado
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível baixar o documento. Tente novamente.',
    })
  } finally {
    baixando.value = null
  }
}

function abrirCadastro(motorista) {
  selecionar(motorista)
  dialog.cadastro = true
}

function aoAtualizar() {
  buscar()
}

// TEMPO REAL
const canalAutorizado = ref(false)
const atualizacaoHabilitada = ref(false)
let echo = null
let timerAtualizacao = null

function agendarAtualizacao() {
  clearTimeout(timerAtualizacao)
  timerAtualizacao = setTimeout(() => void buscar(true), 400)
}

// sem o WebSocket, consulta a cada 15 s
useAtualizacaoSemConexao(canalAutorizado, atualizacaoHabilitada, agendarAtualizacao)

function aoAlterarFila(evento) {
  if (evento?.motivo === 'enviado') {
    novosRecebidos.value += 1
    porEvento = true
  }
  agendarAtualizacao()
}

function assinarCanal() {
  echo = getEcho()
  echo
    ?.private('documentos.fila')
    .listen('.fila.alterada', aoAlterarFila)
    .subscribed(() => {
      canalAutorizado.value = true
      agendarAtualizacao()
    })
    .error(() => {
      canalAutorizado.value = false
    })
}

onMounted(() => {
  atualizacaoHabilitada.value = true
  buscar()
  assinarCanal()
})

onBeforeUnmount(() => {
  atualizacaoHabilitada.value = false
  clearTimeout(timerAtualizacao)
  echo?.leave('documentos.fila')
})
</script>

<style scoped>
.fila-carregando {
  opacity: 0.6;
  pointer-events: none;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
