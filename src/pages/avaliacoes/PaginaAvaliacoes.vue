<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="cabecalho q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar rounded size="52px" color="blue-1" text-color="primary" icon="star" />
        <div class="col">
          <div class="text-caption text-grey-7">Configurações</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Avaliações</h1>
          <div class="text-grey-7 q-mt-xs">
            Como a nota de motoristas e passageiros é calculada nos aplicativos.
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
            <div class="text-h6 text-weight-bold">Média das últimas avaliações</div>
            <p class="text-grey-7 q-mt-sm">
              A nota é a média das últimas avaliações reais que a pessoa recebeu, até esta
              quantidade. Avaliações mais antigas deixam de entrar na conta conforme chegam as
              novas.
            </p>
            <q-form class="q-mt-md" @submit.prevent="salvar">
              <q-input
                v-model.number="quantidade"
                type="number"
                outlined
                label="Quantidade de avaliações"
                suffix="avaliações"
                min="1"
                max="5000"
                step="1"
                :rules="[regra]"
                :disable="salvando"
                :hint="`Número inteiro de 1 a 5000 · padrão ${padrao}`"
              />
              <div class="row q-gutter-sm q-mt-md">
                <q-btn
                  type="submit"
                  color="primary"
                  no-caps
                  label="Salvar"
                  :loading="salvando"
                  :disable="!alterado || regra(quantidade) !== true"
                />
                <q-btn
                  flat
                  no-caps
                  label="Restaurar padrão"
                  :disable="salvando || quantidade === padrao"
                  @click="quantidade = padrao"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="cartao">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Como a nota funciona</div>
            <ul class="text-grey-7 q-mt-sm q-mb-none regras">
              <li>
                Toda conta nova, de motorista ou de passageiro, começa com a nota <b>5,0</b> como
                base.
              </li>
              <li>
                Quando chega a primeira avaliação real, a nota passa a ser a média das avaliações
                recebidas.
              </li>
              <li>
                A nota 5 que o passageiro recebe sozinho quando não avalia a corrida
                <b>não conta</b> como avaliação real.
              </li>
              <li>
                Quem tem poucas corridas finalizadas aparece nos aplicativos com o selo
                <b>Novo usuário</b>.
              </li>
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
const salva = ref(null)
const quantidade = ref(null)
const padrao = ref(200)

const alterado = computed(() => quantidade.value !== salva.value)
const regra = (valor) =>
  (Number.isInteger(valor) && valor >= 1 && valor <= 5000) || 'Informe um inteiro de 1 a 5000'

function aplicar(dados) {
  salva.value = dados.avaliacoes_media_ultimas
  quantidade.value = dados.avaliacoes_media_ultimas
  padrao.value = dados.avaliacoes_media_ultimas_padrao
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
  if (regra(quantidade.value) !== true) return
  salvando.value = true
  try {
    aplicar((await api.put('/configuracoes', { avaliacoes_media_ultimas: quantidade.value })).data)
    $q.notify({ type: 'positive', message: 'Quantidade de avaliações salva.' })
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
.regras {
  padding-left: 18px;
}
.regras li + li {
  margin-top: 8px;
}
</style>
