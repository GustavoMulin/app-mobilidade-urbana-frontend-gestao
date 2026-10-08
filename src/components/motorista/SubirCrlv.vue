<template>
  <q-dialog v-model="model" persistent @before-show="iniciar" @hide="fechar">
    <q-card class="crlv-dialog">
      <q-toolbar>
        <q-toolbar-title class="text-weight-bold">{{
          documento?.status === 'reprovado' ? 'Reenviar CRLV' : 'CRLV do veículo'
        }}</q-toolbar-title>
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
      <q-form @submit.prevent="enviar">
        <div class="row">
          <section class="col-12 col-md-5 q-pa-lg dados-crlv">
            <div class="text-h6">Dados do CRLV</div>
            <p class="text-grey-7 q-mt-xs">
              Confira os dados com o documento ao lado antes de enviar.
            </p>
            <q-banner v-if="veiculo" class="bg-blue-1 q-mb-md" rounded>
              <strong>{{ veiculo.placa }} — {{ veiculo.marca }} {{ veiculo.modelo }}</strong>
              <div class="text-caption">
                RENAVAM: {{ veiculo.renavam }}<br />Chassi: {{ veiculo.chassi || 'Não cadastrado' }}
              </div>
            </q-banner>
            <q-banner v-else class="bg-blue-1 q-mb-md" rounded>
              Ao enviar o CRLV, o veículo será salvo e vinculado a este motorista. Ele aparecerá na
              lista de veículos com o status em análise até a aprovação do documento.
            </q-banner>
            <q-file
              v-model="arquivo"
              outlined
              clearable
              :label="anexoSalvoAtivo ? 'Arquivo atual' : 'Selecione o CRLV'"
              :readonly="anexoSalvoAtivo"
              :stack-label="anexoSalvoAtivo"
              :display-value="anexoSalvoAtivo ? nomeSalvo : undefined"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              :max-file-size="2097152"
              :disable="lendo || enviando"
              :rules="anexoSalvoAtivo ? undefined : [(v) => !!v || 'Selecione um arquivo']"
              :error="!!errors.arquivo"
              :error-message="errors.arquivo?.[0]"
              :hint="
                anexoSalvoAtivo
                  ? 'Remova o documento atual para selecionar um novo arquivo.'
                  : 'PDF, JPG ou PNG de até 2 MB'
              "
              @rejected="arquivoRejeitado"
            >
              <template #prepend><q-icon name="upload_file" /></template>
              <template v-if="anexoSalvoAtivo" #append
                ><q-btn
                  flat
                  dense
                  round
                  color="grey-6"
                  icon="cancel"
                  aria-label="Remover documento atual"
                  :disable="lendo || enviando"
                  @click.stop.prevent="removerAnexo"
                  ><q-tooltip>Remover documento atual</q-tooltip></q-btn
                ></template
              >
            </q-file>
            <div v-if="!anexoSalvoAtivo" class="text-caption text-grey-7 q-mt-sm">
              Para fotos, enquadre o documento inteiro, de frente, com boa iluminação e sem
              reflexos. Os textos e o QR Code devem estar legíveis.
            </div>
            <q-banner
              v-if="resultado && !lendo"
              role="status"
              rounded
              class="q-mt-md"
              :class="resultado.reconhecidos ? 'bg-blue-1 text-primary' : 'bg-amber-1'"
              >{{ resultado.mensagem }}</q-banner
            >
            <div
              role="group"
              aria-label="Campos do CRLV"
              :aria-busy="lendo"
              class="relative-position q-mt-md"
            >
              <div class="row q-col-gutter-md">
                <div
                  v-for="campo in campos"
                  :key="campo.name"
                  :class="campo.class || 'col-12 col-sm-6'"
                >
                  <q-input
                    v-model="dados[campo.name]"
                    @update:model-value="editados.add(campo.name)"
                    outlined
                    :label="campo.label"
                    :type="campo.type || 'text'"
                    :stack-label="campo.type === 'date'"
                    :autogrow="campo.type === 'textarea'"
                    :maxlength="campo.maxlength"
                    :disable="lendo || enviando"
                    :rules="campo.rules"
                    :hint="campo.hint"
                    :error="!!errors[`informacoes_complementares.${campo.name}`]"
                    :error-message="errors[`informacoes_complementares.${campo.name}`]?.[0]"
                    hide-bottom-space
                  />
                </div>
                <div v-if="documento?.status === 'reprovado'" class="col-12">
                  <q-input
                    outlined
                    readonly
                    type="textarea"
                    autogrow
                    label="Motivo da reprovação"
                    :model-value="documento.motivo_reprovacao_texto || 'Motivo não informado.'"
                  />
                </div>
              </div>
              <q-inner-loading v-if="lendo" showing
                ><div class="column items-center text-primary q-pa-md">
                  <q-spinner size="40px" />
                  <div class="q-mt-sm text-center" role="status">{{ progresso }}</div>
                </div></q-inner-loading
              >
            </div>
            <q-banner
              v-if="foto && !lendo"
              rounded
              class="bg-amber-1 q-mt-md"
              aria-label="Conferência da foto do CRLV"
            >
              <div class="text-subtitle2">Autenticidade não confirmada</div>
              <div class="q-mt-xs">
                A leitura da foto preenche os campos, mas não comprova a origem do documento. O CRLV
                será enviado para análise e precisa de conferência manual antes da aprovação.
              </div>
              <div v-for="item in verificacoes" :key="item.campo" class="q-mt-sm">
                <q-icon
                  :name="item.confere ? 'check_circle' : 'warning'"
                  :color="item.confere ? 'positive' : 'warning'"
                />
                {{ item.label }}: {{ item.mensagem }}
              </div>
            </q-banner>
            <div v-if="veiculo" class="q-mt-lg" aria-label="Conferência do veículo">
              <div class="text-subtitle2 q-mb-sm">Conferência com o cadastro</div>
              <div v-for="item in conferencia" :key="item.name" class="q-mb-sm">
                <q-icon
                  :name="
                    item.status === 'confere'
                      ? 'check_circle'
                      : item.status === 'divergente'
                        ? 'error'
                        : 'info'
                  "
                  :color="
                    item.status === 'confere'
                      ? 'positive'
                      : item.status === 'divergente'
                        ? 'negative'
                        : 'grey'
                  "
                />
                {{ item.name.toUpperCase() }}: {{ textosConferencia[item.status] }}
                <div v-if="item.status === 'divergente'" class="text-caption text-negative">
                  Cadastro: {{ item.cadastro }} · Documento: {{ item.documento }}
                </div>
              </div>
              <div class="text-caption text-grey-7">
                Confira a prévia antes de aprovar. A correspondência dos dados não confirma a
                autenticidade do documento.
              </div>
            </div>
          </section>
          <section class="col-12 col-md-7 q-pa-md bg-grey-2 previa-crlv">
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1 text-weight-medium">Prévia do documento</div>
              <q-space /><q-btn
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
              v-if="previewUrl && pdf"
              :src="previewUrl"
              title="Prévia do CRLV"
              class="crlv-preview"
            />
            <div v-else-if="previewUrl" class="crlv-preview flex flex-center">
              <img :src="previewUrl" alt="Prévia do CRLV" />
            </div>
            <div v-else class="crlv-preview column flex-center text-grey-7">
              <q-icon name="picture_as_pdf" size="64px" class="q-mb-md" /><span
                >Selecione um arquivo para visualizar a prévia.</span
              >
            </div>
          </section>
        </div>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md"
          ><q-btn flat label="Cancelar" :disable="enviando" v-close-popup /><q-btn
            color="primary"
            type="submit"
            label="Enviar"
            :loading="enviando"
            :disable="!arquivo || lendo || conferenciaInvalida"
        /></q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { extrairCrlv } from 'src/utils/extrairCrlv'
import { compararCrlv, conferirDadosCrlv } from 'src/utils/crlv'
const props = defineProps({
  modelValue: Boolean,
  motoristaId: [String, Number],
  documento: Object,
  veiculos: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'updated'])
const $q = useQuasar()
const model = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })
const dados = ref({}),
  arquivo = ref(null),
  veiculoId = ref(null),
  removido = ref(false),
  lendo = ref(false),
  enviando = ref(false),
  resultado = ref(null),
  errors = ref({}),
  progresso = ref('Lendo o CRLV…'),
  urlLocal = ref('')
const editados = new Set()
const extraidos = new Map()
let controller
const veiculo = computed(
  () =>
    props.veiculos.find((v) => v.id === veiculoId.value) ||
    (props.documento?.veiculo?.id === veiculoId.value ? props.documento.veiculo : null),
)
const anexoSalvoAtivo = computed(() => !removido.value && !!props.documento?.url)
const previewUrl = computed(
  () => urlLocal.value || (anexoSalvoAtivo.value ? props.documento.url : ''),
)
const pdf = computed(() =>
  arquivo.value
    ? arquivo.value.type === 'application/pdf' || /\.pdf$/i.test(arquivo.value.name)
    : anexoSalvoAtivo.value &&
      (props.documento.mime_type === 'application/pdf' ||
        props.documento.type === 'pdf' ||
        /\.pdf(?:[?#]|$)/i.test(props.documento.url)),
)
const nomeSalvo = computed(() => {
  if (props.documento?.name) return props.documento.name
  try {
    return (
      decodeURIComponent(new URL(props.documento.url).pathname.split('/').pop()) || 'CRLV salvo'
    )
  } catch {
    return 'CRLV salvo'
  }
})
const foto = computed(() => !!previewUrl.value && !pdf.value)
const verificacoes = computed(() => conferirDadosCrlv(dados.value))
const conferencia = computed(() => compararCrlv(veiculo.value, dados.value))
const conferenciaInvalida = computed(
  () =>
    !!veiculo.value &&
    conferencia.value.some((item) => ['divergente', 'nao_informado'].includes(item.status)),
)
const textosConferencia = {
  confere: 'Confere',
  divergente: 'Divergente',
  nao_cadastrado: 'Não cadastrado no veículo',
  nao_informado: 'Não informado no documento',
}
const obrigatorio = (v) => !!String(v || '').trim() || 'Campo obrigatório'
const obrigatorioCadastro = (v) => !!veiculoId.value || obrigatorio(v)
const campos = [
  { name: 'placa', label: 'Placa no CRLV', maxlength: 8, rules: [obrigatorio] },
  { name: 'renavam', label: 'RENAVAM no CRLV', maxlength: 11, rules: [obrigatorio] },
  { name: 'chassi', label: 'Chassi no CRLV', maxlength: 17, class: 'col-12', rules: [obrigatorio] },
  { name: 'numero_crv', label: 'Número do CRV', maxlength: 20 },
  { name: 'codigo_seguranca', label: 'Código de segurança do CLA', maxlength: 20 },
  { name: 'exercicio', label: 'Exercício do licenciamento', type: 'number', rules: [obrigatorio] },
  { name: 'data_emissao', label: 'Data de emissão', type: 'date' },
  { name: 'nome_proprietario', label: 'Nome do proprietário', class: 'col-12', maxlength: 255 },
  {
    name: 'cpf_cnpj_proprietario',
    label: 'CPF/CNPJ do proprietário',
    maxlength: 18,
    class: 'col-12',
  },
  {
    name: 'marca_modelo',
    label: 'Marca/modelo/versão no CRLV',
    class: 'col-12',
    maxlength: 255,
    rules: [obrigatorioCadastro],
    hint: 'Ex.: HYUNDAI/HB20 COMFORT',
  },
  {
    name: 'categoria_veiculo',
    label: 'Tipo do veículo',
    maxlength: 20,
    hint: 'carro, moto ou bicicleta',
    rules: [obrigatorioCadastro],
  },
  {
    name: 'ano_fabricacao',
    label: 'Ano de fabricação',
    type: 'number',
    rules: [obrigatorioCadastro],
  },
  { name: 'ano_modelo', label: 'Ano do modelo', type: 'number', rules: [obrigatorioCadastro] },
  { name: 'cor', label: 'Cor no CRLV', maxlength: 40, rules: [obrigatorioCadastro] },
  { name: 'categoria', label: 'Categoria no CRLV', maxlength: 60 },
  { name: 'uf', label: 'UF', maxlength: 2, rules: [obrigatorioCadastro] },
  {
    name: 'observacao',
    label: 'Observações do CRLV',
    type: 'textarea',
    class: 'col-12',
    maxlength: 5000,
  },
]
function cancelar() {
  controller?.abort()
  controller = null
  lendo.value = false
}
function limparUrl() {
  if (urlLocal.value) URL.revokeObjectURL(urlLocal.value)
  urlLocal.value = ''
}
function iniciar() {
  cancelar()
  arquivo.value = null
  limparUrl()
  removido.value = false
  errors.value = {}
  resultado.value = null
  editados.clear()
  extraidos.clear()
  veiculoId.value = props.documento?.veiculo_id || null
  dados.value = Object.fromEntries(
    campos.map((c) => [
      c.name,
      (Object.hasOwn(props.documento?.informacoes_complementares || {}, c.name)
        ? props.documento.informacoes_complementares[c.name]
        : props.documento?.veiculo?.[
            c.name === 'categoria'
              ? 'categoria_crlv'
              : c.name === 'categoria_veiculo'
                ? 'categoria'
                : c.name
          ]) ?? '',
    ]),
  )
}
function fechar() {
  cancelar()
  limparUrl()
  arquivo.value = null
}
function removerAnexo() {
  if (lendo.value || enviando.value) return
  removido.value = true
  errors.value = {}
}
function restaurarExtraidos() {
  for (const [name, { anterior, valor }] of extraidos) {
    if (!editados.has(name) && dados.value[name] === valor) dados.value[name] = anterior
  }
  extraidos.clear()
}
watch(arquivo, async (file) => {
  cancelar()
  limparUrl()
  restaurarExtraidos()
  resultado.value = null
  errors.value = {}
  if (!file) return
  removido.value = true
  urlLocal.value = URL.createObjectURL(file)
  const current = new AbortController()
  controller = current
  lendo.value = true
  const anteriores = { ...dados.value }
  try {
    const leitura = await extrairCrlv(file, current.signal, (message) => {
      if (controller === current) progresso.value = message
    })
    if (controller !== current || current.signal.aborted) return
    let preenchidos = 0
    for (const [name, value] of Object.entries(leitura.dados)) {
      const atual = dados.value[name] ?? ''
      const anterior = anteriores[name] ?? ''
      // Clearing a field must let the replacement file fill it again.
      // Keep nonempty manual corrections when the document is replaced.
      if ((!editados.has(name) || !String(atual).trim()) && atual === anterior) {
        extraidos.set(name, { anterior: anteriores[name], valor: value })
        editados.delete(name)
        dados.value[name] = value
        preenchidos++
      }
    }
    for (const name of leitura.conflitos || []) {
      if (!editados.has(name)) {
        extraidos.set(name, { anterior: anteriores[name], valor: '' })
        dados.value[name] = ''
      }
    }
    const reconhecidos = Object.keys(leitura.dados).length
    resultado.value = {
      preenchidos,
      reconhecidos,
      mensagem: leitura.conflitos?.length
        ? 'A leitura encontrou informações divergentes. Confira a prévia e preencha os campos em branco.'
        : preenchidos
          ? `${preenchidos} campos preenchidos a partir do ${leitura.usouOcr ? 'documento por leitura da imagem' : 'PDF'}. Confira os dados antes de enviar.`
          : reconhecidos
            ? `${reconhecidos} campos reconhecidos. Os dados que você editou foram mantidos. Confira os campos antes de enviar.`
            : 'Não foi possível reconhecer os campos. Confira o documento e preencha os dados manualmente.',
    }
  } catch {
    if (controller === current && !current.signal.aborted)
      resultado.value = {
        preenchidos: 0,
        reconhecidos: 0,
        mensagem: 'Não foi possível ler o CRLV. Confira a prévia e preencha os campos manualmente.',
      }
  } finally {
    if (controller === current) {
      controller = null
      lendo.value = false
    }
  }
})
onUnmounted(fechar)
function arquivoRejeitado(rejections) {
  $q.notify({
    type: 'negative',
    message: rejections.some(
      (r) => r.failedPropValidation === 'max-file-size' || r.failedPropValidation === 'maxFileSize',
    )
      ? 'O arquivo ultrapassa o limite de 2 MB.'
      : 'Selecione PDF, JPG ou PNG de até 2 MB.',
  })
}
async function enviar() {
  if (!arquivo.value || lendo.value || enviando.value || conferenciaInvalida.value) return
  enviando.value = true
  errors.value = {}
  const form = new FormData()
  form.append('arquivo', arquivo.value)
  form.append('motorista_id', props.motoristaId)
  form.append('tipo_documento', props.documento.tipo_documento)
  if (veiculoId.value) form.append('veiculo_id', veiculoId.value)
  for (const [name, value] of Object.entries(dados.value))
    form.append(`informacoes_complementares[${name}]`, value ?? '')
  try {
    const response = await api.post('/motorista-documentos', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    $q.notify({ type: 'positive', message: response.data.message })
    emit('updated')
    model.value = false
  } catch (error) {
    errors.value = error.response?.data?.errors || {}
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Não foi possível enviar o CRLV.',
    })
  } finally {
    enviando.value = false
  }
}
</script>

<style scoped>
.crlv-dialog {
  width: 1280px;
  max-width: 95vw;
}
.dados-crlv {
  max-height: 75vh;
  overflow-y: auto;
}
.previa-crlv {
  border-left: 1px solid #ddd;
}
.crlv-preview {
  width: 100%;
  height: 66vh;
  min-height: 380px;
  border: 0;
  overflow: auto;
}
.crlv-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
@media (max-width: 1023px) {
  .dados-crlv {
    max-height: none;
  }
  .previa-crlv {
    border-left: 0;
    border-top: 1px solid #ddd;
  }
  .crlv-preview {
    height: 55vh;
    min-height: 300px;
  }
}
</style>
