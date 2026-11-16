/** Para busca: "São João" vira "sao joao" (sem acento e em minúsculas). */
export function semAcento(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
