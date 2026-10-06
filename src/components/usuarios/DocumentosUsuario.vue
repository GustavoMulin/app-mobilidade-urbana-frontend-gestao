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
                  v-if="visibilidadeBotoes(props.row.status, 'acao')"
                  :disable="carregandoDocumentos || erroCarregamento"
                  @click="
                    () => {
                      documentoSelecionado = props.row
                      dialog.reprovarDocumento = true
                    }
                  "
                  flat
                  text-color="red"
                  round
                  icon="close"
                >
                  <q-tooltip transition-show="flip-right" transition-hide="flip-left">
                    reprovar documento
                  </q-tooltip>
                </q-btn>
                <q-btn
                  v-if="visibilidadeBotoes(props.row.status, 'acao')"
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
                >
                  <q-tooltip transition-show="flip-right" transition-hide="flip-left">
                    aprovar documento
                  </q-tooltip>
                </q-btn>
                <q-btn
                  v-if="visibilidadeBotoes(props.row.status, 'menu')"
                  :disable="carregandoDocumentos || erroCarregamento"
                  @click.stop.prevent
                  title="Menu"
                  icon="linear_scale"
                  dense
                  flat
                  round
                >
                  <q-menu>
                    <q-list style="min-width: 100px">
                      <q-item clickable v-close-popup>
                        <q-item-section>Reprovar documento</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup>
                        <q-item-section>Excluir documento</q-item-section>
                      </q-item>

                      <q-item clickable v-close-popup>
                        <q-item-section>Baixar documento</q-item-section>
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

                <!-- <q-icon
                  v-if="visibilidadeBotoes(props.row.status, 'download')"
                  @click="
                    () => {
                      documentoSelecionado.value = props.row
                      dialog.envairArquivo = true
                    }
                  "
                  class="q-ml-lg cursor-pointer"
                  color="grey"
                  size="sm"
                  name="download"
                >
                  <q-tooltip
                    v-if="!props.row.id"
                    transition-show="flip-right"
                    transition-hide="flip-left"
                  >
                    baixar arquivo
                  </q-tooltip>
                </q-icon> -->
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </q-card>
    </q-dialog>
    <q-dialog v-model="dialog.reprovarDocumento">
      <q-card style="width: 700px; max-width: 80vw">
        <q-card-section>
          <CardPerfilDocumento :documento="documentoSelecionado" />
          <q-form @submit.prevent="onSubmit">
            <q-input
              label="Observação"
              dense
              outlined
              autogrow
              class="full-width q-px-md q-mt-md q-mb-md"
              v-model="documentoSelecionado.observacao"
              type="textarea"
              bottom-slots
              counter
              maxlength="2000"
              :rules="[(val) => val.length >= 3 || 'Campo obrigatório']"
            >
              <template v-slot:hint> Caracteres </template>
            </q-input>
            <div class="q-mt-md" align="center">
              <q-btn type="submit" icon="close" color="red" label="REPROVAR DOCUMENTO" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
    <JanelaConfirmacao v-model="dialog.confirmacao" @confirm="mudarStatusDocumento('aprovado')">
      Deseja realmente aprovar o ducmento?
    </JanelaConfirmacao>
    <JanelaConfirmacao
      v-model="dialog.confirmacaoReprovarDocumento"
      @confirm="mudarStatusDocumento('reprovado')"
    >
      Deseja realmente reprovar o ducmento?
    </JanelaConfirmacao>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import CardPerfilUsuario from 'src/components/usuarios/CardPerfilUsuario.vue'
import JanelaConfirmacao from 'src/components/JanelaConfirmacao.vue'
import SubirArquivo from 'src/components/motorista/SubirArquivo.vue'
import CardPerfilDocumento from 'src/components/motorista/CardPerfilDocumento.vue'

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
const documentoSelecionado = ref({
  observacao: '',
})
let documentosVersion = 0
const dialog = ref({
  confirmacao: false,
  envairArquivo: false,
  reprovarDocumento: false,
  confirmacaoReprovarDocumento: false,
})

const data = ref([])
const carregandoDocumentos = ref(false)
const erroCarregamento = ref(false)

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

function onSubmit() {
  dialog.value.confirmacaoReprovarDocumento = true
}

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
    case 'acao':
      return status === 'em_analise'

    case 'menu':
      return status === 'aprovado' || status === 'reprovado' || status === 'em_analise'

    case 'download':
      return status === 'aprovado' || status === 'reprovado' || status === 'em_analise'

    case 'upload':
      return !status

    default:
      return false
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
      observacao: documentoSelecionado.value.observacao,
      status: status,
    })
    dialog.value.reprovarDocumento = false
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
