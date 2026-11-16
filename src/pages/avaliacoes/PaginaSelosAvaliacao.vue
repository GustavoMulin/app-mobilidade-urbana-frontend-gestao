<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="cabecalho q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar
          rounded
          size="52px"
          color="blue-1"
          text-color="primary"
          icon="workspace_premium"
        />
        <div class="col">
          <div class="text-caption text-grey-7">Configurações · Avaliações</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Selos de avaliação</h1>
          <div class="text-grey-7 q-mt-xs">
            Os selos que passageiros e motoristas escolhem ao se avaliar no fim da corrida.
          </div>
        </div>
        <q-btn color="primary" no-caps icon="add" label="Novo selo" @click="abrirNovo" />
      </q-card-section>
    </q-card>

    <q-tabs
      v-model="alvo"
      align="left"
      class="q-mb-md"
      active-color="primary"
      indicator-color="primary"
      no-caps
    >
      <q-tab name="motorista" label="Selos do motorista" />
      <q-tab name="passageiro" label="Selos do passageiro" />
    </q-tabs>
    <p class="text-grey-7">
      {{
        alvo === 'motorista'
          ? 'O passageiro escolhe estes selos para elogiar o motorista. Aparecem no perfil do motorista em "Minhas avaliações positivas".'
          : 'O motorista escolhe estes selos para elogiar o passageiro.'
      }}
      Nos aplicativos aparece a imagem enviada; sem ela, a imagem da URL; sem as duas, o emoji.
    </p>

    <div v-if="carregando" class="text-center q-pa-xl" role="status">
      <q-spinner color="primary" size="36px" />
    </div>
    <q-banner v-else-if="erro" rounded class="bg-red-1 text-negative">
      {{ erro }}
      <template #action><q-btn flat label="Tentar novamente" @click="carregar" /></template>
    </q-banner>

    <q-card v-else flat bordered class="cartao">
      <q-list separator>
        <q-item v-for="selo in doAlvo" :key="selo.id" :class="{ inativo: !selo.ativo }">
          <q-item-section avatar>
            <div class="emoji">
              <img v-if="selo.imagem" :src="selo.imagem" :alt="selo.titulo" class="figura" />
              <span v-else>{{ selo.icone }}</span>
            </div>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ selo.titulo }}</q-item-label>
            <q-item-label caption>{{ selo.descricao || 'Sem descrição' }}</q-item-label>
            <q-item-label caption>
              Ordem {{ selo.ordem }} ·
              {{ selo.vezes_usado === 1 ? 'recebido 1 vez' : `recebido ${selo.vezes_usado} vezes` }}
              · {{ origemDaImagem(selo) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row items-center no-wrap">
              <q-toggle
                :model-value="selo.ativo"
                :label="selo.ativo ? 'Ativo' : 'Desativado'"
                @update:model-value="(v) => alternar(selo, v)"
              />
              <q-btn flat round icon="edit" aria-label="Editar" @click="abrirEdicao(selo)" />
              <q-btn
                flat
                round
                color="negative"
                icon="delete"
                aria-label="Excluir"
                @click="pedirExclusao(selo)"
              />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="doAlvo.length === 0">
          <q-item-section class="text-grey-7">
            Nenhum selo cadastrado para este perfil.
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-dialog v-model="dialogo" persistent>
      <q-card class="dialogo">
        <q-card-section>
          <div class="text-h6">{{ form.id ? 'Editar selo' : 'Novo selo' }}</div>
          <div class="text-caption text-grey-7">
            {{
              form.id
                ? ''
                : `Para o ${form.perfil_alvo === 'motorista' ? 'motorista' : 'passageiro'} receber.`
            }}
          </div>
        </q-card-section>
        <q-form @submit.prevent="salvar">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="form.titulo"
              outlined
              label="Texto do selo"
              maxlength="60"
              :rules="[regraTitulo]"
              autofocus
            />
            <q-input
              v-model="form.descricao"
              outlined
              label="Descrição (opcional)"
              maxlength="200"
              autogrow
            />

            <div class="bloco-imagem">
              <div class="text-subtitle2 q-mb-sm">Imagem do selo</div>
              <div class="row items-center q-gutter-md no-wrap">
                <div class="previa">
                  <img v-if="previa" :src="previa" alt="Pré-visualização" class="figura" />
                  <span v-else class="text-h4">{{ form.icone || '⭐' }}</span>
                </div>
                <div class="col">
                  <q-file
                    v-model="form.arquivo"
                    outlined
                    dense
                    clearable
                    accept="image/png,image/jpeg,image/webp"
                    max-file-size="3145728"
                    label="Enviar imagem (PNG, JPG ou WebP, até 3 MB)"
                    @rejected="arquivoRecusado"
                  >
                    <template #prepend><q-icon name="upload" /></template>
                  </q-file>
                  <q-checkbox
                    v-if="form.imagem_enviada && !form.arquivo"
                    v-model="form.remover_imagem"
                    dense
                    class="q-mt-sm"
                    label="Remover a imagem enviada"
                  />
                </div>
              </div>
              <q-input
                v-model="form.imagem_url"
                outlined
                dense
                class="q-mt-md"
                label="URL da imagem (usada se não houver imagem enviada)"
                maxlength="500"
                :rules="[regraUrl]"
                hint="Começa com http:// ou https://"
              />
            </div>

            <div>
              <q-input
                v-model="form.icone"
                outlined
                label="Emoji (aparece se não houver imagem)"
                maxlength="16"
              />
              <div class="sugestoes q-mt-sm">
                <q-btn
                  v-for="emoji in SUGESTOES"
                  :key="emoji"
                  flat
                  dense
                  no-caps
                  :label="emoji"
                  class="sugestao"
                  :aria-label="`Usar ${emoji}`"
                  @click="form.icone = emoji"
                />
              </div>
            </div>
            <q-input
              v-model.number="form.ordem"
              type="number"
              outlined
              label="Ordem"
              min="0"
              max="999"
              hint="Menor aparece primeiro"
            />
            <q-toggle v-model="form.ativo" label="Ativo (aparece nos aplicativos)" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat no-caps label="Cancelar" :disable="salvando" @click="dialogo = false" />
            <q-btn type="submit" color="primary" no-caps label="Salvar" :loading="salvando" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmando">
      <q-card class="dialogo">
        <q-card-section>
          <div class="text-h6">Excluir selo?</div>
          <p class="q-mt-sm q-mb-none">
            "{{ paraExcluir?.titulo }}" será removido. Se já foi recebido em alguma avaliação, a
            gestão não deixa excluir: desative o selo.
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn color="negative" no-caps label="Excluir" :loading="excluindo" @click="excluir" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()
const SUGESTOES = [
  '🌟',
  '👍',
  '🤝',
  '🙏',
  '💬',
  '🎵',
  '🚗',
  '✨',
  '🗺️',
  '🍬',
  '🦸',
  '😌',
  '⏰',
  '📍',
  '💵',
  '🛡️',
  '❤️',
  '😊',
]

const carregando = ref(false)
const erro = ref('')
const selos = ref([])
const alvo = ref('motorista')
const dialogo = ref(false)
const salvando = ref(false)
const confirmando = ref(false)
const excluindo = ref(false)
const paraExcluir = ref(null)
const form = reactive({
  id: null,
  perfil_alvo: 'motorista',
  titulo: '',
  descricao: '',
  icone: '',
  ordem: 0,
  ativo: true,
  arquivo: null,
  imagem_url: '',
  imagem_atual: null,
  imagem_enviada: false,
  remover_imagem: false,
})

const doAlvo = computed(() => selos.value.filter((s) => s.perfil_alvo === alvo.value))
const regraTitulo = (v) =>
  (!!v && v.trim().length >= 2) || 'Informe o texto do selo (mínimo 2 letras)'
const regraUrl = (v) =>
  !v || /^https?:\/\/\S+$/i.test(v.trim()) || 'Informe uma URL começando com http:// ou https://'

// pré-visualização: o arquivo escolhido; senão a imagem enviada que já existe (se não for removida);
// senão a URL digitada
const urlDoArquivo = ref(null)
watch(
  () => form.arquivo,
  (arquivo) => {
    if (urlDoArquivo.value) URL.revokeObjectURL(urlDoArquivo.value)
    urlDoArquivo.value = arquivo ? URL.createObjectURL(arquivo) : null
  },
)
onBeforeUnmount(() => {
  if (urlDoArquivo.value) URL.revokeObjectURL(urlDoArquivo.value)
})
const previa = computed(() => {
  if (urlDoArquivo.value) return urlDoArquivo.value
  if (form.imagem_enviada && !form.remover_imagem) return form.imagem_atual
  return /^https?:\/\/\S+$/i.test((form.imagem_url || '').trim()) ? form.imagem_url.trim() : null
})

const origemDaImagem = (selo) =>
  selo.imagem_enviada ? 'imagem enviada' : selo.imagem_url ? 'imagem por URL' : 'só emoji'

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    selos.value = (await api.get('/selos-avaliacao')).data.data
  } catch (e) {
    erro.value = e.response?.data?.message || 'Não foi possível carregar os selos.'
  } finally {
    carregando.value = false
  }
}

function abrirNovo() {
  Object.assign(form, {
    id: null,
    perfil_alvo: alvo.value,
    titulo: '',
    descricao: '',
    icone: '',
    ordem: Math.max(0, ...doAlvo.value.map((s) => s.ordem)) + 1,
    ativo: true,
    arquivo: null,
    imagem_url: '',
    imagem_atual: null,
    imagem_enviada: false,
    remover_imagem: false,
  })
  dialogo.value = true
}

function abrirEdicao(selo) {
  Object.assign(form, {
    id: selo.id,
    perfil_alvo: selo.perfil_alvo,
    titulo: selo.titulo,
    descricao: selo.descricao || '',
    icone: selo.icone,
    ordem: selo.ordem,
    ativo: selo.ativo,
    arquivo: null,
    imagem_url: selo.imagem_url || '',
    imagem_atual: selo.imagem_enviada ? selo.imagem : null,
    imagem_enviada: selo.imagem_enviada,
    remover_imagem: false,
  })
  dialogo.value = true
}

function arquivoRecusado(entradas) {
  const motivo = entradas?.[0]?.failedPropValidation
  $q.notify({
    type: 'negative',
    message:
      motivo === 'max-file-size' ? 'A imagem passa de 3 MB.' : 'Use uma imagem PNG, JPG ou WebP.',
  })
}

function mensagemDoErro(e, padrao) {
  const erros = e.response?.data?.errors
  return (erros && Object.values(erros)[0]?.[0]) || e.response?.data?.message || padrao
}

async function salvar() {
  salvando.value = true
  try {
    // multipart: leva o arquivo junto; editar é POST com _method=PUT
    const corpo = new FormData()
    corpo.append('titulo', form.titulo.trim())
    corpo.append('descricao', form.descricao?.trim() || '')
    corpo.append('icone', form.icone?.trim() || '⭐')
    corpo.append('ordem', String(form.ordem ?? 0))
    corpo.append('ativo', form.ativo ? '1' : '0')
    corpo.append('imagem_url', form.imagem_url?.trim() || '')
    if (form.arquivo) corpo.append('imagem', form.arquivo)
    if (form.id) {
      if (form.remover_imagem && !form.arquivo) corpo.append('remover_imagem', '1')
      corpo.append('_method', 'PUT')
      await api.post(`/selos-avaliacao/${form.id}`, corpo)
    } else {
      corpo.append('perfil_alvo', form.perfil_alvo)
      await api.post('/selos-avaliacao', corpo)
    }
    dialogo.value = false
    $q.notify({ type: 'positive', message: 'Selo salvo.' })
    await carregar()
  } catch (e) {
    $q.notify({ type: 'negative', message: mensagemDoErro(e, 'Não foi possível salvar o selo.') })
  } finally {
    salvando.value = false
  }
}

async function alternar(selo, ativo) {
  try {
    await api.put(`/selos-avaliacao/${selo.id}`, { ativo })
    selo.ativo = ativo
  } catch (e) {
    $q.notify({ type: 'negative', message: mensagemDoErro(e, 'Não foi possível alterar o selo.') })
  }
}

function pedirExclusao(selo) {
  paraExcluir.value = selo
  confirmando.value = true
}

async function excluir() {
  excluindo.value = true
  try {
    await api.delete(`/selos-avaliacao/${paraExcluir.value.id}`)
    confirmando.value = false
    $q.notify({ type: 'positive', message: 'Selo excluído.' })
    await carregar()
  } catch (e) {
    confirmando.value = false
    $q.notify({ type: 'negative', message: mensagemDoErro(e, 'Não foi possível excluir o selo.') })
  } finally {
    excluindo.value = false
  }
}

onMounted(carregar)
</script>

<style scoped>
.cabecalho,
.cartao {
  border-radius: 14px;
}
.emoji,
.previa {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  overflow: hidden;
  flex: none;
}
.figura {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.previa {
  width: 72px;
  height: 72px;
}
.bloco-imagem {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
}
.inativo {
  opacity: 0.55;
}
.dialogo {
  width: 520px;
  max-width: 92vw;
}
.sugestoes {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.sugestao {
  font-size: 20px;
  min-width: 38px;
}
</style>
