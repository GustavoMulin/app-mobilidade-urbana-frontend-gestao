# Taxas dos motoristas

Menu **Configurações → Taxas dos motoristas**, com três páginas: **Mínimos** (`/taxas-motoristas`), **Exceções** (`/taxas-motoristas/excecoes`) e **Desempenho** (`/taxas-motoristas/desempenho`). Todas exigem `configuracoes.gerenciar`. Complementa `integracao-apps.md`.

## Regras

Toda conta nova começa em **100%** nas duas taxas, que são recalculadas a cada evento.

**Taxa de aceitação** (mês corrente): chamadas aceitas ÷ chamadas que tocaram na tela do motorista.

- Pesa contra: recusa manual e chamada deixada tocar até o fim (tempo esgotado). O app avisa quando a chamada aparece (`POST /api/motorista/corridas/{id}/tocou`); se o app não responder, o servidor fecha a chamada como tempo esgotado depois de 35 s (20 s de toque mais 15 s de folga).
- Não pesa: chamada duplicada, chamada que o passageiro cancelou em até o tempo configurado depois de tocar, corrida já pega por outro motorista e a categoria **Negocia** (nem quando o passageiro escolhe o motorista).
- Vale a primeira resposta do motorista: se ele recusa e depois aceita a mesma corrida, conta como aceita.

**Taxa de finalização** (últimos 30 dias): corridas finalizadas ÷ (finalizadas + canceladas pelo motorista + desistências de grupo).

- Pesa contra: cancelar depois do aceite e desistir de uma corrida em grupo depois de aceitar (uma vez por desistência, não por passageiro do grupo).
- Não pesa: cancelamento do passageiro ou do sistema e a ausência do passageiro (`nao_comparecimento`).
- A categoria Negocia **conta** aqui: depois de escolhido, cancelar pesa normalmente.

## Páginas

- **Mínimos:** taxa de finalização mínima (padrão 70%). No app do motorista, a finalização fica vermelha abaixo dela.
- **Exceções:** tempo limite do cancelamento do passageiro (padrão 120 s) e intervalo da chamada duplicada (padrão 5 min; 0 desliga). A regra do Negocia é fixa.
- **Desempenho:** as duas taxas de cada motorista com as contagens, filtro "só abaixo da mínima" e, em **Eventos**, cada fato que formou as taxas, inclusive os desconsiderados com o motivo.

## API

- `GET/PUT /api/gestao/configuracoes`: `taxa_finalizacao_minima`, `taxas_cancelamento_passageiro_segundos`, `taxas_duplicada_janela_minutos` (cada um com a variante `_padrao` na leitura). O `PUT` aceita qualquer subconjunto.
- `GET /api/gestao/taxas-motoristas?search=&abaixo_minimo=1&page=`
- `GET /api/gestao/taxas-motoristas/{motorista}/eventos?taxa=aceitacao|finalizacao&somente_desconsiderados=1`
- `GET /api/motorista/me/estatisticas` (app): `taxa_aceitacao`, `taxa_finalizacao`, `taxa_finalizacao_minima` e as contagens.

## Dados e rotinas (backend)

- Livro `motorista_taxa_eventos`: um fato por linha (taxa, resultado, motivo, `desconsiderado_motivo`). As taxas são calculadas dele.
- Retrato diário `motorista_taxas_diarias`: gravado às 00:10 pelo comando `taxas:fechar-dia` (aceita `--data=AAAA-MM-DD`).
- `taxas:reconstruir`: monta o livro a partir do histórico de corridas e chamadas; pode rodar de novo sem duplicar.
- Job a cada 10 s fecha as chamadas que tocaram e ficaram sem resposta.
- O agendador e as filas são processos de longa duração: reinicie `scheduler`, `queue-push` e `queue-broadcasts` depois de atualizar o backend.

## Restrições por finalização baixa (ciclo mensal, como na 99)

Página **Restrições** (`/taxas-motoristas/restricoes`) e regras em **Mínimos**.

1. **Alerta:** com a finalização abaixo da mínima (e ao menos o mínimo de corridas encerradas nos últimos 30 dias, padrão 10), abre-se um alerta com prazo até o fim do **dia 14** do mês (segunda semana). Com menos de 3 dias até o prazo, vale o do mês seguinte. O motorista é avisado (notificação e push).
2. **Recuperou antes do prazo:** o alerta fecha como `recuperada`, sem penalidade.
3. **Prazo venceu e a taxa continua abaixo:** restrição de corridas de **5 dias**. O motorista não consegue ficar online (a corrida em andamento termina normalmente) e é avisado do início e do fim.
4. **Reincidência:** se no mês seguinte a taxa continua abaixo, a restrição sobe para **10** e depois **15 dias**; a 4ª em diante alterna entre 10 e 15. Passar um mês sem restrição volta ao primeiro degrau. No máximo uma restrição automática por mês.
5. **Sem zerar a taxa:** a taxa não recomeça em 100% depois da restrição; ela se recupera com novas corridas finalizadas e conforme os cancelamentos saem da janela de 30 dias. No app, o aviso mostra quantas corridas finalizadas faltam para voltar à mínima.

**Modo sombra:** com a opção "Aplicar as restrições" desligada (padrão), as restrições automáticas são só registradas, marcadas como **Simuladas**: ninguém é bloqueado nem recebe aviso. Serve para conferir quem seria restrito antes de ligar.

**Gestão:** as abas Em alerta, Restritos e Histórico listam os casos. A gestão pode **aplicar** uma restrição manual (duração e motivo obrigatórios) e **liberar** quem está restrito (motivo obrigatório). As ações manuais valem mesmo com o modo sombra ligado e ficam registradas com o gestor.

Regras configuráveis (`PUT /api/gestao/configuracoes`): `restricoes_taxa_ativas`, `restricao_prazo_dia` (14), `restricao_antecedencia_dias` (3), `restricao_minimo_corridas` (10), `restricao_duracoes_dias` (`5,10,15`).

API da gestão: `GET /api/gestao/restricoes-motoristas?aba=alertas|restritos|historico&search=`, `POST /api/gestao/restricoes-motoristas` (`motorista_id`, `dias`, `motivo`) e `POST /api/gestao/restricoes-motoristas/{id}/liberar` (`motivo`). No app, `GET /api/motorista/me/estatisticas` traz `situacao_taxa` (`estado`, `prazo_ate`, `restricao_ate`, `faltam_corridas`); no modo sombra o estado é sempre `em_dia`.

Rotinas: a cada 5 min vencem os prazos e terminam as restrições; às 00:20 uma varredura reavalia quem teve movimento recente.

O bloqueio está em `CompartilhamentoVeiculoService::atualizarDisponibilidade` (ficar online, inclusive o retorno automático depois de uma corrida) e em `DespachoCorridaService::validarMotoristaParaCorrida` (aceitar ou propor).

## Ainda não existe

Áreas de risco (exceção planejada), cancelamento revisado pela gestão (marcar um cancelamento como desconsiderado) e a restrição parcial (por categoria).
