<template>
  <q-dialog v-model="model" @before-show="onBeforeShow">
    <q-card style="width: 700px; max-width: 80vw">
      <!-- HEADER -->
      <q-toolbar>
        <!-- <q-avatar icon="add_box" size="40px" color="primary" text-color="white" /> -->
        <q-toolbar-title>
          <span class="text-weight-bold">Criação de veículo</span>
        </q-toolbar-title>

        <q-btn flat round dense icon="close" v-close-popup />
      </q-toolbar>

      <q-separator />

      <!-- CONTENT -->
      <q-form @submit.prevent="onSubmit">
        <div class="row">
          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.marca" label="Marca *" />
          </div>

          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.modelo" label="Modelo *" />
          </div>

          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.ano_fabricacao" label="Ano fabricação *" />
          </div>

          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.ano_modelo" label="Ano modelo *" />
          </div>

          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.cor" label="cor *" />
          </div>

          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.placa" label="placa *" />
          </div>

          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.renavam" label="Renavam *" />
          </div>
          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.chassi" label="Chassi" maxlength="17" />
          </div>

          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.categoria" label="Categoria *" />
          </div>

          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.uf" label="UF *" />
          </div>

          <div class="col-md-6 col-12 q-px-md q-py-sm">
            <q-input dense outlined v-model="veiculo.status" label="Status *" />
          </div>
        </div>

        <div align="right" class="q-pa-md">
          <q-btn
            label="DADOS FAKE"
            flat
            dense
            :loading="loading"
            class="q-mr-md"
            @click="preecherDados"
          />

          <q-btn
            color="primary"
            dense
            icon="save"
            label="CRIAR VEÍCULO"
            :loading="loading"
            type="submit"
          />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

// PROPS
const props = defineProps({
  modelValue: Boolean,
  veiculoId: [String, Number],
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
const veiculo = reactive({
  marca: '',
  modelo: '',
  ano_fabricacao: '',
  ano_modelo: '',
  cor: '',
  placa: '',
  renavam: '',
  chassi: '',
  categoria: '',
  status: '',
  uf: '',
})

const loading = ref(false)

async function onBeforeShow() {
  limparForm()
}

function preecherDados() {
  Object.assign(veiculo, {
    marca: 'Ford',
    modelo: 'Fusion',
    ano_fabricacao: 2020,
    ano_modelo: 2020,
    cor: 'preto',
    placa: 'GCH9110',
    renavam: '99231234567',
    categoria: 'negocia',
    status: 'ativo',
    uf: 'RO',
  })
}

function onSubmit() {
  create()
}

function limparForm() {
  Object.assign(veiculo, {
    marca: '',
    modelo: '',
    ano_fabricacao: '',
    ano_modelo: '',
    cor: '',
    placa: '',
    renavam: '',
    chassi: '',
    categoria: '',
    status: '',
    uf: '',
  })
}

async function create() {
  model.value = true
  loading.value = true
  try {
    const response = await api.post(`/veiculos`, {
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano_fabricacao: veiculo.ano_fabricacao,
      ano_modelo: veiculo.ano_modelo,
      cor: veiculo.cor,
      placa: veiculo.placa,
      renavam: veiculo.renavam,
      chassi: veiculo.chassi.trim().toUpperCase() || null,
      categoria: veiculo.categoria,
      status: veiculo.status,
      uf: veiculo.uf,
    })
    console.log(response, 'response')
    emit('onRequest')
    $q.notify({ type: 'positive', message: response.data.message })
  } catch (err) {
    console.log(err, 'err')
    model.value = false
    loading.value = false
    $q.notify({ type: 'negative', message: err.message })
  } finally {
    loading.value = false
    model.value = false
  }
}
</script>
