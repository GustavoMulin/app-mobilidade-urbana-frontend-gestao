# Renovação de documentos pelo app do motorista

Em **Perfil > Documentos pendentes** (tela "Documentos enviados"), o motorista acompanha o status de cada documento e, em **Enviar novo documento**, reenvia um que venceu ou foi recusado. Os documentos são cadastrados no primeiro acesso; este fluxo serve para renová-los.

## Fluxo no app

1. **Documento**: lista com CNH, Nada Consta e Seguro, com seleção por radio (igual à de veículos). O status de cada documento aparece só na tela "Documentos enviados". O CRLV não entra aqui, porque é enviado em **Meus veículos**. O botão **Próximo** segue com o documento escolhido.
2. **Formato**: documento físico (foto) ou digital (PDF).
3. **Requisitos**: o app mostra o que o documento precisa ter e o motorista envia. A CNH em foto exige frente e verso, em duas fotos seguidas; em PDF, vai um arquivo só.

A lista "Documentos enviados" mostra o último envio de cada documento (Aprovado, Em análise ou Recusado) com a data de envio.

## O que a gestão vê

O reenvio chega à tela de documentos do motorista como o envio mais recente daquele documento, em **Em análise**, e é aprovado ou recusado como qualquer outro. Os envios anteriores continuam guardados.

## Regras no backend

`POST /api/motorista/cadastro/documentos` aceita CNH, Nada Consta e Seguro de **motorista já ativo**. O CRLV de quem está ativo continua exigindo o cadastro de veículo (retorna 409).

Durante a análise de uma renovação, o motorista **continua ativo** se aquele documento já tinha sido aprovado antes. Se a gestão recusar o novo envio, o motorista volta a pendente e precisa reenviar.

O app não coleta a data de validade. Ela continua sendo conferida pela gestão ao aprovar o documento.

## Conferência do tipo do arquivo

Antes de guardar o envio, o backend lê o texto do PDF ou da foto e confere se ele é do documento escolhido: uma CNH no campo do CRLV, ou um CRLV no campo da CNH, é recusado com a mensagem "O arquivo enviado parece ser um CRLV, e não uma CNH" e **não substitui o documento que já estava aprovado**. A mesma conferência vale para CNH (frente e verso), Nada consta, Seguro e CRLV, no app e no envio pela gestão.

- Arquivo ilegível ou sem relação com documento também é recusado, com a orientação de enviar uma foto nítida ou o PDF.
- O verso da CNH só é recusado quando é claramente de outro documento.
- O arquivo só é reconhecido como um documento quando traz termos próprios dele (por exemplo "Carteira Nacional de Habilitação" ou "Cat. Hab." na CNH, "RENAVAM" no CRLV, "antecedentes criminais" no Nada consta, "SPVAT" ou "DPVAT" no Seguro). Palavras soltas como "validade" e "registro" não bastam.
- Se a leitura do texto não estiver disponível no servidor (precisa de `pdftotext`, `pdftoppm` e `tesseract` com o idioma `por`), o envio é **recusado** com "Não foi possível verificar o documento agora". Nenhum arquivo entra sem conferência.
- Envios feitos antes desta conferência continuam salvos. Para achá-los, releia os anexos com `VerificacaoTipoDocumentoService::erro()`.

## Depois do envio

Ao enviar, o fluxo fecha e o motorista volta para a tela "Documentos enviados", que recarrega a lista e mostra o aviso "Documento enviado para análise", no mesmo estilo do aviso de veículo em uso. Se o envio falhar, o motorista continua no fluxo e vê o motivo na própria tela.
