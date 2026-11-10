import { lerDocumento } from './extrairNadaConsta.js'
import { extrairValidadeSeguro } from './seguro.js'

// Apólices chegam com dezenas de páginas de condições gerais: a vigência fica no começo,
// e um PDF com texto não precisa do OCR, que levaria minutos para não achar nada.
export const extrairSeguro = (file, signal, onProgress) =>
  lerDocumento(file, signal, onProgress, {
    extrair: extrairValidadeSeguro,
    limitePaginas: Infinity,
    paginasLidas: 5,
    camposSuficientes: 1,
    semOcrSeTiverTexto: true,
  })
