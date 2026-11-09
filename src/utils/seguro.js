import { dataIso, linhasDaPagina, normalizar } from './nadaConsta.js'

const DATA = '(\\d{2}[./-]\\d{2}[./-]\\d{4})'
// "Vigência: das 24h de 01/01/2026 às 24h de 01/01/2027": a validade é a segunda data.
const PERIODO = new RegExp(`VIGENCIA.{0,60}?${DATA}.{0,40}?${DATA}`, 'g')
const ROTULADA = new RegExp(
  `(?:VALIDADE|VALID[AO] ATE|(?:TERMINO|FIM|FINAL)(?: D[AE])? VIGENCIA|VIGENCIA ATE)[^\\d]{0,20}${DATA}`,
  'g',
)

// A data lida é só uma sugestão: a gestão confere com a prévia, e sem ela preenche à mão.
export function extrairValidadeSeguro(pages, conflitos = new Set()) {
  const datas = new Set()
  for (const pagina of pages) {
    const texto = normalizar(typeof pagina === 'string' ? pagina : linhasDaPagina(pagina)).replace(
      /\s+/g,
      ' ',
    )
    for (const [, inicio, fim] of texto.matchAll(PERIODO)) {
      if (dataIso(inicio) < dataIso(fim)) datas.add(dataIso(fim))
    }
    for (const [, data] of texto.matchAll(ROTULADA)) if (dataIso(data)) datas.add(dataIso(data))
  }
  if (datas.size > 1) {
    conflitos.add('data_validade')
    return {}
  }
  const [dataValidade] = datas
  return dataValidade ? { data_validade: dataValidade } : {}
}
