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
        @click="buscar"
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

    <q-banner v-if="erro" class="bg-red-1 text-negative q-mb-md" rounded>
      Não foi possível carregar a fila de documentos.
      <template #action>
        <q-btn flat label="Tentar novamente" @click="buscar" />
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
        :pode-analisar="pode('documentos.analisar')"
        :ocupado="ocupados.has(motorista.id)"
        @visualizar="abrirVisualizacao"
        @aprovar="aprovar"
        @reprovar="abrirReprovacao"
        @conferir="abrirCadastro"
        @aprovar-todos="aprovarTodos"
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
        @update:model-value="buscar"
      />
    </div>

    <VisualizarDocumento
      v-model="dialog.visualizar"
      :documento="selecionado.documento"
      :nome-motorista="selecionado.motorista?.nome"
    >
      <template #acoes>
        <template
          v-if="pode('documentos.analisar') && selecionado.documento && status !== 'aprovado'"
        >
          <q-btn
            v-if="status !== 'reprovado'"
            flat
            no-caps
            color="negative"
            icon="close"
            label="Reprovar"
            @click="reprovarDaVisualizacao"
          />
          <q-btn
            v-if="!precisaConferencia(selecionado.documento)"
            unelevated
            no-caps
            color="positive"
            icon="done"
            label="Aprovar"
            :loading="ocupados.has(selecionado.motorista?.id)"
            @click="aprovarDaVisualizacao"
          />
        </template>
      </template>
    </VisualizarDocumento>

    <ReprovarDocumento
      v-model="dialog.reprovar"
      :documento="selecionado.documento"
      @updated="aoAtualizar"
    />

    <DocumentosUsuario
      v-model="dialog.cadastro"
      :usuario="selecionado.motorista?.user"
      :motorista-id="selecionado.motorista?.id"
      @updated="buscar"
    />
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'src/stores/auth'
import BlocoMotoristaDocumentos from 'src/components/documentos/BlocoMotoristaDocumentos.vue'
import VisualizarDocumento from 'src/components/documentos/VisualizarDocumento.vue'
import ReprovarDocumento from 'src/components/motorista/ReprovarDocumento.vue'
import DocumentosUsuario from 'src/components/usuarios/DocumentosUsuario.vue'
import { STATUS_FILA, precisaConferencia } from 'src/utils/documentosFila'

const { pode } = useAuthStore()
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
const selecionado = reactive({ motorista: null, documento: null })
const dialog = reactive({ visualizar: false, reprovar: false, cadastro: false })

const opcoesStatus = ref(montarOpcoes({}))

function montarOpcoes(valores) {
  return STATUS_FILA.map((item) => ({
    value: item.value,
    label: `${item.label}${valores[item.value] ? ` (${valores[item.value].documentos})` : ''}`,
  }))
}

let versao = 0

async function buscar() {
  const minha = ++versao
  carregando.value = true
  erro.value = false
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
    motoristas.value = data.data
    ultimaPagina.value = data.last_page
    totais.value = data.totais
    opcoesStatus.value = montarOpcoes(data.totais)
  } catch {
    if (minha === versao) erro.value = true
  } finally {
    if (minha === versao) carregando.value = false
  }
}

function aplicarFiltros() {
  pagina.value = 1
  buscar()
}

function selecionar(motorista, documento = null) {
  selecionado.motorista = motorista
  selecionado.documento = documento
}

function abrirVisualizacao(motorista, documento) {
  selecionar(motorista, documento)
  dialog.visualizar = true
}

function abrirReprovacao(motorista, documento) {
  selecionar(motorista, documento)
  dialog.reprovar = true
}

function abrirCadastro(motorista) {
  selecionar(motorista)
  dialog.cadastro = true
}

function aoAtualizar() {
  dialog.visualizar = false
  buscar()
}

function reprovarDaVisualizacao() {
  dialog.visualizar = false
  dialog.reprovar = true
}

async function aprovarDaVisualizacao() {
  const { motorista, documento } = selecionado
  if (await aprovar(motorista, documento)) dialog.visualizar = false
}

async function aprovarUm(documento) {
  const { data } = await api.put(`/mudar-status-documento/${documento.id}`, {
    status: 'aprovado',
  })
  return data.message
}

async function aprovar(motorista, documento) {
  if (ocupados.has(motorista.id)) return false
  ocupados.add(motorista.id)
  try {
    const mensagem = await aprovarUm(documento)
    $q.notify({ type: 'positive', position: 'top-right', message: mensagem })
    await buscar()
    return true
  } catch (err) {
    $q.notify({
      type: 'negative',
      message:
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})[0]?.[0] ||
        'Não foi possível aprovar o documento.',
    })
    return false
  } finally {
    ocupados.delete(motorista.id)
  }
}

function aprovarTodos(motorista, documentos) {
  $q.dialog({
    title: 'Aprovar documentos',
    message: `Aprovar ${documentos.length} documentos de ${motorista.nome}? (${documentos
      .map((documento) => documento.titulo)
      .join(', ')})`,
    cancel: { flat: true, label: 'Cancelar' },
    ok: { label: 'Aprovar', color: 'positive', unelevated: true },
    persistent: true,
  }).onOk(async () => {
    ocupados.add(motorista.id)
    let aprovados = 0
    const falhas = []
    for (const documento of documentos) {
      try {
        await aprovarUm(documento)
        aprovados++
      } catch (err) {
        falhas.push(`${documento.titulo}: ${err.response?.data?.message || 'falhou'}`)
      }
    }
    ocupados.delete(motorista.id)
    if (aprovados) {
      $q.notify({
        type: 'positive',
        position: 'top-right',
        message: `${aprovados} ${aprovados === 1 ? 'documento aprovado' : 'documentos aprovados'}.`,
      })
    }
    if (falhas.length) {
      $q.notify({ type: 'negative', multiLine: true, message: falhas.join('\n') })
    }
    await buscar()
  })
}

onMounted(buscar)
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
