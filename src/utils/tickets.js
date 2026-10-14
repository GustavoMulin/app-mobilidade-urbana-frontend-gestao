export const statusTickets = [
  { value: 'open', label: 'Aberto', color: 'blue' },
  { value: 'in_progress', label: 'Em atendimento', color: 'primary' },
  { value: 'pending', label: 'Aguardando resposta', color: 'orange-8' },
  { value: 'resolved', label: 'Resolvido', color: 'positive' },
  { value: 'closed', label: 'Fechado', color: 'grey-7' },
]

export const motivosTickets = [
  { value: 'corrida_com_problema', label: 'Problema na corrida' },
  { value: 'tarifa_incorreta', label: 'Tarifa incorreta' },
  { value: 'objeto_esquecido', label: 'Objeto esquecido' },
  { value: 'motorista_ou_passageiro', label: 'Motorista ou passageiro' },
  { value: 'outro', label: 'Outro assunto' },
]

export const statusTicket = (value) =>
  statusTickets.find((item) => item.value === value) || statusTickets[0]
export const motivoTicket = (value) =>
  motivosTickets.find((item) => item.value === value)?.label || value
export const erroTicket = (error) =>
  error.response?.data?.message || 'Não foi possível concluir a ação. Tente novamente.'
export function horarioTicket(value) {
  return value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value),
      )
    : ''
}

export function identificadorMensagem() {
  if (crypto.randomUUID) return crypto.randomUUID()
  // getRandomValues também funciona ao testar o app por HTTP na rede local.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
