<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="cabecalho q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar
          rounded
          size="52px"
          color="green-1"
          text-color="positive"
          icon="volunteer_activism"
        />
        <div class="col">
          <div class="text-caption text-grey-7">Configurações</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Gorjeta</h1>
          <div class="text-grey-7 q-mt-xs">
            Deixe o passageiro dar uma gorjeta ao motorista na tela de avaliação. O valor entra
            inteiro no saldo do motorista.
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
      <div class="col-12 col-md-7">
        <q-card flat bordered class="cartao">
          <q-card-section>
            <q-toggle
              v-model="ativa"
              :disable="salvando"
              label="Permitir gorjeta ao avaliar a corrida"
            />
            <div class="text-caption text-grey-7 q-mb-md">
              Desligada, a tela de avaliação do passageiro não mostra a opção de gorjeta. As
              gorjetas já enviadas continuam no saldo dos motoristas.
            </div>

            <div class="text-subtitle1 text-weight-bold q-mb-xs">Valores sugeridos</div>
            <div class="text-grey-7 q-mb-md">
              O passageiro escolhe entre estes três valores. Cada um deve ser diferente dos outros.
            </div>

            <q-form @submit.prevent="salvar">
              <div class="row q-col-gutter-md">
                <div v-for="(_, indice) in sugestoes" :key="indice" class="col-12 col-sm-4">
                  <q-input
                    v-model.number="sugestoes[indice]"
                    type="number"
                    outlined
                    :label="`Sugestão ${indice + 1}`"
                    prefix="R$"
                    min="0.5"
                    max="500"
                    step="0.5"
                    :rules="[valorValido(indice)]"
                    :disable="salvando"
                  />
                </div>
              </div>
              <div class="row q-gutter-sm q-mt-sm">
                <q-btn
                  type="submit"
                  color="primary"
                  no-caps
                  label="Salvar"
                  :loading="salvando"
                  :disable="!alterado || !tudoValido"
                />
                <q-btn
                  flat
                  no-caps
                  label="Restaurar padrão"
                  :disable="salvando || iguais(sugestoes, padrao)"
                  @click="sugestoes = [...padrao]"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-5">
        <q-card flat bordered class="cartao">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Como funciona</div>
            <ul class="text-grey-7 q-pl-md q-mb-none">
              <li>
                O passageiro só dá gorjeta depois que a corrida é finalizada, uma por corrida.
              </li>
              <li>A plataforma não fica com parte: 100% vai para o saldo do motorista.</li>
              <li>O motorista recebe uma notificação e vê a gorjeta no extrato da carteira.</li>
              <li>O valor pode ser sacado como qualquer outro saldo.</li>
            </ul>
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

const ativa = ref(false)
const sugestoes = ref([2, 5, 10])
const padrao = ref([2, 5, 10])
const salva = ref({ ativa: false, sugestoes: [2, 5, 10] })

const iguais = (a, b) =>
  a.length === b.length && a.every((valor, i) => Number(valor) === Number(b[i]))

const alterado = computed(
  () => ativa.value !== salva.value.ativa || !iguais(sugestoes.value, salva.value.sugestoes),
)

function valorValido(indice) {
  return (valor) => {
    const numero = Number(valor)
    if (valor === '' || valor === null || Number.isNaN(numero)) return 'Informe um valor'
    if (numero < 0.5 || numero > 500) return 'De R$ 0,50 a R$ 500,00'
    if (Math.round(numero * 100) !== numero * 100) return 'No máximo 2 casas decimais'
    const repetido = sugestoes.value.some((outro, i) => i !== indice && Number(outro) === numero)
    return repetido ? 'Não repita valores' : true
  }
}

const tudoValido = computed(() =>
  sugestoes.value.every((_, i) => valorValido(i)(sugestoes.value[i]) === true),
)

function aplicar(dados) {
  ativa.value = Boolean(dados.gorjeta_ativa)
  sugestoes.value = dados.gorjeta_sugestoes.map(Number)
  padrao.value = dados.gorjeta_sugestoes_padrao.map(Number)
  salva.value = { ativa: ativa.value, sugestoes: [...sugestoes.value] }
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
  if (!tudoValido.value) return
  salvando.value = true
  try {
    const { data } = await api.put('/configuracoes', {
      gorjeta_ativa: ativa.value,
      gorjeta_sugestoes: sugestoes.value.map(Number),
    })
    aplicar(data)
    $q.notify({ type: 'positive', message: 'Configuração de gorjeta salva.' })
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
