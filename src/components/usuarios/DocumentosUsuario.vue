<template>
  <section>
    <SubirArquivo
      @updated="onDocumentoUpdated"
      v-model="dialog.envairArquivo"
      :motorista-id="motoristaId"
      :documento="documentoSelecionado"
    />
    <q-dialog v-model="model" @before-show="beforeShow" @before-hide="onBeforeHide">
      <q-card class="documentos-usuario-dialog" style="width: 600px; max-width: 50vw">
        <!-- HEADER -->

        <!-- <q-card style="border-style: none"> -->
        <CardPerfilUsuario class="q-mt-md" :usuario="props.usuario" />
        <!-- </q-card> -->

        <q-banner v-if="erroCarregamento" class="bg-red-1 text-negative q-ma-md" rounded>
          Não foi possível carregar os documentos.
          <template #action>
            <q-btn flat label="Tentar novamente" @click="getMotoristaDocumentos" />
          </template>
        </q-banner>

        <q-table
          class="q-mt-sm q-mb-sm"
          :class="{ 'documentos-carregando': carregandoDocumentos }"
          bordered
          flat
          :rows="data"
          :columns="columns"
          :loading="carregandoDocumentos"
          no-data-label="Nenhum documento disponível."
          row-key="tipo_documento"
          hide-bottom
          hide-header
        >
          <template #loading>
            <q-inner-loading showing>
              <div class="column items-center text-primary" role="status">
                <q-spinner size="32px" />
                <span class="q-mt-sm">Carregando documentos…</span>
              </div>
            </q-inner-loading>
          </template>
          <!-- <template #top>
            <CardPerfilUsuario :usuario="props.usuario" />
          </template> -->
          <template v-slot:body="props">
            <q-tr :props="props">
              <q-td key="documento" :props="props">
                <q-item>
                  <q-item-section top avatar>
                    <q-avatar icon="attach_file" size="xl" rounded> </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-h6"> {{ props.row.titulo }}</q-item-label>
                    <q-item-label class="estilo-coluna" caption>
                      {{ props.row.descricao }}
                    </q-item-label>
                    <q-item-label caption>
                      <q-badge
                        :color="badgeColor(props.row.status)"
                        :label="props.row.status ? props.row.status : 'Não enviado'"
                      />
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-td>
              <q-td :props="props" key="acoes">
                <q-btn
                  v-if="visibilidadeBotoes(props.row.status, 'reprovar')"
                  :disable="carregandoDocumentos || erroCarregamento"
                  @click="
                    () => {
                      documentoSelecionado = props.row
                      dialog.confirmacaoReprovarDocumento = true
                    }
                  "
                  flat
                  text-color="red"
                  round
                  icon="close"
                  aria-label="Reprovar documento"
                >
                  <q-tooltip transition-show="flip-right" transition-hide="flip-left">
                    reprovar documento
                  </q-tooltip>
                </q-btn>
                <q-btn
                  v-if="visibilidadeBotoes(props.row.status, 'aprovar')"
                  :disable="carregandoDocumentos || erroCarregamento"
                  @click="
                    () => {
                      documentoSelecionado = props.row
                      dialog.confirmacao = true
                    }
                  "
                  flat
                  text-color="green"
                  round
                  icon="done"
                  aria-label="Aprovar documento"
                >
                  <q-tooltip transition-show="flip-right" transition-hide="flip-left">
                    aprovar documento
                  </q-tooltip>
                </q-btn>
                <q-btn
                  v-if="props.row.url"
                  :disable="carregandoDocumentos || erroCarregamento"
                  :href="props.row.verso?.url ? undefined : props.row.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visualizar documento"
                  icon="visibility"
                  dense
                  flat
                  round
                >
                  <q-tooltip>Visualizar documento</q-tooltip>
                  <q-menu v-if="props.row.verso?.url">
                    <q-list style="min-width: 100px">
                      <q-item
                        v-for="anexo in anexosDocumento(props.row)"
                        :key="anexo.lado"
                        clickable
                        v-close-popup
                        :href="anexo.url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <q-item-section>Visualizar {{ anexo.label }}</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
                <q-btn
                  v-if="props.row.url"
                  :disable="carregandoDocumentos || erroCarregamento"
                  :loading="baixandoDocumento === props.row.id"
                  @click="!props.row.verso?.url && baixarDocumento(props.row)"
                  aria-label="Baixar documento"
                  icon="download"
                  dense
                  flat
                  round
                >
                  <q-tooltip>Baixar documento</q-tooltip>
                  <q-menu v-if="props.row.verso?.url">
                    <q-list style="min-width: 100px">
                      <q-item
                        v-for="anexo in anexosDocumento(props.row)"
                        :key="anexo.lado"
                        clickable
                        v-close-popup
                        @click="baixarDocumento(props.row, anexo.lado)"
                      >
                        <q-item-section>Baixar {{ anexo.label }}</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>

                <q-icon
                  v-if="
                    !carregandoDocumentos &&
                    !erroCarregamento &&
                    visibilidadeBotoes(props.row.status, 'upload')
                  "
                  @click="
                    () => {
                      documentoSelecionado = props.row
                      dialog.envairArquivo = true
                    }
                  "
                  class="q-ml-lg cursor-pointer"
                  color="grey"
                  size="sm"
                  name="upload"
                >
                  <q-tooltip
                    v-if="!props.row.id"
                    transition-show="flip-right"
                    transition-hide="flip-left"
                  >
                    enviar arquivo
                  </q-tooltip>
                </q-icon>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </q-card>
    </q-dialog>
    <JanelaConfirmacao v-model="dialog.confirmacao" @confirm="mudarStatusDocumento('aprovado')">
      Deseja realmente aprovar o documento?
    </JanelaConfirmacao>
    <JanelaConfirmacao
      v-model="dialog.confirmacaoReprovarDocumento"
      @confirm="mudarStatusDocumento('reprovado')"
    >
      Deseja realmente reprovar o documento?
    </JanelaConfirmacao>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { exportFile, useQuasar } from 'quasar'
import { api } from 'boot/axios'
import CardPerfilUsuario from 'src/components/usuarios/CardPerfilUsuario.vue'
import JanelaConfirmacao from 'src/components/JanelaConfirmacao.vue'
import SubirArquivo from 'src/components/motorista/SubirArquivo.vue'

// PROPS
const props = defineProps({
  modelValue: Boolean,
  usuario: [Object],
  motoristaId: [String, Number],
})

// EMITS
const emit = defineEmits(['update:modelValue', 'updated'])

// QUASAR
const $q = useQuasar()

// MODEL
const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// STATE
const documentoSelecionado = ref({})
let documentosVersion = 0
const dialog = ref({
  confirmacao: false,
  envairArquivo: false,
  confirmacaoReprovarDocumento: false,
})

const data = ref([])
const carregandoDocumentos = ref(false)
const erroCarregamento = ref(false)
const baixandoDocumento = ref(null)

const columns = [
  {
    name: 'documento',
    label: 'Documentos',
    align: 'left',
  },
  {
    name: 'acoes',
    label: 'Ações',
  },
]

function beforeShow() {
  data.value = []
  getMotoristaDocumentos()
}

function onBeforeHide() {
  documentosVersion++
  data.value = []
  carregandoDocumentos.value = false
  erroCarregamento.value = false
}

function visibilidadeBotoes(status, tipo) {
  switch (tipo) {
    case 'reprovar':
      return status === 'em_analise' || status === 'aprovado'
    case 'aprovar':
      return status === 'em_analise' || status === 'reprovado'

    case 'upload':
      return !status

    default:
      return false
  }
}

function anexosDocumento(documento) {
  const anexos = [{ ...documento, lado: 'frente', label: 'frente' }]
  if (documento.verso?.url) anexos.push({ ...documento.verso, lado: 'verso', label: 'verso' })
  return anexos
}

async function baixarDocumento(documento, lado = 'frente') {
  if (baixandoDocumento.value !== null) return
  const anexo = lado === 'verso' ? documento.verso : documento
  if (!anexo?.url || !documento.id) return
  baixandoDocumento.value = documento.id
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
    baixandoDocumento.value = null
  }
}

const badgeColor = (status) => {
  if (status === 'aprovado') return 'green'
  if (status === 'reprovado') return 'red'
  if (status === 'em_analise') return 'orange'
  return 'grey'
}

async function mudarStatusDocumento(status) {
  try {
    const response = await api.put(`mudar-status-documento/${documentoSelecionado.value.id}`, {
      status: status,
    })
    documentoSelecionado.value = {}
    onDocumentoUpdated()
    $q.notify({ type: 'positive', position: 'top-right', message: response.data.message })
  } catch (err) {
    console.log(err, 'err')
    // model.value = false
    $q.notify({ type: 'negative', message: err.message })
  } finally {
    // model.value = false
  }
}

async function onDocumentoUpdated() {
  emit('updated')
  await getMotoristaDocumentos()
}

const getMotoristaDocumentos = async () => {
  if (!props.motoristaId) return
  const version = ++documentosVersion
  carregandoDocumentos.value = true
  erroCarregamento.value = false
  try {
    const response = await api.get(`/motorista-documentos/${props.motoristaId}/resumo`, {
      timeout: 15000,
    })
    if (version !== documentosVersion) return
    data.value = response.data.data
  } catch (error) {
    if (version === documentosVersion) {
      erroCarregamento.value = true
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Não foi possível carregar os documentos.',
      })
    }
  } finally {
    if (version === documentosVersion) carregandoDocumentos.value = false
  }
}
</script>
<style scoped>
.documentos-carregando {
  min-height: 120px;
}
.estilo-coluna {
  max-width: 200px;
  white-space: normal;
  margin-top: 4px;
}
</style>
