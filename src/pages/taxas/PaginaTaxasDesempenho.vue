<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="cabecalho q-mb-lg">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar rounded size="52px" color="blue-1" text-color="primary" icon="leaderboard" />
        <div class="col">
          <div class="text-caption text-grey-7">Taxas dos motoristas</div>
          <h1 class="text-h5 text-weight-bold q-ma-none">Desempenho</h1>
          <div class="text-grey-7 q-mt-xs">
            Aceitação no mês corrente e finalização nos últimos 30 dias, com os números que formam
            cada taxa.
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-12 col-sm-6 col-md-4">
        <q-input
          v-model="busca"
          outlined
          dense
          clearable
          debounce="400"
          placeholder="Buscar por nome ou CPF"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-auto">
        <q-toggle v-model="somenteAbaixo" label="Só abaixo da mínima de finalização" />
      </div>
    </div>

    <q-banner v-if="erro" rounded class="bg-red-1 text-negative q-mb-md">
      {{ erro }}
      <template #action><q-btn flat label="Tentar novamente" @click="carregar" /></template>
    </q-banner>

    <q-card flat bordered class="cartao">
      <q-markup-table flat separator="horizontal" wrap-cells>
        <thead>
          <tr>
            <th class="text-left">Motorista</th>
            <th class="text-right">Aceitação</th>
            <th class="text-right">Finalização</th>
            <th class="text-right">Aceitas / recusadas</th>
            <th class="text-right">Finalizadas / canceladas</th>
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
            <td colspan="6" class="text-center text-grey-7 q-pa-lg">
              Nenhum motorista encontrado.
            </td>
          </tr>
          <template v-else>
            <tr v-for="linha in linhas" :key="linha.id">
              <td>{{ linha.nome || `Motorista #${linha.id}` }}</td>
              <td class="text-right text-weight-bold">{{ linha.taxa_aceitacao }}%</td>
              <td
                class="text-right text-weight-bold"
                :class="linha.abaixo_minimo ? 'text-negative' : ''"
              >
                {{ linha.taxa_finalizacao }}%
                <q-icon
                  v-if="linha.abaixo_minimo"
                  name="warning"
                  size="16px"
                  class="q-ml-xs"
                  title="Abaixo da mínima"
                />
              </td>
              <td class="text-right">{{ linha.aceitas }} / {{ linha.recusadas }}</td>
              <td class="text-right">{{ linha.finalizadas }} / {{ linha.canceladas }}</td>
              <td class="text-right">
                <q-btn flat dense no-caps color="primary" label="Eventos" @click="abrir(linha)" />
              </td>
            </tr>
          </template>
        </tbody>
      </q-markup-table>
    </q-card>

    <div v-if="ultimaPagina > 1" class="flex flex-center q-mt-md">
      <q-pagination v-model="pagina" :max="ultimaPagina" max-pages="7" direction-links />
    </div>
    <div class="text-caption text-grey-7 q-mt-sm">
      Mínima de finalização: {{ minima }}% · {{ total }} motorista(s)
    </div>

    <q-dialog v-model="dialogo" maximized-on-mobile>
      <q-card class="dialogo">
        <q-card-section class="row items-center">
          <div class="col">
            <div class="text-h6 text-weight-bold">Eventos das taxas</div>
            <div class="text-grey-7">{{ selecionado?.nome }}</div>
          </div>
          <q-btn v-close-popup flat round dense icon="close" aria-label="Fechar" />
        </q-card-section>

        <q-card-section class="q-pt-none row items-center q-gutter-md">
          <q-btn-toggle
            v-model="filtroTaxa"
            no-caps
            unelevated
            toggle-color="primary"
            :options="[
              { label: 'Todas', value: null },
              { label: 'Aceitação', value: 'aceitacao' },
              { label: 'Finalização', value: 'finalizacao' },
            ]"
          />
          <q-toggle v-model="somenteDesconsiderados" label="Só desconsiderados" />
        </q-card-section>

        <q-card-section class="q-pt-none dialogo-lista">
          <div v-if="carregandoEventos" class="text-center q-pa-md" role="status">
            <q-spinner color="primary" size="28px" />
          </div>
          <div v-else-if="!eventos.length" class="text-center text-grey-7 q-pa-md">
            Nenhum evento.
          </div>
          <q-list v-else separator>
            <q-item v-for="evento in eventos" :key="evento.id">
              <q-item-section avatar>
                <q-icon
                  :name="evento.resultado === 'positivo' ? 'check_circle' : 'cancel'"
                  :color="corDoEvento(evento)"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  {{ rotuloTaxa[evento.taxa] }} · {{ rotuloMotivo[evento.motivo] || evento.motivo }}
                </q-item-label>
                <q-item-label caption>
                  Corrida {{ evento.codigo_corrida }} · {{ formatar(evento.ocorrido_em) }}
                </q-item-label>
              </q-item-section>
              <q-item-section v-if="evento.desconsiderado_motivo" side>
                <q-badge
                  color="grey-7"
                  :label="rotuloDesconsiderado[evento.desconsiderado_motivo]"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-section v-if="ultimaPaginaEventos > 1" class="flex flex-center q-pt-none">
          <q-pagination
            v-model="paginaEventos"
            :max="ultimaPaginaEventos"
            max-pages="5"
            direction-links
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { api } from 'boot/axios'

const rotuloTaxa = { aceitacao: 'Aceitação', finalizacao: 'Finalização' }
const rotuloMotivo = {
  aceita: 'Chamada aceita',
  recusada: 'Chamada recusada',
  tempo_esgotado: 'Tempo esgotado',
  finalizada: 'Corrida finalizada',
  cancelada_motorista: 'Cancelada pelo motorista',
  desistencia_grupo: 'Desistência de grupo',
}
const rotuloDesconsiderado = {
  negocia: 'Negocia',
  duplicada: 'Duplicada',
  passageiro_cancelou: 'Passageiro cancelou',
}

const busca = ref('')
const somenteAbaixo = ref(false)
const pagina = ref(1)
const ultimaPagina = ref(1)
const total = ref(0)
const minima = ref(null)
const linhas = ref([])
const carregando = ref(false)
const erro = ref('')

const dialogo = ref(false)
const selecionado = ref(null)
const filtroTaxa = ref(null)
const somenteDesconsiderados = ref(false)
const paginaEventos = ref(1)
const ultimaPaginaEventos = ref(1)
const eventos = ref([])
const carregandoEventos = ref(false)

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const params = { page: pagina.value }
    if (busca.value) params.search = busca.value
    if (somenteAbaixo.value) params.abaixo_minimo = 1
    const { data } = await api.get('/taxas-motoristas', { params })
    linhas.value = data.data
    ultimaPagina.value = data.last_page
    total.value = data.total
    minima.value = data.data[0]?.taxa_finalizacao_minima ?? minima.value
  } catch (e) {
    erro.value = e.response?.data?.message || 'Não foi possível carregar o desempenho.'
  } finally {
    carregando.value = false
  }
}

async function carregarEventos() {
  if (!selecionado.value) return
  carregandoEventos.value = true
  try {
    const params = { page: paginaEventos.value }
    if (filtroTaxa.value) params.taxa = filtroTaxa.value
    if (somenteDesconsiderados.value) params.somente_desconsiderados = 1
    const { data } = await api.get(`/taxas-motoristas/${selecionado.value.id}/eventos`, { params })
    eventos.value = data.data
    ultimaPaginaEventos.value = data.last_page
  } catch {
    eventos.value = []
  } finally {
    carregandoEventos.value = false
  }
}

function abrir(linha) {
  selecionado.value = linha
  filtroTaxa.value = null
  somenteDesconsiderados.value = false
  paginaEventos.value = 1
  dialogo.value = true
  carregarEventos()
}

function corDoEvento(evento) {
  if (evento.desconsiderado_motivo) return 'grey-6'
  return evento.resultado === 'positivo' ? 'positive' : 'negative'
}

function formatar(valor) {
  return valor ? new Date(valor.replace(' ', 'T')).toLocaleString('pt-BR') : '—'
}

// uma busca ou filtro novo volta para a primeira página
watch([busca, somenteAbaixo], () => {
  if (pagina.value === 1) carregar()
  else pagina.value = 1
})
watch(pagina, carregar)
watch([filtroTaxa, somenteDesconsiderados], () => {
  if (paginaEventos.value === 1) carregarEventos()
  else paginaEventos.value = 1
})
watch(paginaEventos, carregarEventos)

onMounted(carregar)
</script>

<style scoped>
.cabecalho,
.cartao {
  border-radius: 14px;
}
.dialogo {
  width: 640px;
  max-width: 100%;
}
.dialogo-lista {
  max-height: 55vh;
  overflow-y: auto;
}
</style>
