<template>
  <VisualizarRegistro v-model="model" tipo="veiculo" :registro-id="veiculoId" />
</template>

<script setup>
import { computed } from 'vue'
import VisualizarRegistro from 'src/components/VisualizarRegistro.vue'

const props = defineProps({ modelValue: Boolean, veiculoId: [String, Number] })
const emit = defineEmits(['update:modelValue'])
const model = computed({
  get: () => props.modelValue,
  set: (valor) => emit('update:modelValue', valor),
})
</script>
