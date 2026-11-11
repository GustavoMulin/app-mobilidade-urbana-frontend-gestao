export const ICONES_DOCUMENTO = {
  cnh: 'badge',
  crlv: 'directions_car',
  nada_consta: 'gavel',
  seguro_obrigatorio: 'health_and_safety',
}

export const STATUS_FILA = [
  { value: 'em_analise', label: 'Em análise', color: 'orange' },
  { value: 'reprovado', label: 'Reprovados', color: 'red' },
  { value: 'aprovado', label: 'Aprovados', color: 'green' },
]

export function corDoStatus(status) {
  return STATUS_FILA.find((item) => item.value === status)?.color || 'grey'
}

export function rotuloDoStatus(status) {
  return STATUS_FILA.find((item) => item.value === status)?.label || 'Não enviado'
}

/** "há 3 dias", "há 2 h", "há 15 min" a partir de uma data ISO. */
export function tempoDecorrido(data, agora = new Date()) {
  if (!data) return ''
  const minutos = Math.max(0, Math.floor((agora - new Date(data)) / 60000))
  if (minutos < 1) return 'agora mesmo'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`
}

/** Mais de 2 dias na fila pede atenção. */
export function atrasado(data, agora = new Date()) {
  return Boolean(data) && agora - new Date(data) > 2 * 24 * 60 * 60 * 1000
}

/**
 * CRLV (vínculo com o veículo) e seguro sem validade precisam de conferência dos dados
 * antes de aprovar; o backend recusa a aprovação direta nesses casos.
 */
export function precisaConferencia(documento) {
  if (documento.tipo_documento === 'crlv') return true
  if (documento.tipo_documento === 'seguro_obrigatorio') {
    return !documento.informacoes_complementares?.data_validade
  }
  return false
}
