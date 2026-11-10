# Renovação de documentos pelo app do motorista

Em **Perfil > Documentos pendentes** (tela "Documentos enviados"), o motorista acompanha o status de cada documento e, em **Enviar novo documento**, reenvia um que venceu ou foi recusado. Os documentos são cadastrados no primeiro acesso; este fluxo serve para renová-los.

## Fluxo no app

1. **Documento**: lista com CNH, Nada Consta e Seguro, com seleção por radio (igual à de veículos). O status de cada documento aparece só na tela "Documentos enviados". O CRLV não entra aqui, porque é enviado em **Meus veículos**. O botão **Próximo** segue com o documento escolhido.
2. **Formato**: documento físico (foto) ou digital (PDF).
3. **Requisitos**: o app mostra o que o documento precisa ter e o motorista envia. A CNH em foto exige frente e verso, em duas fotos seguidas; em PDF, vai um arquivo só.

A lista "Documentos enviados" mostra o último envio de cada documento (Aprovado, Em análise ou Recusado) com a data de envio.

## O que a gestão vê

O reenvio chega à tela de documentos do motorista como o envio mais recente daquele documento, em **Em análise**, e é aprovado ou recusado como qualquer outro. Os envios anteriores continuam guardados.

O motorista cadastrado pelo app guarda o nome e o CPF do usuário. Se a CNH vier sem o nome lido, fica o do usuário, e o motorista nunca aparece sem nome na gestão. A migration `2026_11_09_120000_preenche_nome_e_cpf_dos_motoristas.php` preenche quem já estava sem esses dados.

## Regras no backend

`POST /api/motorista/cadastro/documentos` aceita CNH, Nada Consta e Seguro de **motorista já ativo**. O CRLV de quem está ativo continua exigindo o cadastro de veículo (retorna 409).

Durante a análise de uma renovação, o motorista **continua ativo** se aquele documento já tinha sido aprovado antes. Se a gestão recusar o novo envio, o motorista volta a pendente e precisa reenviar.

Documento **em análise, ou aprovado e dentro da validade, não pode ser trocado pelo motorista**: a linha não abre, ele sai da lista de escolha e o backend responde 409. O envio só é liberado para documento não enviado, recusado ou vencido. Para corrigir um arquivo errado que está em análise, a gestão precisa reprová-lo. Sem nada a enviar, o botão **Enviar novo documento** fica desativado.

O documento aparece como **Vencido** quando a data passa:

- CNH: `cnh_expiracao` do motorista.
- Nada Consta: `data_validade`, quando a gestão preenche os dados da certidão.
- Seguro: `data_validade`, obrigatória para aprovar.
- CRLV não tem data de validade no sistema, só o exercício. Quando vencer, a gestão reprova com o motivo **Documento vencido**, o que libera o reenvio. O mesmo vale para CNH ou Nada Consta aprovados sem data.

Na CNH, uma data anterior ao envio não conta como vencimento desse documento: é o caso da CNH renovada que a gestão aprova sem atualizar o cadastro.

## Validade do Seguro

No diálogo do Seguro, a gestão preenche **Data de validade**. Ao abrir um arquivo sem data, ou selecionar um novo, as 5 primeiras páginas são lidas em busca do período de vigência ou da validade. Sem resultado, ou com datas diferentes, o aviso pede o preenchimento manual. A data lida é só uma sugestão e deve ser conferida com a prévia.

A validade é salva ao clicar em **Aprovar**, e a aprovação é recusada sem ela, inclusive pelo botão da lista. Em Seguro já aprovado sem data, use **Salvar validade**.

Motorista ativo com documento vencido **não fica online**: o backend recusa com 403 "Resolva as ações necessárias para ficar online". Quem já está online não é derrubado, mas não volta a ficar disponível ao fim da corrida.

O app não coleta a data de validade. Ela continua sendo conferida pela gestão ao aprovar o documento.

## Ações necessárias na home

Motorista que já foi aprovado uma vez (`motoristas.liberado_em`) continua na home mesmo pendente. Quem nunca foi aprovado segue na tela de liberação do cadastro.

Com pendência, a folha inferior da home mostra, já fechada, o título que alterna entre "Não é possível ficar conectado" e "A conta requer atenção", seguido da lista **Ações necessárias**:

- **Cadastre um veículo**: sem veículo e sem CRLV em análise. Abre **Meus veículos**.
- **Documento não enviado, recusado ou vencido**: abre o envio daquele documento. Vencimento só existe para documento com campo de validade (CNH, Nada Consta e Seguro).
- **Documento enviado · em análise**: só informa e fica na lista até a gestão decidir.
- **Veículo em análise** (ou "2 veículos em análise", com as placas): aparece só enquanto não há veículo aprovado. Abre **Meus veículos**. Vem de `veiculos_em_analise` em `GET /api/motorista/cadastro`.
- **Ative as permissões do app**: localização, fotos ou microfone que faltam.

O título só some quando a lista fica vazia, mesmo que todos os itens estejam em análise. Enquanto houver item na lista, os banners da Central de Publicidade não aparecem.

`acoes_necessarias` traz o que o servidor recusa ao conectar: documento recusado ou vencido, falta de veículo e, para quem não está ativo, CNH, Nada Consta ou Seguro nunca enviados. Com algum desses itens, tocar em **Conectar** vibra o celular e pisca a faixa do título em vermelho, sem chamar o servidor. Documento ou veículo em análise não entra nessa lista.

A home recarrega o cadastro a cada 30 segundos e sempre que o motorista volta ao app, para refletir o que a gestão aprovou ou reprovou.

Em desenvolvimento, a tela de liberação tem **Entrar sem documentos (dev)** (`POST /api/motorista/cadastro/liberar-dev`, só nos ambientes `local` e `testing`). Ele leva à home sem nada enviado, para testar a lista. **Pular e aprovar (dev)** continua aprovando com documentos fictícios.

## Conferência do tipo do arquivo

Antes de guardar o envio, o backend lê o texto do PDF ou da foto e confere se ele é do documento escolhido: uma CNH no campo do CRLV, ou um CRLV no campo da CNH, é recusado com a mensagem "O arquivo enviado parece ser um CRLV, e não uma CNH" e **não substitui o documento que já estava aprovado**. A mesma conferência vale para CNH (frente e verso), Nada consta e CRLV, no app e no envio pela gestão.

**O Seguro não é conferido**: qualquer PDF ou imagem aceito entra em análise, e cabe à gestão confirmar o documento ao aprovar. Um Seguro enviado no campo de outro documento continua sendo recusado.

- Arquivo ilegível ou sem relação com documento também é recusado, com a orientação de enviar uma foto nítida ou o PDF.
- O verso da CNH só é recusado quando é claramente de outro documento.
- O arquivo só é reconhecido como um documento quando traz termos próprios dele (por exemplo "Carteira Nacional de Habilitação" ou "Cat. Hab." na CNH, "RENAVAM" no CRLV, "antecedentes criminais" no Nada consta). Palavras soltas como "validade" e "registro" não bastam.
- Se a leitura do texto não estiver disponível no servidor (precisa de `pdftotext`, `pdftoppm` e `tesseract` com o idioma `por`), o envio é **recusado** com "Não foi possível verificar o documento agora". Fora o Seguro, nenhum arquivo entra sem conferência.
- Envios feitos antes desta conferência continuam salvos. Para achá-los, releia os anexos com `VerificacaoTipoDocumentoService::erro()`.

## Depois do envio

Ao enviar, o fluxo fecha e o motorista volta para a tela "Documentos enviados", que recarrega a lista e mostra o aviso "Documento enviado para análise", no mesmo estilo do aviso de veículo em uso. Se o envio falhar, o motorista continua no fluxo e vê o motivo na própria tela.
