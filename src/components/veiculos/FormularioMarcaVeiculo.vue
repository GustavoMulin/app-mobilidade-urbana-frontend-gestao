<template>
  <q-dialog v-model="aberto" :persistent="salvando" @before-show="preparar">
    <q-card class="formulario-marca">
      <q-toolbar>
        <q-avatar rounded icon="sell" color="primary" text-color="white" />
        <q-toolbar-title class="text-weight-bold">{{ titulo }}</q-toolbar-title>
        <q-btn
          flat
          round
          dense
          icon="close"
          aria-label="Fechar formulário da marca"
          :disable="salvando"
          v-close-popup
        />
      </q-toolbar>
      <q-separator />

      <q-form @submit="salvar">
        <q-card-section class="q-gutter-md">
          <q-banner v-if="erroGeral" class="bg-red-1 text-negative" rounded role="alert">
            {{ erroGeral }}
          </q-banner>
          <q-input
            v-model="nome"
            dense
            outlined
            autofocus
            label="Nome da marca *"
            maxlength="60"
            :disable="salvando"
            :rules="[(val) => !!val?.trim() || 'Informe o nome da marca']"
            :error="!!erroNome"
            :error-message="erroNome"
          />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" :disable="salvando" v-close-popup />
          <q-btn
            color="primary"
            icon="save"
            type="submit"
            :label="marca ? 'Salvar alterações' : 'Cadastrar marca'"
            :loading="salvando"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const props = defineProps({
  modelValue: Boolean,
  // marca a renomear; vazio cadastra uma nova
  marca: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])
const $q = useQuasar()

const aberto = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})
const nome = ref('')
const salvando = ref(false)
const erroNome = ref('')
const erroGeral = ref('')
const titulo = computed(() => (props.marca ? 'Editar marca' : 'Nova marca'))

function preparar() {
  nome.value = props.marca?.nome ?? ''
  erroNome.value = ''
  erroGeral.value = ''
}

async function salvar() {
  salvando.value = true
  erroNome.value = ''
  erroGeral.value = ''
  const dados = { nome: nome.value.trim() }
  try {
    const { data } = props.marca
      ? await api.put(`/marcas-veiculos/${props.marca.id}`, dados)
      : await api.post('/marcas-veiculos', dados)
    $q.notify({ type: 'positive', message: data.message })
    emit('saved', data.data)
    aberto.value = false
  } catch (error) {
    erroNome.value = error.response?.data?.errors?.nome?.[0] || ''
    if (!erroNome.value) {
      erroGeral.value = error.response?.data?.message || 'Não foi possível salvar a marca.'
    }
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
.formulario-marca {
  width: 420px;
  max-width: 95vw;
}
</style>
