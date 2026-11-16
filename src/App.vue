<template>
  <router-view />
</template>

<script setup>
import { useQuasar } from 'quasar'
import { temaSalvo } from 'src/utils/tema'

// a escolha do botão de tema (no topo) vale também no login; sem escolha, segue o sistema
useQuasar().dark.set(temaSalvo())
</script>
