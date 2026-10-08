<template>
  <q-dialog v-model="model" @before-show="onBeforeShow">
    <q-card style="width: 700px; max-width: 80vw">
      <!-- HEADER -->
      <q-toolbar>
        <q-avatar rounded icon="directions_car" color="primary" text-color="white" />

        <q-toolbar-title>
          <span class="text-weight-bold">Editar veículo</span>
        </q-toolbar-title>

        <q-btn flat round dense icon="close" v-close-popup />
      </q-toolbar>

      <q-separator />

      <!-- CONTENT -->
      <div class="row" v-if="!loadingDialog">
        <!-- IMAGEM -->

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

      <div class="q-pa-md">
        <q-btn
          color="primary"
          class="full-width"
          dense
          icon="save"
          label="SALVAR ALTERAÇÕES"
          :loading="loadingUpdate"
          v-if="!loadingDialog"
          @click="atualizarVeiculo()"
        />
      </div>

      <!-- <loading-dialog v-else /> -->
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

const loadingDialog = ref(false)
const loadingUpdate = ref(false)

async function getVeiculo(id) {
  console.log(props.veiculoId, 'props.veiculoId')
  const { data } = await api.get(`/veiculos/${id}`)
  return data
}

async function onBeforeShow() {
  if (!props.veiculoId) return

  try {
    const data = await getVeiculo(props.veiculoId)
    Object.assign(veiculo, data)
  } finally {
    loadingDialog.value = false
  }
}

async function atualizarVeiculo() {
  if (!props.veiculoId) return
  loadingUpdate.value = true
  try {
    await api.put(`/veiculos/${props.veiculoId}`, {
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano_fabricacao: veiculo.ano_fabricacao,
      ano_modelo: veiculo.ano_modelo,
      cor: veiculo.cor,
      placa: veiculo.placa,
      renavam: veiculo.renavam,
      chassi: veiculo.chassi?.trim().toUpperCase() || null,
      categoria: veiculo.categoria,
      status: veiculo.status,
      uf: veiculo.uf,
    })
    loadingUpdate.value = false
    emit('updated')
    $q.notify({ type: 'positive', message: 'Veículo atualizado com sucesso' })
  } catch (err) {
    loadingUpdate.value = false

    $q.notify({ type: 'negative', message: err.message })
  }
}
</script>
