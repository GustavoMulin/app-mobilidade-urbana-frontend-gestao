<template>
  <q-dialog v-model="model" @before-show="carregar" @hide="limpar">
    <q-card class="visualizar-documento column no-wrap" style="width: 900px; max-width: 95vw">
      <q-toolbar>
        <q-toolbar-title>
          {{ documento?.titulo }}
          <span v-if="nomeMotorista" class="text-caption text-grey-7"> · {{ nomeMotorista }}</span>
        </q-toolbar-title>
        <q-btn flat round dense icon="close" aria-label="Fechar" v-close-popup />
      </q-toolbar>

      <q-tabs
        v-if="documento?.verso?.url"
        v-model="lado"
        dense
        align="left"
        class="text-primary"
        @update:model-value="carregar"
      >
        <q-tab name="frente" label="Frente" />
        <q-tab name="verso" label="Verso" />
      </q-tabs>
      <q-separator />

      <q-card-section class="col visualizador">
        <div v-if="carregando" class="absolute-center column items-center text-primary">
          <q-spinner size="40px" />
          <span class="q-mt-sm">Carregando documento…</span>
        </div>
        <q-banner v-else-if="erro" class="bg-red-1 text-negative" rounded>
          Não foi possível abrir o documento.
          <template #action>
            <q-btn flat label="Tentar novamente" @click="carregar" />
          </template>
        </q-banner>
        <iframe
          v-else-if="ehPdf && arquivoUrl"
          :src="arquivoUrl"
          class="full-width full-height"
          title="Documento"
        />
        <img v-else-if="arquivoUrl" :src="arquivoUrl" class="imagem-documento" alt="Documento" />
      </q-card-section>

      <q-separator />
      <q-card-actions align="right" class="q-pa-md">
        <slot name="acoes" />
        <q-btn flat label="Fechar" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { api } from 'boot/axios'

const props = defineProps({
  modelValue: Boolean,
  documento: Object,
  nomeMotorista: String,
})
const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const lado = ref('frente')
const arquivoUrl = ref('')
const mimeAtual = ref('')
const carregando = ref(false)
const erro = ref(false)
let versao = 0

const ehPdf = computed(() => {
  const anexo = lado.value === 'verso' ? props.documento?.verso : props.documento
  return (mimeAtual.value || anexo?.mime_type || '').includes('pdf')
})

function revogar() {
  if (arquivoUrl.value) URL.revokeObjectURL(arquivoUrl.value)
  arquivoUrl.value = ''
}

async function carregar(novoLado) {
  if (typeof novoLado === 'string') lado.value = novoLado
  if (!props.documento?.id) return
  const minha = ++versao
  revogar()
  carregando.value = true
  erro.value = false
  try {
    const response = await api.get(`/motorista-documentos/${props.documento.id}/download`, {
      params: { lado: lado.value },
      responseType: 'blob',
      timeout: 30000,
    })
    if (minha !== versao) return
    mimeAtual.value = response.data.type
    arquivoUrl.value = URL.createObjectURL(response.data)
  } catch {
    if (minha === versao) erro.value = true
  } finally {
    if (minha === versao) carregando.value = false
  }
}

function limpar() {
  versao++
  revogar()
  lado.value = 'frente'
  carregando.value = false
  erro.value = false
}

onUnmounted(limpar)
</script>

<style scoped>
.visualizador {
  position: relative;
  height: 70vh;
  min-height: 320px;
  overflow: auto;
  background: #f5f5f5;
}
.imagem-documento {
  display: block;
  max-width: 100%;
  margin: 0 auto;
}
iframe {
  border: 0;
}
</style>
