<template>
  <q-card flat bordered class="chat-ticket column no-wrap">
    <div v-if="carregando" class="col flex flex-center">
      <q-spinner color="primary" size="40px" />
    </div>
    <template v-else-if="ticket">
      <q-card-section class="q-pb-sm">
        <div class="row items-center q-gutter-sm">
          <q-btn
            v-if="$q.screen.lt.md"
            flat
            round
            icon="arrow_back"
            aria-label="Voltar aos tickets"
            @click="$emit('voltar')"
          />
          <div class="col">
            <div class="text-overline text-primary">{{ ticket.protocolo }}</div>
            <div class="text-h6">{{ motivoTicket(ticket.motivo) }}</div>
          </div>
          <q-badge
            :color="statusTicket(ticket.status).color"
            :label="statusTicket(ticket.status).label"
          />
        </div>
        <div class="row items-center q-gutter-sm q-mt-sm text-grey-8">
          <q-icon :name="ticket.solicitante_tipo === 'motorista' ? 'directions_car' : 'person'" />
          <span
            >{{ ticket.solicitante?.name }} ·
            {{ ticket.solicitante_tipo === 'motorista' ? 'Motorista' : 'Passageiro' }}</span
          >
        </div>
        <div v-if="ticket.corrida" class="text-caption q-mt-xs">
          Corrida {{ ticket.corrida.codigo_corrida || ticket.corrida.id }} ·
          {{ ticket.corrida.status }}
        </div>
        <div class="row items-center justify-between q-mt-md q-gutter-sm">
          <span class="text-caption text-grey-7">{{
            ticket.gestor_responsavel
              ? `Atendimento: ${ticket.gestor_responsavel.name}`
              : 'Aguardando um atendente'
          }}</span>
          <div class="row q-gutter-sm">
            <q-btn
              v-if="!ticket.gestor_responsavel && !finalizado"
              outline
              dense
              color="primary"
              label="Assumir"
              :loading="operando"
              @click="acao('assumir')"
            />
            <q-btn
              outline
              dense
              color="primary"
              label="Alterar status"
              icon-right="expand_more"
              :disable="!podeAtender || operando"
            >
              <q-menu
                ><q-list style="min-width: 200px"
                  ><q-item
                    v-for="item in destinos"
                    :key="item.value"
                    clickable
                    v-close-popup
                    @click="acao('status', item.value)"
                    ><q-item-section>{{ item.label }}</q-item-section></q-item
                  ></q-list
                ></q-menu
              >
            </q-btn>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <div ref="mensagensEl" class="col mensagens q-pa-md" aria-live="polite">
        <div v-if="maisAntigas" class="text-center q-mb-md">
          <q-btn
            flat
            color="primary"
            label="Mensagens anteriores"
            :loading="historico"
            @click="carregarAntigas"
          />
        </div>
        <template v-for="message in mensagens" :key="message.id">
          <div
            v-if="message.autor_tipo === 'sistema'"
            class="text-center text-caption text-grey-7 q-my-md"
          >
            {{ message.conteudo }}
            <span class="block">{{ horarioTicket(message.created_at) }}</span>
          </div>
          <q-chat-message
            v-else
            :name="message.autor_nome"
            :text="[message.conteudo]"
            :stamp="horarioTicket(message.created_at)"
            :sent="message.autor_tipo === 'gestor' && message.gestor_id === auth.user?.id"
            :bg-color="message.autor_tipo === 'gestor' ? 'blue-1' : 'grey-2'"
            text-color="grey-10"
          />
        </template>
      </div>
      <q-separator />
      <q-card-section class="q-pa-sm">
        <q-banner v-if="erro" dense rounded class="bg-red-1 text-negative q-mb-sm" role="alert">{{
          erro
        }}</q-banner>
        <div v-if="!podeAtender" class="text-caption text-grey-7 q-mb-sm">
          Outro operador está atendendo este ticket.
        </div>
        <div v-else-if="finalizado" class="text-caption text-grey-7 q-mb-sm">
          Reabra o ticket para continuar a conversa.
        </div>
        <q-form class="row items-end no-wrap q-gutter-sm" @submit="enviar">
          <q-input
            v-model="texto"
            class="col"
            outlined
            autogrow
            dense
            label="Escreva sua mensagem"
            :maxlength="4000"
            :disable="!podeAtender || finalizado || enviando"
            @keydown.ctrl.enter.prevent="enviar"
          />
          <q-btn
            color="primary"
            round
            icon="send"
            type="submit"
            aria-label="Enviar mensagem"
            :loading="enviando"
            :disable="!podeAtender || finalizado || !texto.trim()"
          />
        </q-form>
        <div class="row justify-between text-caption text-grey-6 q-mt-xs">
          <span :class="{ invisible: $q.screen.lt.sm }">Ctrl + Enter para enviar</span
          ><span>{{
            conectadoChat && autenticadoCanal ? 'Em tempo real' : 'Atualização periódica'
          }}</span>
        </div>
      </q-card-section>
    </template>
    <div v-else class="col flex flex-center q-pa-lg text-grey-7">
      <div class="text-center">
        <q-icon name="forum" size="64px" color="blue-2" />
        <p class="q-mt-md">{{ erro || 'Selecione um ticket para iniciar o atendimento.' }}</p>
        <q-btn v-if="erro" flat color="primary" label="Tentar novamente" @click="abrir(ticketId)" />
      </div>
    </div>
  </q-card>
</template>

<script setup>
import { computed, ref, toRef, watch, nextTick } from 'vue'
import { useAuthStore } from 'src/stores/auth'
import { useChatTicket } from 'src/composables/useChatTicket'
import { conectadoChat } from 'src/services/echo'
import { statusTickets, statusTicket, motivoTicket, horarioTicket } from 'src/utils/tickets'

const props = defineProps({ ticketId: { type: Number, default: null } })
const emit = defineEmits(['atualizado', 'voltar'])
const auth = useAuthStore()
const {
  ticket,
  mensagens,
  carregando,
  enviando,
  historico,
  maisAntigas,
  erro,
  texto,
  operando,
  autenticadoCanal,
  abrir,
  antigas,
  enviar,
  acao,
} = useChatTicket(toRef(props, 'ticketId'), () => emit('atualizado'))
const mensagensEl = ref(null)
const finalizado = computed(() => ['resolved', 'closed'].includes(ticket.value?.status))
const podeAtender = computed(
  () =>
    !ticket.value?.gestor_responsavel ||
    ticket.value.gestor_responsavel.id === auth.user?.id ||
    auth.user?.perfil_acesso === 'admin',
)
const destinos = computed(() =>
  statusTickets.filter(
    (item) =>
      item.value !== ticket.value?.status &&
      (item.value !== 'closed' || ticket.value?.status === 'resolved') &&
      (ticket.value?.status !== 'closed' || ['open', 'in_progress'].includes(item.value)),
  ),
)
watch(
  () => mensagens.value.at(-1)?.id,
  async () => {
    await nextTick()
    if (mensagensEl.value) mensagensEl.value.scrollTop = mensagensEl.value.scrollHeight
  },
)
async function carregarAntigas() {
  const previous = mensagensEl.value?.scrollHeight || 0
  const top = mensagensEl.value?.scrollTop || 0
  await antigas()
  await nextTick()
  if (mensagensEl.value)
    mensagensEl.value.scrollTop = top + mensagensEl.value.scrollHeight - previous
}
</script>

<style scoped>
.chat-ticket {
  height: calc(100dvh - 174px);
  min-height: 420px;
}
.mensagens {
  overflow-y: auto;
  overscroll-behavior: contain;
}
.mensagens :deep(.q-message-text-content) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (max-width: 1023px) {
  .chat-ticket {
    height: calc(100dvh - 90px);
    min-height: 0;
  }
}
</style>
