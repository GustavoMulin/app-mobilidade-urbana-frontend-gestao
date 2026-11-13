<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="cabecalho q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar rounded size="52px" color="blue-1" text-color="primary" icon="rule" />
        <div class="col">
          <div class="text-caption text-grey-7">Taxas dos motoristas</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Exceções</h1>
          <div class="text-grey-7 q-mt-xs">
            Situações em que uma chamada não derruba a taxa de aceitação do motorista.
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
            <div class="text-h6 text-weight-bold">Cancelamento do passageiro</div>
            <p class="text-grey-7 q-mt-sm">
              Se o passageiro cancelar a corrida em até este tempo depois de a chamada tocar para o
              motorista, a recusa (ou o tempo esgotado) dessa chamada não pesa na taxa de aceitação.
            </p>
            <q-input
              v-model.number="form.taxas_cancelamento_passageiro_segundos"
              type="number"
              outlined
              label="Tempo limite"
              suffix="segundos"
              min="0"
              max="3600"
              step="1"
              :rules="[regra(0, 3600)]"
              :disable="salvando"
              :hint="`${minutos(form.taxas_cancelamento_passageiro_segundos)} · padrão ${padrao.taxas_cancelamento_passageiro_segundos} s`"
            />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="cartao">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Chamada duplicada</div>
            <p class="text-grey-7 q-mt-sm">
              Quando o mesmo passageiro tem a solicitação reenviada ao mesmo motorista dentro deste
              intervalo, a nova chamada é tratada como duplicada e não pesa na taxa de aceitação.
              Com 0 a regra fica desligada.
            </p>
            <q-input
              v-model.number="form.taxas_duplicada_janela_minutos"
              type="number"
              outlined
              label="Intervalo"
              suffix="minutos"
              min="0"
              max="120"
              step="1"
              :rules="[regra(0, 120)]"
              :disable="salvando"
              :hint="`Padrão ${padrao.taxas_duplicada_janela_minutos} min`"
            />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12">
        <q-card flat bordered class="cartao">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Categoria Negocia</div>
            <p class="text-grey-7 q-mt-sm q-mb-none">
              As chamadas do Negocia nunca entram na taxa de aceitação, nem quando o passageiro
              escolhe o motorista. Elas continuam valendo para a taxa de finalização: depois de
              escolhido, cancelar a corrida pesa normalmente. Esta regra é fixa.
            </p>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 row q-gutter-sm">
        <q-btn
          color="primary"
          no-caps
          label="Salvar"
          :loading="salvando"
          :disable="!alterado || !valido"
          @click="salvar"
        />
        <q-btn
          flat
          no-caps
          label="Restaurar padrão"
          :disable="salvando || igualAoPadrao"
          @click="restaurar"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const CAMPOS = ['taxas_cancelamento_passageiro_segundos', 'taxas_duplicada_janela_minutos']

const $q = useQuasar()
const carregando = ref(false)
const salvando = ref(false)
const erro = ref('')
const form = reactive({
  taxas_cancelamento_passageiro_segundos: 0,
  taxas_duplicada_janela_minutos: 0,
})
const salvo = reactive({ ...form })
const padrao = reactive({ ...form })

const alterado = computed(() => CAMPOS.some((campo) => form[campo] !== salvo[campo]))
const igualAoPadrao = computed(() => CAMPOS.every((campo) => form[campo] === padrao[campo]))
const valido = computed(
  () =>
    regra(0, 3600)(form.taxas_cancelamento_passageiro_segundos) === true &&
    regra(0, 120)(form.taxas_duplicada_janela_minutos) === true,
)

function regra(minimo, maximo) {
  return (valor) =>
    (Number.isInteger(valor) && valor >= minimo && valor <= maximo) ||
    `Informe um inteiro de ${minimo} a ${maximo}`
}

function minutos(segundos) {
  if (!Number.isInteger(segundos) || segundos < 0) return '—'
  const minutosInteiros = Math.floor(segundos / 60)
  const resto = segundos % 60
  return `${minutosInteiros} min${resto ? ` ${resto} s` : ''}`
}

function aplicar(dados) {
  for (const campo of CAMPOS) {
    form[campo] = dados[campo]
    salvo[campo] = dados[campo]
    padrao[campo] = dados[`${campo}_padrao`]
  }
}

function restaurar() {
  for (const campo of CAMPOS) form[campo] = padrao[campo]
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
  if (!valido.value) return
  salvando.value = true
  try {
    const corpo = Object.fromEntries(CAMPOS.map((campo) => [campo, form[campo]]))
    aplicar((await api.put('/configuracoes', corpo)).data)
    $q.notify({ type: 'positive', message: 'Exceções salvas.' })
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
