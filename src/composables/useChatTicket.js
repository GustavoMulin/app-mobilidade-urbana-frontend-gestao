import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { api } from 'boot/axios'
import { getEcho } from 'src/services/echo'
import { erroTicket, identificadorMensagem } from 'src/utils/tickets'
import { useAtualizacaoSemConexao } from 'src/composables/useAtualizacaoSemConexao'

export function useChatTicket(ticketId, atualizado) {
  const ticket = ref(null)
  const mensagens = ref([])
  const carregando = ref(false)
  const enviando = ref(false)
  const historico = ref(false)
  const maisAntigas = ref(false)
  const erro = ref('')
  const texto = ref('')
  const operando = ref(false)
  const autenticadoCanal = ref(false)
  const acessoNegado = ref(false)
  const atualizacaoHabilitada = computed(
    () => !!ticketId.value && !carregando.value && !acessoNegado.value,
  )
  let version = 0
  let controller = null
  let channelName = null
  let syncPromise = null
  let sincronizacaoPendente = false
  let pending = null
  let subscription = null

  useAtualizacaoSemConexao(autenticadoCanal, atualizacaoHabilitada, sincronizar)

  function mesclar(items) {
    const byId = new Map(mensagens.value.map((message) => [message.id, message]))
    items.forEach((message) => byId.set(message.id, message))
    mensagens.value = [...byId.values()].sort((a, b) => a.id - b.id)
  }

  async function detalhes(id, epoch) {
    const { data } = await api.get(`/ajuda/tickets/${id}`, { signal: controller.signal })
    if (epoch === version) ticket.value = data.data
  }

  function sincronizar() {
    if (!ticketId.value) return
    if (syncPromise) {
      sincronizacaoPendente = true
      return syncPromise
    }
    const epoch = version
    const id = ticketId.value
    const signal = controller.signal
    const task = (async () => {
      await detalhes(id, epoch)
      let cursor = mensagens.value.at(-1)?.id || 0
      let more = true
      while (more && epoch === version) {
        const { data } = await api.get(`/ajuda/tickets/${id}/mensagens`, {
          params: { after_id: cursor },
          signal,
        })
        if (epoch !== version) return
        mesclar(data.data)
        more = data.has_more
        cursor = data.next_after_id || cursor
      }
    })()
      .catch((error) => {
        if (epoch === version && error.code !== 'ERR_CANCELED') {
          erro.value = erroTicket(error)
          if ([403, 404].includes(error.response?.status)) {
            ticket.value = null
            acessoNegado.value = true
            if (channelName) subscription?.leave(channelName)
            autenticadoCanal.value = false
          }
        }
      })
      .finally(() => {
        if (syncPromise !== task) return
        syncPromise = null
        if (sincronizacaoPendente && epoch === version) {
          sincronizacaoPendente = false
          void sincronizar()
        }
      })
    syncPromise = task
    return task
  }

  function limpar() {
    version++
    controller?.abort()
    if (channelName) subscription?.leave(channelName)
    channelName = null
    syncPromise = null
    sincronizacaoPendente = false
    autenticadoCanal.value = false
  }

  async function abrir(id) {
    limpar()
    const epoch = version
    ticket.value = null
    mensagens.value = []
    texto.value = ''
    pending = null
    erro.value = ''
    acessoNegado.value = false
    enviando.value = false
    operando.value = false
    historico.value = false
    maisAntigas.value = false
    if (!id) return
    controller = new AbortController()
    carregando.value = true
    subscription = getEcho()
    if (subscription) {
      channelName = `ajuda.ticket.${id}.suporte`
      subscription
        .private(channelName)
        .listen('.ticket.mensagem', (event) => {
          if (epoch === version && event.ticket_id === id) {
            // Busca o intervalo para recuperar mensagens eventualmente perdidas ou fora de ordem.
            void sincronizar()
          }
        })
        .listen('.ticket.atualizado', () => {
          if (epoch === version) {
            void sincronizar()
            atualizado()
          }
        })
        .subscribed(() => {
          if (epoch === version) {
            autenticadoCanal.value = true
            if (!carregando.value) void sincronizar()
          }
        })
        .error(() => {
          if (epoch === version) autenticadoCanal.value = false
        })
    }
    try {
      await detalhes(id, epoch)
      const { data } = await api.get(`/ajuda/tickets/${id}/mensagens`, {
        signal: controller.signal,
      })
      if (epoch !== version) return
      mesclar(data.data)
      maisAntigas.value = data.has_more
      // Também cobre alterações entre a assinatura e a resposta HTTP inicial.
      await sincronizar()
    } catch (error) {
      if (epoch === version && error.code !== 'ERR_CANCELED') {
        erro.value = erroTicket(error)
        if ([403, 404].includes(error.response?.status)) acessoNegado.value = true
      }
    } finally {
      if (epoch === version) carregando.value = false
    }
  }

  async function antigas() {
    if (historico.value || !maisAntigas.value) return
    historico.value = true
    const epoch = version
    try {
      const { data } = await api.get(`/ajuda/tickets/${ticketId.value}/mensagens`, {
        params: { before_id: mensagens.value[0]?.id },
        signal: controller.signal,
      })
      if (epoch !== version) return
      mesclar(data.data)
      maisAntigas.value = data.has_more
    } catch (error) {
      if (epoch === version && error.code !== 'ERR_CANCELED') erro.value = erroTicket(error)
    } finally {
      if (epoch === version) historico.value = false
    }
  }

  async function enviar() {
    if (!texto.value.trim() || enviando.value) return
    const epoch = version
    const id = ticketId.value
    const conteudo = texto.value.trim()
    if (!pending || pending.conteudo !== conteudo) {
      pending = { conteudo, client_message_id: identificadorMensagem() }
    }
    enviando.value = true
    erro.value = ''
    try {
      const { data } = await api.post(`/ajuda/tickets/${id}/mensagens`, pending, {
        signal: controller.signal,
      })
      if (epoch !== version) return
      mesclar([data.data])
      texto.value = ''
      pending = null
      await sincronizar()
      atualizado()
    } catch (error) {
      if (epoch === version && error.code !== 'ERR_CANCELED') erro.value = erroTicket(error)
    } finally {
      if (epoch === version) enviando.value = false
    }
  }

  async function acao(tipo, status) {
    if (operando.value) return
    operando.value = true
    const epoch = version
    erro.value = ''
    try {
      const path = `/ajuda/tickets/${ticketId.value}/${tipo}`
      const response =
        tipo === 'status'
          ? await api.patch(path, { status }, { signal: controller.signal })
          : await api.post(path, {}, { signal: controller.signal })
      if (epoch !== version) return
      ticket.value = response.data.data
      await sincronizar()
      atualizado()
    } catch (error) {
      if (epoch === version && error.code !== 'ERR_CANCELED') {
        erro.value = erroTicket(error)
        void sincronizar()
      }
    } finally {
      if (epoch === version) operando.value = false
    }
  }

  watch(ticketId, abrir, { immediate: true })
  onBeforeUnmount(limpar)
  return {
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
  }
}
