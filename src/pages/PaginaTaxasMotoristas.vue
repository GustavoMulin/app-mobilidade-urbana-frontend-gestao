<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="cabecalho q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar rounded size="52px" color="blue-1" text-color="primary" icon="speed" />
        <div class="col">
          <div class="text-caption text-grey-7">Configurações</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Taxas dos motoristas</h1>
          <div class="text-grey-7 q-mt-xs">
            Defina o nível mínimo esperado dos motoristas. As taxas consideram os últimos 30 dias.
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div v-if="carregando" class="text-center q-pa-xl" role="status">
      <q-spinner color="primary" size="36px" />
      <div class="q-mt-sm">Carregando configurações...</div>
    </div>
    <q-banner v-else-if="erro" rounded class="bg-red-1 text-negative">
      {{ erro }}
      <template #action><q-btn flat label="Tentar novamente" @click="carregar" /></template>
    </q-banner>

    <div v-else class="row q-col-gutter-lg">
      <div class="col-12 col-md-6">
        <q-card flat bordered class="cartao">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Taxa de finalização mínima</div>
            <p class="text-grey-7 q-mt-sm">
              É a proporção de corridas finalizadas em relação às aceitas nos últimos 30 dias. Ela
              começa em 100% e é afetada diretamente quando o motorista aceita uma viagem e cancela
              logo em seguida. Exigimos que fique, em geral, no mínimo neste valor para evitar
              restrições temporárias na conta.
            </p>
            <q-form class="q-mt-md" @submit.prevent="salvar">
              <q-input
                v-model.number="minima"
                type="number"
                outlined
                label="Taxa mínima"
                suffix="%"
                min="0"
                max="100"
                step="1"
                :rules="regras"
                :disable="salvando"
                hint="Número inteiro de 0 a 100"
              />
              <div class="row q-gutter-sm q-mt-md">
                <q-btn
                  type="submit"
                  color="primary"
                  no-caps
                  label="Salvar"
                  :loading="salvando"
                  :disable="!alterado"
                />
                <q-btn
                  flat
                  no-caps
                  label="Restaurar padrão"
                  :disable="salvando || minima === padrao"
                  @click="minima = padrao"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="cartao">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Taxa de aceitação</div>
            <p class="text-grey-7 q-mt-sm q-mb-none">
              É a porcentagem de corridas aceitas em relação ao total recebido nos últimos 30 dias.
              Inicia em 100% e é ajustada conforme o motorista aceita ou recusa os chamados. Recusas
              de corridas duplicadas, canceladas pelo passageiro ou em áreas de risco não prejudicam
              essa taxa.
            </p>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()
const carregando = ref(false)
const salvando = ref(false)
const erro = ref('')
const salva = ref(null)
const minima = ref(null)
const padrao = ref(70)

const alterado = computed(() => minima.value !== salva.value)
const regras = [
  (valor) =>
    (Number.isInteger(valor) && valor >= 0 && valor <= 100) || 'Informe um inteiro de 0 a 100',
]

function aplicar(dados) {
  salva.value = dados.taxa_finalizacao_minima
  minima.value = dados.taxa_finalizacao_minima
  padrao.value = dados.taxa_finalizacao_minima_padrao
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    aplicar((await api.get('/configuracoes')).data)
  } catch (e) {
    erro.value = e.response?.data?.message || 'Não foi possível carregar as configurações.'
  } finally {
    carregando.value = false
  }
}

async function salvar() {
  if (regras[0](minima.value) !== true) return
  salvando.value = true
  try {
    aplicar((await api.put('/configuracoes', { taxa_finalizacao_minima: minima.value })).data)
    $q.notify({ type: 'positive', message: 'Taxa de finalização mínima salva.' })
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Não foi possível salvar.',
    })
  } finally {
    salvando.value = false
  }
}

onMounted(carregar)
</script>

<style scoped>
.cabecalho,
.cartao {
  border-radius: 14px;
}
</style>
