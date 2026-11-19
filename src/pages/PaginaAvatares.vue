<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="cabecalho q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar rounded size="52px" color="blue-1" text-color="primary" icon="face" />
        <div class="col">
          <div class="text-caption text-grey-7">Configurações</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Avatares</h1>
          <div class="text-grey-7 q-mt-xs">
            O passageiro pode escolher um avatar no lugar da foto, como nos perfis da Netflix. No
            aplicativo aparece só a imagem (o nome serve para você se organizar): a enviada; sem
            ela, a da URL.
          </div>
        </div>
        <q-btn color="primary" no-caps icon="add" label="Novo avatar" @click="abrirNovo" />
      </q-card-section>
    </q-card>

    <div v-if="carregando" class="text-center q-pa-xl" role="status">
      <q-spinner color="primary" size="36px" />
    </div>
    <q-banner v-else-if="erro" rounded class="bg-red-1 text-negative">
      {{ erro }}
      <template #action><q-btn flat label="Tentar novamente" @click="carregar" /></template>
    </q-banner>

    <template v-else>
      <q-card v-if="colecoes.length === 0" flat bordered class="cartao q-pa-lg text-grey-7">
        Nenhum avatar cadastrado.
      </q-card>

      <section v-for="colecao in colecoes" :key="colecao.nome" class="q-mb-lg">
        <div class="text-subtitle1 text-weight-bold q-mb-sm">
          {{ colecao.nome }}
          <span class="text-caption text-grey-7">· {{ colecao.itens.length }}</span>
        </div>
        <div class="grade">
          <q-card
            v-for="avatar in colecao.itens"
            :key="avatar.id"
            flat
            bordered
            class="item"
            :class="{ inativo: !avatar.ativo }"
          >
            <div class="figura-caixa">
              <img :src="avatar.imagem" :alt="avatar.titulo" class="figura" />
            </div>
            <div class="q-px-sm q-pt-sm text-weight-medium ellipsis">{{ avatar.titulo }}</div>
            <div class="q-px-sm text-caption text-grey-7">
              {{ origemDaImagem(avatar) }}
            </div>
            <div class="q-px-sm text-caption text-grey-7">
              {{ avatar.em_uso === 1 ? '1 pessoa usa' : `${avatar.em_uso} pessoas usam` }}
            </div>
            <div class="row items-center no-wrap q-pa-xs">
              <q-toggle
                dense
                :model-value="avatar.ativo"
                :label="avatar.ativo ? 'Ativo' : 'Desativado'"
                @update:model-value="(v) => alternar(avatar, v)"
              />
              <q-space />
              <q-btn
                flat
                round
                dense
                icon="edit"
                aria-label="Editar"
                @click="abrirEdicao(avatar)"
              />
              <q-btn
                flat
                round
                dense
                color="negative"
                icon="delete"
                aria-label="Excluir"
                @click="pedirExclusao(avatar)"
              />
            </div>
          </q-card>
        </div>
      </section>
    </template>

    <q-dialog v-model="dialogo" persistent>
      <q-card class="dialogo">
        <q-card-section>
          <div class="text-h6">{{ form.id ? 'Editar avatar' : 'Novo avatar' }}</div>
        </q-card-section>
        <q-form @submit.prevent="salvar">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="form.titulo"
              outlined
              label="Nome do avatar"
              maxlength="60"
              :rules="[regraTitulo]"
              autofocus
            />
            <q-select
              v-model="form.colecao"
              outlined
              use-input
              hide-selected
              fill-input
              new-value-mode="add-unique"
              input-debounce="0"
              label="Coleção (opcional)"
              hint="Agrupa os avatares na escolha. Digite para criar uma nova."
              :options="opcoesDeColecao"
              clearable
              @filter="filtrarColecoes"
              @input-value="(v) => (form.colecao = v)"
            />
            <div class="bloco-imagem">
              <div class="text-subtitle2 q-mb-sm">Imagem do avatar</div>
              <div class="row items-center q-gutter-md no-wrap">
                <div class="previa">
                  <img v-if="previa" :src="previa" alt="Pré-visualização" class="figura" />
                  <q-icon v-else name="image" size="32px" color="grey-5" />
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
                    :rules="[regraImagem]"
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

            <q-input
              v-model.number="form.ordem"
              type="number"
              outlined
              label="Ordem"
              min="0"
              max="999"
              hint="Menor aparece primeiro dentro da coleção"
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
          <div class="text-h6">Excluir avatar?</div>
          <p class="q-mt-sm q-mb-none">
            "{{ paraExcluir?.titulo }}" será removido. Se alguém já usa este avatar, a gestão não
            deixa excluir: desative o avatar.
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
const SEM_COLECAO = 'Sem coleção'

const carregando = ref(false)
const erro = ref('')
const avatares = ref([])
const dialogo = ref(false)
const salvando = ref(false)
const confirmando = ref(false)
const excluindo = ref(false)
const paraExcluir = ref(null)
const opcoesDeColecao = ref([])
const form = reactive({
  id: null,
  titulo: '',
  colecao: null,
  ordem: 0,
  ativo: true,
  arquivo: null,
  imagem_url: '',
  imagem_atual: null,
  imagem_enviada: false,
  remover_imagem: false,
})

const origemDaImagem = (avatar) => (avatar.imagem_enviada ? 'imagem enviada' : 'imagem por URL')

const colecoes = computed(() => {
  const grupos = new Map()
  for (const avatar of avatares.value) {
    const nome = avatar.colecao || SEM_COLECAO
    if (!grupos.has(nome)) grupos.set(nome, [])
    grupos.get(nome).push(avatar)
  }
  return [...grupos.entries()].map(([nome, itens]) => ({ nome, itens }))
})
const nomesDeColecao = computed(() => [
  ...new Set(avatares.value.map((a) => a.colecao).filter(Boolean)),
])

function filtrarColecoes(texto, atualizar) {
  atualizar(() => {
    const busca = texto.trim().toLowerCase()
    opcoesDeColecao.value = nomesDeColecao.value.filter((n) => n.toLowerCase().includes(busca))
  })
}

const regraTitulo = (v) =>
  (!!v && v.trim().length >= 2) || 'Informe o nome do avatar (mínimo 2 letras)'
// precisa de arquivo (novo ou já enviado) ou de uma URL
const regraImagem = () =>
  !!form.arquivo ||
  (form.imagem_enviada && !form.remover_imagem) ||
  !!(form.imagem_url || '').trim() ||
  'Envie uma imagem ou informe uma URL'
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

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    avatares.value = (await api.get('/avatares')).data.data
  } catch (e) {
    erro.value = e.response?.data?.message || 'Não foi possível carregar os avatares.'
  } finally {
    carregando.value = false
  }
}

function abrirNovo() {
  Object.assign(form, {
    id: null,
    titulo: '',
    colecao: null,
    ordem: Math.max(0, ...avatares.value.map((a) => a.ordem)) + 1,
    ativo: true,
    arquivo: null,
    imagem_url: '',
    imagem_atual: null,
    imagem_enviada: false,
    remover_imagem: false,
  })
  dialogo.value = true
}

function abrirEdicao(avatar) {
  Object.assign(form, {
    id: avatar.id,
    titulo: avatar.titulo,
    colecao: avatar.colecao,
    ordem: avatar.ordem,
    ativo: avatar.ativo,
    arquivo: null,
    imagem_url: avatar.imagem_url || '',
    imagem_atual: avatar.imagem_enviada ? avatar.imagem : null,
    imagem_enviada: avatar.imagem_enviada,
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
    corpo.append('colecao', form.colecao?.trim() || '')
    corpo.append('ordem', String(form.ordem ?? 0))
    corpo.append('ativo', form.ativo ? '1' : '0')
    corpo.append('imagem_url', form.imagem_url?.trim() || '')
    if (form.arquivo) corpo.append('imagem', form.arquivo)
    if (form.id) {
      if (form.remover_imagem && !form.arquivo) corpo.append('remover_imagem', '1')
      corpo.append('_method', 'PUT')
      await api.post(`/avatares/${form.id}`, corpo)
    } else {
      await api.post('/avatares', corpo)
    }
    dialogo.value = false
    $q.notify({ type: 'positive', message: 'Avatar salvo.' })
    await carregar()
  } catch (e) {
    $q.notify({ type: 'negative', message: mensagemDoErro(e, 'Não foi possível salvar o avatar.') })
  } finally {
    salvando.value = false
  }
}

async function alternar(avatar, ativo) {
  try {
    await api.put(`/avatares/${avatar.id}`, { ativo })
    avatar.ativo = ativo
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: mensagemDoErro(e, 'Não foi possível alterar o avatar.'),
    })
  }
}

function pedirExclusao(avatar) {
  paraExcluir.value = avatar
  confirmando.value = true
}

async function excluir() {
  excluindo.value = true
  try {
    await api.delete(`/avatares/${paraExcluir.value.id}`)
    confirmando.value = false
    $q.notify({ type: 'positive', message: 'Avatar excluído.' })
    await carregar()
  } catch (e) {
    confirmando.value = false
    $q.notify({
      type: 'negative',
      message: mensagemDoErro(e, 'Não foi possível excluir o avatar.'),
    })
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
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}
.item {
  border-radius: 14px;
  overflow: hidden;
}
.figura-caixa,
.previa {
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.figura-caixa {
  aspect-ratio: 1;
}
.previa {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  flex: none;
}
.figura {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
</style>
