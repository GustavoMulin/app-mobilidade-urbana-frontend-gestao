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
              É a porcentagem de chamadas aceitas em relação às que tocaram na tela do motorista no
              mês. Inicia em 100% e cai a cada chamada recusada ou deixada tocar até o fim. Não
              prejudicam essa taxa as chamadas duplicadas, as canceladas pelo passageiro logo depois
              de tocar e as da categoria Negocia. Os limites de tempo ficam em Exceções.
            </p>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12">
        <q-card flat bordered class="cartao">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Restrições por taxa de finalização baixa</div>
            <p class="text-grey-7 q-mt-sm">
              O motorista com a finalização abaixo da mínima recebe um alerta, com prazo até o dia
              limite do mês (segunda semana) para recuperar a taxa. Se o prazo vence e a taxa
              continua baixa, ele fica sem fazer corridas por alguns dias. A cada mês seguinte sem
              recuperar a restrição aumenta, e recuperar no meio do caminho volta ao primeiro
              degrau. No máximo uma restrição automática por mês.
            </p>

            <q-toggle
              v-model="restricao.ativas"
              :disable="salvandoRestricao"
              label="Aplicar as restrições (desligado = modo sombra)"
            />
            <div class="text-caption text-grey-7 q-mb-md">
              No modo sombra as restrições só são registradas, como “Simuladas”: ninguém é bloqueado
              nem recebe aviso. Use para conferir quem seria restrito antes de ligar.
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6 col-md-3">
                <q-input
                  v-model.number="restricao.prazo_dia"
                  type="number"
                  outlined
                  label="Prazo para recuperar"
                  prefix="até o dia"
                  min="1"
                  max="28"
                  :rules="[intervalo(1, 28)]"
                  :disable="salvandoRestricao"
                  :hint="`Padrão ${restricaoPadrao.prazo_dia}`"
                />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <q-input
                  v-model.number="restricao.antecedencia"
                  type="number"
                  outlined
                  label="Antecedência mínima"
                  suffix="dias"
                  min="0"
                  max="14"
                  :rules="[intervalo(0, 14)]"
                  :disable="salvandoRestricao"
                  :hint="`Com menos dias que isso até o prazo, vale o do mês seguinte. Padrão ${restricaoPadrao.antecedencia}`"
                />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <q-input
                  v-model.number="restricao.minimo_corridas"
                  type="number"
                  outlined
                  label="Mínimo de corridas"
                  suffix="corridas"
                  min="1"
                  max="1000"
                  :rules="[intervalo(1, 1000)]"
                  :disable="salvandoRestricao"
                  :hint="`Corridas encerradas nos últimos 30 dias antes de a taxa valer. Padrão ${restricaoPadrao.minimo_corridas}`"
                />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <q-input
                  v-model="restricao.duracoes"
                  outlined
                  label="Duração por degrau"
                  suffix="dias"
                  :rules="[regraDuracoes]"
                  :disable="salvandoRestricao"
                  :hint="`1ª, 2ª, 3ª restrição...; depois alterna entre as duas últimas. Padrão ${restricaoPadrao.duracoes}`"
                />
              </div>
            </div>

            <div class="row q-gutter-sm q-mt-md">
              <q-btn
                color="primary"
                no-caps
                label="Salvar restrições"
                :loading="salvandoRestricao"
                :disable="!restricaoAlterada || !restricaoValida"
                @click="salvarRestricao"
              />
              <q-btn
                flat
                no-caps
                label="Restaurar padrão"
                :disable="salvandoRestricao"
                @click="restaurarRestricao"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
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

const salvandoRestricao = ref(false)
const restricao = reactive({
  ativas: false,
  prazo_dia: 14,
  antecedencia: 3,
  minimo_corridas: 10,
  duracoes: '5,10,15',
})
const restricaoSalva = reactive({ ...restricao })
const restricaoPadrao = reactive({ ...restricao })

const restricaoAlterada = computed(() =>
  Object.keys(restricao).some((campo) => restricao[campo] !== restricaoSalva[campo]),
)
const intervalo = (minimo, maximo) => (valor) =>
  (Number.isInteger(valor) && valor >= minimo && valor <= maximo) ||
  `Informe um inteiro de ${minimo} a ${maximo}`
const regraDuracoes = (valor) =>
  /^[1-9]\d{0,2}(,[1-9]\d{0,2}){0,5}$/.test(valor || '') ||
  'Use dias separados por vírgula: 5,10,15'
const restricaoValida = computed(
  () =>
    intervalo(1, 28)(restricao.prazo_dia) === true &&
    intervalo(0, 14)(restricao.antecedencia) === true &&
    intervalo(1, 1000)(restricao.minimo_corridas) === true &&
    regraDuracoes(restricao.duracoes) === true,
)

function aplicar(dados) {
  salva.value = dados.taxa_finalizacao_minima
  minima.value = dados.taxa_finalizacao_minima
  padrao.value = dados.taxa_finalizacao_minima_padrao

  const doServidor = {
    ativas: dados.restricoes_taxa_ativas,
    prazo_dia: dados.restricao_prazo_dia,
    antecedencia: dados.restricao_antecedencia_dias,
    minimo_corridas: dados.restricao_minimo_corridas,
    duracoes: dados.restricao_duracoes_dias,
  }
  Object.assign(restricao, doServidor)
  Object.assign(restricaoSalva, doServidor)
  Object.assign(restricaoPadrao, {
    prazo_dia: dados.restricao_prazo_dia_padrao,
    antecedencia: dados.restricao_antecedencia_dias_padrao,
    minimo_corridas: dados.restricao_minimo_corridas_padrao,
    duracoes: dados.restricao_duracoes_dias_padrao,
  })
}

function restaurarRestricao() {
  Object.assign(restricao, {
    prazo_dia: restricaoPadrao.prazo_dia,
    antecedencia: restricaoPadrao.antecedencia,
    minimo_corridas: restricaoPadrao.minimo_corridas,
    duracoes: restricaoPadrao.duracoes,
  })
}

async function salvarRestricao() {
  if (!restricaoValida.value) return
  salvandoRestricao.value = true
  try {
    const { data } = await api.put('/configuracoes', {
      restricoes_taxa_ativas: restricao.ativas,
      restricao_prazo_dia: restricao.prazo_dia,
      restricao_antecedencia_dias: restricao.antecedencia,
      restricao_minimo_corridas: restricao.minimo_corridas,
      restricao_duracoes_dias: restricao.duracoes,
    })
    aplicar(data)
    $q.notify({ type: 'positive', message: 'Regras de restrição salvas.' })
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Não foi possível salvar.',
    })
  } finally {
    salvandoRestricao.value = false
  }
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
