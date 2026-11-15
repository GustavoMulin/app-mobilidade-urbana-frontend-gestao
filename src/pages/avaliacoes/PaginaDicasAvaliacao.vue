<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="cabecalho q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar rounded size="52px" color="blue-1" text-color="primary" icon="tips_and_updates" />
        <div class="col">
          <div class="text-caption text-grey-7">Configurações · Avaliações</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">
            Dicas para ter mais avaliações positivas
          </h1>
          <div class="text-grey-7 q-mt-xs">
            As dicas que o motorista vê no perfil, em "Como ter mais avaliações positivas?".
          </div>
        </div>
        <q-btn color="primary" no-caps icon="add" label="Nova dica" @click="abrirNova" />
      </q-card-section>
    </q-card>

    <div v-if="carregando" class="text-center q-pa-xl" role="status">
      <q-spinner color="primary" size="36px" />
    </div>
    <q-banner v-else-if="erro" rounded class="bg-red-1 text-negative">
      {{ erro }}
      <template #action><q-btn flat label="Tentar novamente" @click="carregar" /></template>
    </q-banner>

    <q-card v-else flat bordered class="cartao">
      <q-list separator>
        <q-item v-for="dica in dicas" :key="dica.id" :class="{ inativa: !dica.ativo }">
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ dica.titulo }}</q-item-label>
            <q-item-label caption lines="3">{{ dica.texto }}</q-item-label>
            <q-item-label caption>Ordem {{ dica.ordem }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row items-center no-wrap">
              <q-toggle
                :model-value="dica.ativo"
                :label="dica.ativo ? 'Ativa' : 'Desativada'"
                @update:model-value="(v) => alternar(dica, v)"
              />
              <q-btn flat round icon="edit" aria-label="Editar" @click="abrirEdicao(dica)" />
              <q-btn
                flat
                round
                color="negative"
                icon="delete"
                aria-label="Excluir"
                @click="pedirExclusao(dica)"
              />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="dicas.length === 0">
          <q-item-section class="text-grey-7">Nenhuma dica cadastrada.</q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-dialog v-model="dialogo" persistent>
      <q-card class="dialogo">
        <q-card-section>
          <div class="text-h6">{{ form.id ? 'Editar dica' : 'Nova dica' }}</div>
        </q-card-section>
        <q-form @submit.prevent="salvar">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="form.titulo"
              outlined
              label="Título"
              maxlength="80"
              :rules="[regra]"
              autofocus
            />
            <q-input
              v-model="form.texto"
              outlined
              type="textarea"
              label="Texto"
              maxlength="300"
              counter
              autogrow
              :rules="[regra]"
            />
            <q-input
              v-model.number="form.ordem"
              type="number"
              outlined
              label="Ordem"
              min="0"
              max="999"
              hint="Menor aparece primeiro"
            />
            <q-toggle v-model="form.ativo" label="Ativa (aparece no app do motorista)" />
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
          <div class="text-h6">Excluir dica?</div>
          <p class="q-mt-sm q-mb-none">
            "{{ paraExcluir?.titulo }}" deixa de aparecer no app do motorista.
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
import { onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()
const carregando = ref(false)
const erro = ref('')
const dicas = ref([])
const dialogo = ref(false)
const salvando = ref(false)
const confirmando = ref(false)
const excluindo = ref(false)
const paraExcluir = ref(null)
const form = reactive({ id: null, titulo: '', texto: '', ordem: 0, ativo: true })

const regra = (v) => (!!v && v.trim().length >= 2) || 'Preencha este campo (mínimo 2 letras)'

function mensagemDoErro(e, padrao) {
  const erros = e.response?.data?.errors
  return (erros && Object.values(erros)[0]?.[0]) || e.response?.data?.message || padrao
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    dicas.value = (await api.get('/dicas-avaliacao')).data.data
  } catch (e) {
    erro.value = e.response?.data?.message || 'Não foi possível carregar as dicas.'
  } finally {
    carregando.value = false
  }
}

function abrirNova() {
  Object.assign(form, {
    id: null,
    titulo: '',
    texto: '',
    ordem: Math.max(0, ...dicas.value.map((d) => d.ordem)) + 1,
    ativo: true,
  })
  dialogo.value = true
}

function abrirEdicao(dica) {
  Object.assign(form, {
    id: dica.id,
    titulo: dica.titulo,
    texto: dica.texto,
    ordem: dica.ordem,
    ativo: dica.ativo,
  })
  dialogo.value = true
}

async function salvar() {
  salvando.value = true
  try {
    const corpo = {
      titulo: form.titulo.trim(),
      texto: form.texto.trim(),
      ordem: form.ordem,
      ativo: form.ativo,
    }
    if (form.id) await api.put(`/dicas-avaliacao/${form.id}`, corpo)
    else await api.post('/dicas-avaliacao', corpo)
    dialogo.value = false
    $q.notify({ type: 'positive', message: 'Dica salva.' })
    await carregar()
  } catch (e) {
    $q.notify({ type: 'negative', message: mensagemDoErro(e, 'Não foi possível salvar a dica.') })
  } finally {
    salvando.value = false
  }
}

async function alternar(dica, ativo) {
  try {
    await api.put(`/dicas-avaliacao/${dica.id}`, { ativo })
    dica.ativo = ativo
  } catch (e) {
    $q.notify({ type: 'negative', message: mensagemDoErro(e, 'Não foi possível alterar a dica.') })
  }
}

function pedirExclusao(dica) {
  paraExcluir.value = dica
  confirmando.value = true
}

async function excluir() {
  excluindo.value = true
  try {
    await api.delete(`/dicas-avaliacao/${paraExcluir.value.id}`)
    confirmando.value = false
    $q.notify({ type: 'positive', message: 'Dica excluída.' })
    await carregar()
  } catch (e) {
    confirmando.value = false
    $q.notify({ type: 'negative', message: mensagemDoErro(e, 'Não foi possível excluir a dica.') })
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
.inativa {
  opacity: 0.55;
}
.dialogo {
  width: 460px;
  max-width: 92vw;
}
</style>
