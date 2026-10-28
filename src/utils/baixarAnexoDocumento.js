import { api } from 'boot/axios'

// Baixa o arquivo que o motorista enviou como File, para passar pelas mesmas
// leituras automáticas usadas quando a gestão seleciona um arquivo.
export async function baixarAnexoDocumento(documento, lado = 'frente', signal) {
  const anexo = lado === 'verso' ? documento.verso : documento
  const { data } = await api.get(`/motorista-documentos/${documento.id}/download`, {
    params: { lado },
    responseType: 'blob',
    signal,
  })

  return new File([data], anexo?.name || `documento-${lado}`, {
    type: anexo?.mime_type || data.type,
  })
}
