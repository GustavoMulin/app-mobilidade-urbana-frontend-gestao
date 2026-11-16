const CHAVE = 'gestao:tema'

/** true (escuro), false (claro) ou 'auto' (segue o sistema), para $q.dark.set */
export function temaSalvo() {
  try {
    const valor = localStorage.getItem(CHAVE)
    return valor === 'escuro' ? true : valor === 'claro' ? false : 'auto'
  } catch {
    return 'auto'
  }
}

export function salvarTema(escuro) {
  try {
    localStorage.setItem(CHAVE, escuro ? 'escuro' : 'claro')
  } catch {
    // sem armazenamento no navegador: vale só até recarregar a página
  }
}
