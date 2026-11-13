<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="cabecalho q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar rounded size="52px" color="blue-1" text-color="primary" icon="block" />
        <div class="col">
          <div class="text-caption text-grey-7">Taxas dos motoristas</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Restrições</h1>
          <div class="text-grey-7 q-mt-xs">
            Motoristas com a taxa de finalização abaixo da mínima: alerta com prazo para recuperar e
            restrição de corridas quando o prazo vence.
          </div>
        </div>
        <div class="col-auto">
          <q-btn
            color="primary"
            no-caps
            icon="add"
            label="Aplicar restrição"
            @click="abrirAplicar"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-banner v-if="ativas === false" rounded class="bg-orange-1 text-orange-10 q-mb-md">
      <template #avatar><q-icon name="visibility" /></template>
      <strong>Modo sombra.</strong> As restrições automáticas são só registradas (marcadas como
      “Simulada”): ninguém é bloqueado nem avisado. Para ligar o bloqueio, use a opção em Mínimos.
    </q-banner>

    <q-tabs v-model="aba" align="left" dense no-caps active-color="primary" class="q-mb-md">
      <q-tab name="alertas" label="Em alerta" />
      <q-tab name="restritos" label="Restritos" />
      <q-tab name="historico" label="Histórico" />
    </q-tabs>

    <q-input
      v-model="busca"
      outlined
      dense
      clearable
      debounce="400"
      placeholder="Buscar por nome"
      class="q-mb-md busca"
    >
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <q-banner v-if="erro" rounded class="bg-red-1 text-negative q-mb-md">
      {{ erro }}
      <template #action><q-btn flat label="Tentar novamente" @click="carregar" /></template>
    </q-banner>

    <q-card flat bordered class="cartao">
      <q-markup-table flat separator="horizontal" wrap-cells>
        <thead>
          <tr v-if="aba === 'alertas'">
            <th class="text-left">Motorista</th>
            <th class="text-right">Taxa ao alertar</th>
            <th class="text-right">Corridas na janela</th>
            <th class="text-left">Prazo para recuperar</th>
          </tr>
          <tr v-else>
            <th class="text-left">Motorista</th>
            <th class="text-left">Período</th>
            <th class="text-right">Degrau</th>
            <th class="text-left">Origem</th>
            <th class="text-left">Motivo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="carregando">
            <td colspan="6" class="text-center q-pa-lg" role="status">
              <q-spinner color="primary" size="28px" />
            </td>
          </tr>
          <tr v-else-if="!linhas.length">
            <td colspan="6" class="text-center text-grey-7 q-pa-lg">Nada por aqui.</td>
          </tr>
          <template v-else-if="aba === 'alertas'">
            <tr v-for="linha in linhas" :key="linha.id">
              <td>{{ linha.nome || `Motorista #${linha.motorista_id}` }}</td>
              <td class="text-right text-negative text-weight-bold">{{ linha.taxa_no_inicio }}%</td>
              <td class="text-right">{{ linha.corridas_na_janela }}</td>
              <td>
                {{ formatar(linha.prazo_ate) }}
                <q-badge color="orange-8" class="q-ml-sm" :label="faltam(linha.prazo_ate)" />
              </td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="linha in linhas" :key="linha.id">
              <td>{{ linha.nome || `Motorista #${linha.motorista_id}` }}</td>
              <td>
                {{ formatar(linha.inicio) }} → {{ formatar(linha.fim) }}
                <div class="text-caption text-grey-7">{{ linha.duracao_dias }} dias</div>
              </td>
              <td class="text-right">{{ linha.origem === 'manual' ? '—' : linha.degrau }}</td>
              <td>
                {{ linha.origem === 'manual' ? 'Gestão' : 'Automática' }}
                <q-badge v-if="linha.simulada" color="grey-7" class="q-ml-xs" label="Simulada" />
                <q-badge
                  v-if="aba === 'historico'"
                  :color="linha.status === 'liberada' ? 'blue-grey' : 'grey-6'"
                  class="q-ml-xs"
                  :label="linha.status === 'liberada' ? 'Liberada' : 'Cumprida'"
                />
              </td>
              <td class="motivo">
                {{ linha.motivo }}
                <div v-if="linha.motivo_liberacao" class="text-caption text-grey-7">
                  Liberação: {{ linha.motivo_liberacao }}
                </div>
              </td>
              <td class="text-right">
                <q-btn
                  v-if="aba === 'restritos'"
                  flat
                  dense
                  no-caps
                  color="primary"
                  label="Liberar"
                  @click="abrirLiberar(linha)"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </q-markup-table>
    </q-card>

    <div v-if="ultimaPagina > 1" class="flex flex-center q-mt-md">
      <q-pagination v-model="pagina" :max="ultimaPagina" max-pages="7" direction-links />
    </div>

    <q-dialog v-model="dialogoAplicar" persistent>
      <q-card class="dialogo">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Aplicar restrição</div>
          <div class="text-grey-7">
            O motorista não conseguirá ficar online até o fim do período.
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="motorista"
            outlined
            use-input
            hide-selected
            fill-input
            input-debounce="400"
            label="Motorista"
            :options="opcoes"
            option-value="id"
            option-label="nome"
            :loading="buscandoMotorista"
            @filter="buscarMotorista"
          >
            <template #no-option>
              <q-item><q-item-section class="text-grey">Digite para buscar</q-item-section></q-item>
            </template>
          </q-select>
          <q-input
            v-model.number="dias"
            type="number"
            outlined
            label="Duração"
            suffix="dias"
            min="1"
            max="365"
          />
          <q-input
            v-model="motivoAplicar"
            type="textarea"
            outlined
            autogrow
            label="Motivo (obrigatório)"
            counter
            maxlength="500"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat no-caps label="Cancelar" :disable="salvando" />
          <q-btn
            color="negative"
            no-caps
            label="Aplicar"
            :loading="salvando"
            :disable="!podeAplicar"
            @click="aplicar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogoLiberar" persistent>
      <q-card class="dialogo">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Liberar motorista</div>
          <div class="text-grey-7">{{ alvo?.nome }}</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="motivoLiberar"
            type="textarea"
            outlined
            autogrow
            label="Motivo (obrigatório)"
            counter
            maxlength="500"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat no-caps label="Cancelar" :disable="salvando" />
          <q-btn
            color="primary"
            no-caps
            label="Liberar"
            :loading="salvando"
            :disable="motivoLiberar.trim().length < 5"
            @click="liberar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()
const aba = ref('alertas')
const busca = ref('')
const pagina = ref(1)
const ultimaPagina = ref(1)
const linhas = ref([])
const carregando = ref(false)
const erro = ref('')
const ativas = ref(null)
const salvando = ref(false)

const dialogoAplicar = ref(false)
const motorista = ref(null)
const opcoes = ref([])
const buscandoMotorista = ref(false)
const dias = ref(5)
const motivoAplicar = ref('')

const dialogoLiberar = ref(false)
const alvo = ref(null)
const motivoLiberar = ref('')

const podeAplicar = computed(
  () =>
    motorista.value?.id &&
    Number.isInteger(dias.value) &&
    dias.value >= 1 &&
    dias.value <= 365 &&
    motivoAplicar.value.trim().length >= 5,
)

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const params = { aba: aba.value, page: pagina.value }
    if (busca.value) params.search = busca.value
    const { data } = await api.get('/restricoes-motoristas', { params })
    linhas.value = data.data
    ultimaPagina.value = data.last_page
  } catch (e) {
    erro.value = e.response?.data?.message || 'Não foi possível carregar as restrições.'
  } finally {
    carregando.value = false
  }
}

async function carregarModo() {
  try {
    ativas.value = (await api.get('/configuracoes')).data.restricoes_taxa_ativas
  } catch {
    ativas.value = null
  }
}

function formatar(valor) {
  return valor ? new Date(valor.replace(' ', 'T')).toLocaleString('pt-BR') : '—'
}

function faltam(prazo) {
  const horas = Math.round((new Date(prazo.replace(' ', 'T')) - new Date()) / 3600000)
  if (horas <= 0) return 'vencido'
  return horas >= 48 ? `${Math.round(horas / 24)} dias` : `${horas} h`
}

function abrirAplicar() {
  motorista.value = null
  dias.value = 5
  motivoAplicar.value = ''
  dialogoAplicar.value = true
}

function buscarMotorista(texto, update) {
  update(async () => {
    buscandoMotorista.value = true
    try {
      const { data } = await api.get('/motoristas-ganhos/motoristas', {
        params: { search: texto },
      })
      opcoes.value = data.data
    } catch {
      opcoes.value = []
    } finally {
      buscandoMotorista.value = false
    }
  })
}

async function aplicar() {
  salvando.value = true
  try {
    await api.post('/restricoes-motoristas', {
      motorista_id: motorista.value.id,
      dias: dias.value,
      motivo: motivoAplicar.value.trim(),
    })
    dialogoAplicar.value = false
    $q.notify({ type: 'positive', message: 'Restrição aplicada.' })
    aba.value = 'restritos'
    carregar()
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Não foi possível aplicar.',
    })
  } finally {
    salvando.value = false
  }
}

function abrirLiberar(linha) {
  alvo.value = linha
  motivoLiberar.value = ''
  dialogoLiberar.value = true
}

async function liberar() {
  salvando.value = true
  try {
    await api.post(`/restricoes-motoristas/${alvo.value.id}/liberar`, {
      motivo: motivoLiberar.value.trim(),
    })
    dialogoLiberar.value = false
    $q.notify({ type: 'positive', message: 'Motorista liberado.' })
    carregar()
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Não foi possível liberar.',
    })
    dialogoLiberar.value = false
    carregar()
  } finally {
    salvando.value = false
  }
}

// aba ou busca nova volta para a primeira página
watch([aba, busca], () => {
  if (pagina.value === 1) carregar()
  else pagina.value = 1
})
watch(pagina, carregar)

onMounted(() => {
  carregarModo()
  carregar()
})
</script>

<style scoped>
.cabecalho,
.cartao {
  border-radius: 14px;
}
.dialogo {
  width: 480px;
  max-width: 100%;
}
.busca {
  max-width: 360px;
}
.motivo {
  max-width: 320px;
}
</style>
