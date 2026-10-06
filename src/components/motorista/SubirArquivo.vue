<template>
  <q-dialog v-model="model" :persistent="enviando" @before-show="beforeShow" @hide="onHide">
    <q-card class="documento-dialog">
      <q-toolbar>
        <q-toolbar-title class="text-weight-bold">
          {{ isCnh ? 'Enviar CNH' : 'Enviar documento' }}
        </q-toolbar-title>
        <q-btn
          flat
          round
          dense
          icon="close"
          aria-label="Fechar"
          :disable="enviando"
          v-close-popup
        />
      </q-toolbar>
      <q-separator />
      <q-form @submit.prevent="request">
        <div class="row">
          <section class="col-12 col-md-5 q-pa-lg dados-documento">
            <div class="text-h6">{{ isCnh ? 'Dados da CNH' : documento?.titulo }}</div>
            <p class="text-grey-7 q-mt-xs">
              {{
                isCnh
                  ? 'Confira o documento ao lado e preencha os dados da habilitação.'
                  : documento?.descricao
              }}
            </p>
            <q-file
              v-model="file"
              outlined
              clearable
              label="Selecione o arquivo"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              :max-file-size="2097152"
              :disable="enviando"
              :rules="[(val) => !!val || 'Selecione um arquivo']"
              :error="!!errors.arquivo"
              :error-message="errors.arquivo?.[0]"
              hint="PDF, JPG ou PNG de até 2 MB"
              @rejected="onRejected"
            >
              <template #prepend><q-icon name="upload_file" /></template>
            </q-file>
            <template v-if="isCnh">
              <q-banner
                v-if="resultadoExtracao && !carregandoCampos"
                class="q-mt-md"
                :class="
                  resultadoExtracao.preenchidos
                    ? 'bg-blue-1 text-primary'
                    : 'bg-amber-1 text-grey-9'
                "
                rounded
                role="status"
              >
                {{ resultadoExtracao.message }}
              </q-banner>
              <q-banner v-if="erroCarregamento" class="bg-red-1 text-negative q-mt-md" rounded>
                Não foi possível carregar os dados da CNH.
                <template #action>
                  <q-btn
                    flat
                    label="Tentar novamente"
                    :loading="carregando"
                    @click="loadMotorista"
                  />
                </template>
              </q-banner>
              <div
                class="campos-cnh relative-position q-mt-md"
                role="group"
                aria-label="Campos da CNH"
                :aria-busy="carregandoCampos"
              >
                <div class="row q-col-gutter-md">
                  <div
                    v-for="campo in camposCnh"
                    :key="campo.name"
                    :class="campo.class || 'col-12 col-sm-6'"
                  >
                    <q-input
                      v-model="cnh[campo.name]"
                      @update:model-value="marcarCampoEditado(campo.name)"
                      outlined
                      :label="campo.label"
                      :type="campo.type || 'text'"
                      :autogrow="campo.type === 'textarea'"
                      :rows="campo.type === 'textarea' ? 3 : undefined"
                      :stack-label="campo.type === 'date'"
                      :maxlength="campo.maxlength"
                      :mask="campo.mask"
                      :unmasked-value="!!campo.mask"
                      :rules="campo.name === 'cpf' ? cpfRules : undefined"
                      :disable="camposBloqueados"
                      :error="!!errors[`cnh.${campo.name}`]"
                      :error-message="errors[`cnh.${campo.name}`]?.[0]"
                      hide-bottom-space
                    />
                  </div>
                  <div class="col-12">
                    <q-select
                      v-model="cnh.ear"
                      @update:model-value="marcarCampoEditado('ear')"
                      outlined
                      label="EAR — Exerce atividade remunerada"
                      :options="earOptions"
                      emit-value
                      map-options
                      :disable="camposBloqueados"
                      :error="!!errors['cnh.ear']"
                      :error-message="errors['cnh.ear']?.[0]"
                    />
                  </div>
                </div>
                <q-inner-loading v-if="carregandoCampos" showing class="carregamento-cnh">
                  <div
                    class="column items-center text-primary q-pa-md"
                    role="status"
                    aria-live="polite"
                  >
                    <q-spinner size="40px" class="q-mb-sm" />
                    <div class="text-center">
                      {{ carregando ? 'Carregando dados da CNH…' : progressoExtracao }}
                    </div>
                    <div class="text-caption text-center q-mt-xs">
                      Aguarde para editar os campos.
                    </div>
                  </div>
                </q-inner-loading>
              </div>
            </template>
          </section>
          <section class="col-12 col-md-7 q-pa-md bg-grey-2 previa-documento">
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1 text-weight-medium">Prévia do documento</div>
              <q-space />
              <q-btn
                v-if="previewUrl"
                flat
                dense
                no-caps
                icon="open_in_new"
                label="Abrir arquivo"
                :href="previewUrl"
                target="_blank"
                rel="noopener noreferrer"
              />
            </div>
            <iframe
              v-if="previewUrl && isPdf"
              :src="previewUrl"
              title="Prévia do PDF selecionado"
              class="pdf-preview"
            />
            <div v-else-if="previewUrl" class="imagem-preview flex flex-center">
              <img :src="previewUrl" alt="Prévia do documento selecionado" />
            </div>
            <div v-else class="previa-vazia column flex-center text-grey-7">
              <q-icon name="picture_as_pdf" size="64px" class="q-mb-md" />
              <span>Selecione um arquivo para visualizar a prévia.</span>
            </div>
            <p v-if="previewUrl && isPdf" class="text-caption text-grey-7 q-mt-sm q-mb-none">
              Se a prévia não aparecer, use “Abrir arquivo”.
            </p>
          </section>
        </div>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" :disable="enviando" v-close-popup />
          <q-btn
            type="submit"
            label="Enviar"
            color="primary"
            :loading="enviando"
            :disable="!file || carregando || extraindo || erroCarregamento || !motoristaId"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { extrairCnhPdf } from 'src/utils/extrairCnhPdf'

const props = defineProps({
  modelValue: Boolean,
  motoristaId: [String, Number],
  documento: Object,
})
const emit = defineEmits(['update:modelValue', 'updated'])
const $q = useQuasar()
const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})
const isCnh = computed(() => props.documento?.possui_dados_cnh === true)
const file = ref(null)
const previewUrl = ref('')
const isPdf = computed(
  () => file.value?.type === 'application/pdf' || /\.pdf$/i.test(file.value?.name || ''),
)
const enviando = ref(false)
const carregando = ref(false)
const erroCarregamento = ref(false)
const errors = ref({})
const extraindo = ref(false)
const carregandoCampos = computed(() => carregando.value || extraindo.value)
const camposBloqueados = computed(
  () => carregandoCampos.value || enviando.value || erroCarregamento.value,
)
const progressoExtracao = ref('Lendo os dados da CNH…')
const resultadoExtracao = ref(null)
const camposEditados = new Set()
const camposExtraidos = new Map()
let extracaoController = null
const camposCnh = [
  { name: 'nome', label: 'Nome na CNH', maxlength: 255, class: 'col-12' },
  { name: 'cpf', label: 'CPF', mask: '###.###.###-##' },
  { name: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
  { name: 'numero_registro', label: 'Número de registro', maxlength: 20 },
  { name: 'cnh_categoria', label: 'Categoria', maxlength: 20 },
  { name: 'primeira_habilitacao', label: 'Primeira habilitação', type: 'date' },
  { name: 'data_emissao', label: 'Data de emissão', type: 'date' },
  { name: 'cnh_expiracao', label: 'Validade da CNH', type: 'date' },
  {
    name: 'observacao',
    label: 'Observações da CNH',
    type: 'textarea',
    maxlength: 5000,
    class: 'col-12',
  },
]
const earOptions = [
  { label: 'Não informado', value: null },
  { label: 'Sim', value: true },
  { label: 'Não', value: false },
]
const cpfRules = [(val) => !val || val.length === 11 || 'Informe os 11 dígitos do CPF']
const emptyCnh = () => ({
  ...Object.fromEntries(camposCnh.map((campo) => [campo.name, ''])),
  ear: null,
})
const cnh = ref(emptyCnh())
let loadVersion = 0

function releasePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}
watch(
  file,
  (value) => {
    cancelarExtracao()
    restaurarCamposExtraidos()
    releasePreview()
    errors.value = {}
    if (value) previewUrl.value = URL.createObjectURL(value)
  },
  { flush: 'sync' },
)
watch([file, carregando], ([value, loading]) => {
  if (value && isCnh.value && isPdf.value && !loading && !erroCarregamento.value) {
    preencherDadosPdf(value)
  }
})
onUnmounted(() => {
  loadVersion++
  cancelarExtracao()
  releasePreview()
})

function beforeShow() {
  file.value = null
  camposEditados.clear()
  camposExtraidos.clear()
  resultadoExtracao.value = null
  cnh.value = emptyCnh()
  errors.value = {}
  erroCarregamento.value = false
  if (isCnh.value) loadMotorista()
}

function onHide() {
  loadVersion++
  carregando.value = false
  file.value = null
}

function marcarCampoEditado(name) {
  camposEditados.add(name)
  camposExtraidos.delete(name)
}

function cancelarExtracao() {
  extracaoController?.abort()
  extracaoController = null
  extraindo.value = false
  resultadoExtracao.value = null
}

function restaurarCamposExtraidos() {
  for (const [name, values] of camposExtraidos) {
    if (cnh.value[name] === values.extraido) cnh.value[name] = values.anterior
  }
  camposExtraidos.clear()
}

async function preencherDadosPdf(selectedFile) {
  cancelarExtracao()
  const controller = new AbortController()
  extracaoController = controller
  extraindo.value = true
  progressoExtracao.value = 'Lendo os dados da CNH…'
  const anteriores = { ...cnh.value }
  try {
    const { dados, temTexto, usouOcr } = await extrairCnhPdf(
      selectedFile,
      controller.signal,
      (message) => {
        if (extracaoController === controller && !controller.signal.aborted)
          progressoExtracao.value = message
      },
    )
    if (controller.signal.aborted || extracaoController !== controller) return
    let preenchidos = 0
    for (const [name, value] of Object.entries(dados)) {
      if (camposEditados.has(name) || cnh.value[name] !== anteriores[name]) continue
      camposExtraidos.set(name, { anterior: anteriores[name], extraido: value })
      cnh.value[name] = value
      preenchidos++
    }
    resultadoExtracao.value = {
      preenchidos,
      message: preenchidos
        ? `${preenchidos} ${preenchidos === 1 ? 'campo preenchido' : 'campos preenchidos'} a partir do PDF${usouOcr ? ' por leitura da imagem' : ''}. Confira os dados e complete o que faltar antes de enviar.`
        : usouOcr
          ? 'Não foi possível reconhecer os campos na imagem. Confira a prévia e preencha os dados manualmente.'
          : temTexto
            ? 'Nenhum campo foi reconhecido no texto deste PDF. Dados dentro de imagens precisam de OCR. Confira a prévia e preencha os campos manualmente.'
            : 'Este PDF não tem texto disponível para leitura automática. Preencha os dados manualmente usando a prévia.',
    }
  } catch (err) {
    if (controller.signal.aborted || extracaoController !== controller) return
    resultadoExtracao.value = {
      preenchidos: 0,
      message:
        err.name === 'PasswordException'
          ? 'O PDF está protegido por senha. Preencha os dados manualmente.'
          : err.message === 'PDF_PAGE_LIMIT'
            ? 'O PDF tem muitas páginas para leitura automática. Preencha os dados manualmente.'
            : 'Não foi possível ler os dados deste PDF. Você pode preencher os campos manualmente.',
    }
  } finally {
    if (extracaoController === controller) {
      extracaoController = null
      extraindo.value = false
    }
  }
}

async function loadMotorista() {
  const version = ++loadVersion
  carregando.value = true
  erroCarregamento.value = false
  try {
    const { data } = await api.get(`/motoristas/${props.motoristaId}`)
    if (version !== loadVersion) return
    for (const campo of camposCnh) {
      cnh.value[campo.name] =
        campo.type === 'date' ? (data[campo.name] || '').slice(0, 10) : data[campo.name] || ''
    }
    cnh.value.ear = data.ear == null ? null : !!Number(data.ear)
  } catch {
    if (version === loadVersion) erroCarregamento.value = true
  } finally {
    if (version === loadVersion) carregando.value = false
  }
}

function onRejected(rejections) {
  const reasons = new Set(rejections.map((item) => item.failedPropValidation))
  const message = reasons.has('max-file-size')
    ? 'O arquivo ultrapassa o limite de 2 MB.'
    : reasons.has('accept')
      ? 'Formato não permitido. Selecione um PDF, JPG ou PNG.'
      : reasons.has('duplicate')
        ? 'Este arquivo já está selecionado.'
        : 'Não foi possível selecionar o arquivo. Use um PDF, JPG ou PNG de até 2 MB.'
  $q.notify({ type: 'negative', message })
}

async function request() {
  if (
    !file.value ||
    !props.motoristaId ||
    enviando.value ||
    carregando.value ||
    extraindo.value ||
    erroCarregamento.value
  )
    return
  enviando.value = true
  errors.value = {}
  const data = new FormData()
  data.append('arquivo', file.value)
  data.append('motorista_id', props.motoristaId)
  data.append('tipo_documento', props.documento.tipo_documento)
  if (isCnh.value) {
    for (const [name, value] of Object.entries(cnh.value)) {
      data.append(`cnh[${name}]`, typeof value === 'boolean' ? (value ? '1' : '0') : (value ?? ''))
    }
  }
  try {
    const response = await api.post('/motorista-documentos', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    $q.notify({ type: 'positive', message: response.data.message })
    emit('updated')
    model.value = false
  } catch (err) {
    errors.value = err.response?.data?.errors || {}
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Não foi possível enviar o documento.',
    })
  } finally {
    enviando.value = false
  }
}
</script>

<style scoped>
.documento-dialog {
  width: 1280px;
  max-width: 95vw;
}
.dados-documento {
  max-height: 75vh;
  overflow-y: auto;
}
.carregamento-cnh {
  justify-content: flex-start;
  padding-top: 40px;
}
.previa-documento {
  border-left: 1px solid #ddd;
}
.pdf-preview,
.imagem-preview,
.previa-vazia {
  width: 100%;
  height: 66vh;
  min-height: 380px;
  border: 0;
}
.imagem-preview {
  overflow: auto;
}
.imagem-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.previa-vazia {
  text-align: center;
  padding: 24px;
}
@media (max-width: 1023px) {
  .dados-documento {
    max-height: none;
  }
  .previa-documento {
    border-left: 0;
    border-top: 1px solid #ddd;
  }
  .pdf-preview,
  .imagem-preview,
  .previa-vazia {
    height: 55vh;
    min-height: 300px;
  }
}
</style>
