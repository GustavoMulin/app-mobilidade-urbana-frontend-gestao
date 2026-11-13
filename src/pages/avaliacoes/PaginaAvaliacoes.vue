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

      <div class="col-12">
        <q-card flat bordered class="cartao">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Faixas de avaliação</div>
            <p class="text-grey-7 q-mt-sm">
              A nota é classificada em três faixas, que vão decidir o que o motorista pode receber
              (chamadas, ofertas e penalidades). Os dois limites pertencem à faixa Atenção. O que
              acontece em cada faixa é definido no card seguinte.
            </p>
            <q-form @submit.prevent="salvarFaixas">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model.number="faixas.excelente"
                    type="number"
                    outlined
                    label="Excelente: nota acima de"
                    min="1"
                    max="5"
                    step="0.01"
                    :rules="[regraNota]"
                    :disable="salvandoFaixas"
                    :hint="`Padrão ${formatarNota(padraoFaixas.excelente)}`"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model.number="faixas.altoRisco"
                    type="number"
                    outlined
                    label="Alto risco / Restrito: nota abaixo de"
                    min="1"
                    max="5"
                    step="0.01"
                    :rules="[regraNota, regraOrdem]"
                    :disable="salvandoFaixas"
                    :hint="`Padrão ${formatarNota(padraoFaixas.altoRisco)}`"
                  />
                </div>
              </div>

              <div v-if="faixasValidas" class="q-mt-md resumo-faixas">
                <q-chip color="positive" text-color="white" icon="verified">
                  Excelente: acima de {{ formatarNota(faixas.excelente) }}
                </q-chip>
                <q-chip color="warning" text-color="black" icon="warning">
                  Atenção: de {{ formatarNota(faixas.altoRisco) }} a
                  {{ formatarNota(faixas.excelente) }}
                </q-chip>
                <q-chip color="negative" text-color="white" icon="block">
                  Alto risco / Restrito: abaixo de {{ formatarNota(faixas.altoRisco) }}
                </q-chip>
              </div>

              <div class="row q-gutter-sm q-mt-md">
                <q-btn
                  type="submit"
                  color="primary"
                  no-caps
                  label="Salvar faixas"
                  :loading="salvandoFaixas"
                  :disable="!faixasAlteradas || !faixasValidas"
                />
                <q-btn
                  flat
                  no-caps
                  label="Restaurar padrão"
                  :disable="salvandoFaixas || faixasIguaisAoPadrao"
                  @click="restaurarFaixas"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12">
        <q-card flat bordered class="cartao">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Alertas e penalidades por nota</div>
            <p class="text-grey-7 q-mt-sm">
              Atenção só avisa. Em Alto risco a pessoa tem um prazo para recuperar a nota; vencido o
              prazo, o motorista fica sem fazer corridas e o passageiro é suspenso, com bloqueio
              permanente na reincidência. A faixa só vale depois do mínimo de avaliações reais.
            </p>
            <q-form @submit.prevent="salvarPenalidades">
              <q-toggle
                v-model="pen.ativas"
                color="primary"
                :disable="salvandoPen"
                label="Penalidades ligadas (desligado = modo sombra: só registra, não bloqueia nem avisa)"
              />
              <div class="row q-col-gutter-md q-mt-xs">
                <div class="col-12 col-sm-6 col-md-4">
                  <q-input
                    v-model.number="pen.minimo"
                    type="number"
                    outlined
                    label="Mínimo de avaliações reais"
                    suffix="avaliações"
                    min="1"
                    max="1000"
                    :rules="[regraInteiro(1, 1000)]"
                    :disable="salvandoPen"
                    :hint="`Padrão ${padraoPen.minimo}`"
                  />
                </div>
                <div class="col-12 col-sm-6 col-md-4">
                  <q-input
                    v-model.number="pen.prazo"
                    type="number"
                    outlined
                    label="Prazo para recuperar a nota"
                    suffix="dias"
                    min="1"
                    max="90"
                    :rules="[regraInteiro(1, 90)]"
                    :disable="salvandoPen"
                    :hint="`Padrão ${padraoPen.prazo} dias`"
                  />
                </div>
                <div class="col-12 col-sm-6 col-md-4">
                  <q-input
                    v-model="pen.duracoes"
                    outlined
                    label="Motorista: dias de restrição"
                    :rules="[regraDuracoes]"
                    :disable="salvandoPen"
                    :hint="`Da 1ª restrição em diante, ex.: ${padraoPen.duracoes}; depois alterna as duas últimas`"
                  />
                </div>
                <div class="col-12 col-sm-6 col-md-4">
                  <q-input
                    v-model.number="pen.suspensao"
                    type="number"
                    outlined
                    label="Passageiro: dias de suspensão"
                    suffix="dias"
                    min="1"
                    max="365"
                    :rules="[regraInteiro(1, 365)]"
                    :disable="salvandoPen"
                    :hint="`Padrão ${padraoPen.suspensao} dias`"
                  />
                </div>
                <div class="col-12 col-sm-6 col-md-4">
                  <q-input
                    v-model.number="pen.bloqueioApos"
                    type="number"
                    outlined
                    label="Passageiro: bloqueio permanente após"
                    suffix="suspensões"
                    min="0"
                    max="20"
                    :rules="[regraInteiro(0, 20)]"
                    :disable="salvandoPen"
                    :hint="`0 = nunca bloqueia · padrão ${padraoPen.bloqueioApos}`"
                  />
                </div>
              </div>
              <div class="q-mt-md">
                <q-btn
                  type="submit"
                  color="primary"
                  no-caps
                  label="Salvar penalidades"
                  :loading="salvandoPen"
                  :disable="!penAlterado || !penValido"
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
import { computed, onMounted, reactive, ref } from 'vue'
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

// faixas da nota: Excelente acima de X, Alto risco abaixo de Y, Atenção de Y a X
const salvandoFaixas = ref(false)
const faixas = reactive({ excelente: 4.85, altoRisco: 4.51 })
const faixasSalvas = reactive({ ...faixas })
const padraoFaixas = reactive({ ...faixas })

const casasDecimais = (valor) => Math.round(valor * 100) === Number((valor * 100).toFixed(4))
const regraNota = (valor) =>
  (typeof valor === 'number' && valor >= 1 && valor <= 5 && casasDecimais(valor)) ||
  'Informe uma nota de 1 a 5, com até duas casas'
const regraOrdem = (valor) =>
  valor <= faixas.excelente || 'O limite de alto risco não pode ser maior que o de excelente'
const faixasValidas = computed(
  () =>
    regraNota(faixas.excelente) === true &&
    regraNota(faixas.altoRisco) === true &&
    faixas.altoRisco <= faixas.excelente,
)
const faixasAlteradas = computed(
  () => faixas.excelente !== faixasSalvas.excelente || faixas.altoRisco !== faixasSalvas.altoRisco,
)
const faixasIguaisAoPadrao = computed(
  () => faixas.excelente === padraoFaixas.excelente && faixas.altoRisco === padraoFaixas.altoRisco,
)
const formatarNota = (nota) => (typeof nota === 'number' ? nota.toFixed(2).replace('.', ',') : '—')

function restaurarFaixas() {
  faixas.excelente = padraoFaixas.excelente
  faixas.altoRisco = padraoFaixas.altoRisco
}

// penalidades por nota: modo sombra, mínimo, prazo e duração das penalidades
const salvandoPen = ref(false)
const pen = reactive({
  ativas: false,
  minimo: 10,
  prazo: 7,
  duracoes: '5,10,15',
  suspensao: 7,
  bloqueioApos: 2,
})
const penSalvas = reactive({ ...pen })
const padraoPen = reactive({ ...pen })

const regraInteiro = (min, max) => (valor) =>
  (Number.isInteger(valor) && valor >= min && valor <= max) || `Informe um inteiro de ${min} a ${max}`
const regraDuracoes = (valor) =>
  /^[1-9]\d{0,2}(,[1-9]\d{0,2}){0,5}$/.test(String(valor ?? '').replace(/\s/g, '')) ||
  'Informe dias separados por vírgula, ex.: 5,10,15'
const penValido = computed(
  () =>
    regraInteiro(1, 1000)(pen.minimo) === true &&
    regraInteiro(1, 90)(pen.prazo) === true &&
    regraDuracoes(pen.duracoes) === true &&
    regraInteiro(1, 365)(pen.suspensao) === true &&
    regraInteiro(0, 20)(pen.bloqueioApos) === true,
)
const penAlterado = computed(() => Object.keys(pen).some((chave) => pen[chave] !== penSalvas[chave]))

function aplicarPen(dados) {
  const valores = {
    ativas: dados.restricoes_nota_ativas,
    minimo: dados.restricao_nota_minimo_avaliacoes,
    prazo: dados.restricao_nota_prazo_dias,
    duracoes: dados.restricao_nota_motorista_duracoes_dias,
    suspensao: dados.restricao_nota_passageiro_suspensao_dias,
    bloqueioApos: dados.restricao_nota_passageiro_bloqueio_apos,
  }
  Object.assign(pen, valores)
  Object.assign(penSalvas, valores)
  Object.assign(padraoPen, {
    minimo: dados.restricao_nota_minimo_avaliacoes_padrao,
    prazo: dados.restricao_nota_prazo_dias_padrao,
    duracoes: dados.restricao_nota_motorista_duracoes_dias_padrao,
    suspensao: dados.restricao_nota_passageiro_suspensao_dias_padrao,
    bloqueioApos: dados.restricao_nota_passageiro_bloqueio_apos_padrao,
  })
}

async function salvarPenalidades() {
  if (!penValido.value) return
  salvandoPen.value = true
  try {
    const dados = (
      await api.put('/configuracoes', {
        restricoes_nota_ativas: pen.ativas,
        restricao_nota_minimo_avaliacoes: pen.minimo,
        restricao_nota_prazo_dias: pen.prazo,
        restricao_nota_motorista_duracoes_dias: String(pen.duracoes).replace(/\s/g, ''),
        restricao_nota_passageiro_suspensao_dias: pen.suspensao,
        restricao_nota_passageiro_bloqueio_apos: pen.bloqueioApos,
      })
    ).data
    aplicar(dados)
    $q.notify({ type: 'positive', message: 'Penalidades por nota salvas.' })
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Não foi possível salvar.',
    })
  } finally {
    salvandoPen.value = false
  }
}

function aplicar(dados) {
  aplicarPen(dados)
  salva.value = dados.avaliacoes_media_ultimas
  quantidade.value = dados.avaliacoes_media_ultimas
  padrao.value = dados.avaliacoes_media_ultimas_padrao

  faixas.excelente = faixasSalvas.excelente = dados.avaliacoes_faixa_excelente_acima
  faixas.altoRisco = faixasSalvas.altoRisco = dados.avaliacoes_faixa_alto_risco_abaixo
  padraoFaixas.excelente = dados.avaliacoes_faixa_excelente_acima_padrao
  padraoFaixas.altoRisco = dados.avaliacoes_faixa_alto_risco_abaixo_padrao
}

async function salvarFaixas() {
  if (!faixasValidas.value) return
  salvandoFaixas.value = true
  try {
    aplicar(
      (
        await api.put('/configuracoes', {
          avaliacoes_faixa_excelente_acima: faixas.excelente,
          avaliacoes_faixa_alto_risco_abaixo: faixas.altoRisco,
        })
      ).data,
    )
    $q.notify({ type: 'positive', message: 'Faixas de avaliação salvas.' })
  } catch (e) {
    $q.notify({
      type: 'negative',
      message:
        e.response?.data?.errors?.avaliacoes_faixa_alto_risco_abaixo?.[0] ||
        e.response?.data?.message ||
        'Não foi possível salvar.',
    })
  } finally {
    salvandoFaixas.value = false
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
.resumo-faixas {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
