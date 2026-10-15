<template>
  <q-page class="q-pa-md central-ajuda">
    <div
      v-show="!$q.screen.lt.md || !selecionado"
      class="row items-center justify-between q-mb-md q-gutter-sm"
    >
      <div class="row items-center no-wrap">
        <q-avatar color="blue-1" text-color="primary" icon="support_agent" class="q-mr-md" />
        <div>
          <div class="text-h5 text-weight-medium">Central de ajuda</div>
          <div class="text-caption text-grey-7">
            Acompanhe os tickets e converse com passageiros e motoristas.
          </div>
        </div>
      </div>
      <q-btn color="primary" icon="add" label="Novo ticket" @click="novo = true" />
    </div>
    <div class="row q-col-gutter-md">
      <div v-show="!$q.screen.lt.md || !selecionado" class="col-12 col-md-4 col-lg-3">
        <q-card flat bordered class="lista-tickets column no-wrap">
          <q-card-section class="q-pa-md">
            <div class="row items-center justify-between q-mb-sm">
              <span class="text-subtitle1 text-weight-medium">Atendimentos</span
              ><q-badge color="blue-1" text-color="primary"
                >{{ total }} {{ total === 1 ? 'ticket' : 'tickets' }}</q-badge
              ><q-btn
                flat
                round
                dense
                icon="refresh"
                aria-label="Atualizar tickets"
                :loading="carregando"
                @click="carregar()"
              />
            </div>
            <q-input
              v-model="search"
              outlined
              dense
              debounce="350"
              placeholder="Nome, CPF ou protocolo"
              clearable
              ><template #prepend><q-icon name="search" /></template
            ></q-input>
            <div class="row q-col-gutter-sm q-mt-sm">
              <q-select
                v-model="status"
                class="col-7"
                outlined
                dense
                emit-value
                map-options
                clearable
                :options="statusTickets"
                label="Status"
              />
              <q-select
                v-model="persona"
                class="col-5"
                outlined
                dense
                emit-value
                map-options
                clearable
                :options="personas"
                label="Perfil"
              />
            </div>
          </q-card-section>
          <q-separator />
          <q-banner v-if="erro" dense class="bg-red-1 text-negative" role="alert">{{
            erro
          }}</q-banner>
          <q-list separator class="col lista-scroll">
            <q-item
              v-for="item in tickets"
              :key="item.id"
              clickable
              :active="selecionado === item.id"
              active-class="bg-blue-1"
              class="q-py-md"
              @click="selecionado = item.id"
            >
              <q-item-section>
                <div class="row justify-between items-center q-mb-xs">
                  <span class="text-caption text-primary text-weight-bold">{{
                    item.protocolo
                  }}</span
                  ><q-badge
                    :color="statusTicket(item.status).color"
                    :label="statusTicket(item.status).label"
                  />
                </div>
                <q-item-label class="text-weight-medium">{{
                  item.solicitante?.name || 'Usuário'
                }}</q-item-label>
                <q-item-label caption
                  >{{ item.solicitante_tipo === 'motorista' ? 'Motorista' : 'Passageiro' }} ·
                  {{ motivoTicket(item.motivo) }}</q-item-label
                >
                <q-item-label caption class="q-mt-sm">{{
                  horarioTicket(item.ultima_mensagem_em || item.created_at)
                }}</q-item-label>
              </q-item-section>
            </q-item>
            <div
              v-if="!carregando && !tickets.length && !erro"
              class="q-pa-xl text-center text-grey-7"
            >
              <q-icon name="inbox" size="40px" />
              <p class="q-mt-sm">Nenhum ticket encontrado.</p>
            </div>
          </q-list>
          <q-separator />
          <div class="flex flex-center q-pa-sm">
            <q-pagination
              v-model="page"
              :max="ultimaPagina"
              :max-pages="5"
              direction-links
              boundary-numbers
              :disable="carregando"
            />
          </div>
          <q-inner-loading :showing="carregando" />
        </q-card>
      </div>
      <div v-show="!$q.screen.lt.md || selecionado" class="col-12 col-md-8 col-lg-9">
        <ChatTicket
          :ticket-id="selecionado"
          @atualizado="agendarAtualizacao"
          @voltar="selecionado = null"
        />
      </div>
    </div>
    <NovoTicket v-model="novo" @criado="criado" />
  </q-page>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { api } from 'boot/axios'
import { getEcho } from 'src/services/echo'
import { useAtualizacaoSemConexao } from 'src/composables/useAtualizacaoSemConexao'
import ChatTicket from 'src/components/ajuda/ChatTicket.vue'
import NovoTicket from 'src/components/ajuda/NovoTicket.vue'
import {
  statusTickets,
  statusTicket,
  motivoTicket,
  horarioTicket,
  erroTicket,
} from 'src/utils/tickets'

const personas = [
  { value: 'passageiro', label: 'Passageiro' },
  { value: 'motorista', label: 'Motorista' },
]
const tickets = ref([])
const selecionado = ref(null)
const search = ref('')
const status = ref(null)
const persona = ref(null)
const page = ref(1)
const total = ref(0)
const ultimaPagina = ref(1)
const novo = ref(false)
const carregando = ref(false)
const erro = ref('')
const canalAutorizado = ref(false)
const atualizacaoHabilitada = ref(false)
let controller = null
let version = 0
let reloadTimer = null
let echo = null
let emRequisicao = false
let atualizacaoPendente = false

useAtualizacaoSemConexao(canalAutorizado, atualizacaoHabilitada, agendarAtualizacao)

async function carregar(silencioso = false) {
  if (silencioso && emRequisicao) {
    atualizacaoPendente = true
    return
  }
  controller?.abort()
  controller = new AbortController()
  const epoch = ++version
  emRequisicao = true
  carregando.value = !silencioso
  erro.value = ''
  try {
    const { data } = await api.get('/ajuda/tickets', {
      params: {
        search: search.value || undefined,
        status: status.value || undefined,
        solicitante_tipo: persona.value || undefined,
        page: page.value,
      },
      signal: controller.signal,
    })
    if (epoch !== version) return
    tickets.value = data.data
    total.value = data.meta.total
    ultimaPagina.value = Math.max(1, data.meta.last_page)
    if (page.value > ultimaPagina.value) page.value = ultimaPagina.value
  } catch (error) {
    if (epoch === version && error.code !== 'ERR_CANCELED') {
      erro.value = erroTicket(error)
      if (error.response?.status === 403) atualizacaoHabilitada.value = false
    }
  } finally {
    if (epoch === version) {
      carregando.value = false
      emRequisicao = false
      if (atualizacaoPendente) {
        atualizacaoPendente = false
        agendarAtualizacao()
      }
    }
  }
}
function agendarAtualizacao() {
  clearTimeout(reloadTimer)
  reloadTimer = setTimeout(() => {
    void carregar(true)
  }, 250)
}
function criado(ticket) {
  selecionado.value = ticket.id
  page.value = 1
  void carregar()
}
watch([search, status, persona], () => {
  if (page.value !== 1) page.value = 1
  else void carregar()
})
watch(page, () => {
  void carregar()
})
onMounted(() => {
  atualizacaoHabilitada.value = true
  void carregar()
  echo = getEcho()
  echo
    ?.private('ajuda.suporte')
    .listen('.ticket.atualizado', agendarAtualizacao)
    .subscribed(() => {
      canalAutorizado.value = true
      agendarAtualizacao()
    })
    .error(() => {
      canalAutorizado.value = false
    })
})
onBeforeUnmount(() => {
  version++
  controller?.abort()
  clearTimeout(reloadTimer)
  echo?.leave('ajuda.suporte')
})
</script>

<style scoped>
.lista-tickets {
  height: calc(100dvh - 174px);
  min-height: 420px;
}
.lista-scroll {
  overflow-y: auto;
}
@media (max-width: 599px) {
  .central-ajuda {
    padding: 12px;
  }
  .lista-tickets {
    height: calc(100dvh - 230px);
  }
}
</style>
