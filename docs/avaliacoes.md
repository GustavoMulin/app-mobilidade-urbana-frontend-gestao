# Avaliações e nota de motoristas e passageiros

Página **Configurações → Avaliações** (`/avaliacoes`), com a permissão `configuracoes.gerenciar`. Complementa `integracao-apps.md`.

## Regras

- **Nota base:** toda conta nova, de motorista ou de passageiro, começa com **5,0**. Ela vale até chegar a primeira avaliação real.
- **Nota:** depois da primeira avaliação real, a nota é a **média das últimas N avaliações reais** recebidas. N é definido na gestão (padrão **200**, de 1 a 5000). Avaliações mais antigas deixam de entrar na conta conforme chegam as novas.
- **Avaliação real:** a que a pessoa deu de fato. A nota 5 que o passageiro recebe sozinho quando não avalia a corrida (`automatica`) **não conta** na média nem na distribuição de estrelas.
- **Novo usuário:** quem tem menos de 20 corridas finalizadas aparece nos aplicativos com o selo "Novo usuário" (limite em `AVALIACOES_CORRIDAS_PARA_DEIXAR_DE_SER_NOVO`, no `.env` do backend).
- **Quem avalia quem:** o passageiro avalia o motorista (nota de 1 a 5, comentário e elogios) e o motorista avalia o passageiro (nota e comentário). Só corrida finalizada pode ser avaliada, uma vez por pessoa.

## Faixas de avaliação

A nota é classificada em três faixas, definidas na mesma página (**Configurações → Avaliações**):

| Faixa | Regra (padrão) |
|---|---|
| **Excelente** | nota acima de **4,85** |
| **Atenção** | de **4,51** a **4,85** (os dois limites pertencem a esta faixa) |
| **Alto risco / Restrito** | nota abaixo de **4,51** |

- **Limites:** `avaliacoes_faixa_excelente_acima` (4,85) e `avaliacoes_faixa_alto_risco_abaixo` (4,51), de 1 a 5 com até duas casas, em `PUT /api/gestao/configuracoes`. O limite de alto risco não pode ser maior que o de excelente. A nota é comparada com duas casas.
- **Onde aparece:** no perfil do motorista no app (`faixa` e `faixas` em `GET /api/motorista/me/perfil`). Conta nova, com a nota base 5,0, é Excelente.
- **O que a faixa decide:** veja "Alertas e penalidades por nota" abaixo.

## Alertas e penalidades por nota

Valem para motoristas e passageiros, no mesmo card da página (**Alertas e penalidades por nota**), no mesmo desenho das restrições por taxa de finalização.

| Faixa | Motorista | Passageiro |
|---|---|---|
| **Excelente** | nada | nada |
| **Atenção** | aviso educativo, sem prazo e sem penalidade | aviso educativo, sem prazo e sem penalidade |
| **Alto risco** | alerta com prazo para recuperar a nota; vencido o prazo e ainda em Alto risco, **restrição de corridas** (não fica online, não aceita nem propõe; a corrida em andamento termina) | alerta com prazo; vencido o prazo, **suspensão temporária** (não pede corrida). Na reincidência, **bloqueio permanente** |

- **Mínimo de avaliações:** a faixa só vale com o mínimo de avaliações reais (padrão 10); antes disso ninguém é afetado, nem uma nota 1 isolada.
- **Prazo para recuperar:** padrão 7 dias. Se a nota voltar para fora de Alto risco antes do prazo, o alerta fecha sem penalidade. Quem voltou para Excelente recebe um aviso de que a nota normalizou.
- **Motorista:** restrições de 5, 10 e 15 dias; a partir da 4ª alterna entre 10 e 15 (`restricao_nota_motorista_duracoes_dias`).
- **Passageiro:** suspensão de 7 dias (`restricao_nota_passageiro_suspensao_dias`). Depois de N suspensões a seguinte é o bloqueio permanente (`restricao_nota_passageiro_bloqueio_apos`, padrão 2; 0 = nunca bloqueia). Passada a suspensão a conta volta, mas segue monitorada: se a nota continuar em Alto risco, um novo ciclo recomeça.
- **Bloqueio permanente:** não tem data de término; só sai quando a gestão libera.
- **Modo sombra:** com `restricoes_nota_ativas` desligado (padrão) tudo é registrado como **simulado**: não bloqueia nem avisa a pessoa. Serve para ver quem seria afetado antes de ligar.
- **Quando reavalia:** a cada avaliação real recebida. A nota 5 automática (passageiro que não avaliou) não conta. A cada 5 minutos o agendador vence prazos e encerra suspensões.
- **Onde bloqueia:** motorista em `atualizarDisponibilidade` (ficar online) e ao aceitar ou propor corrida; passageiro ao pedir corrida (`403` com a data do fim, ou "bloqueada" se permanente).
- **Penalidade manual:** a gestão aplica e libera por `restricoes-nota` (vale mesmo com o modo sombra ligado).

### API da gestão (`configuracoes.gerenciar`)

- `PUT /api/gestao/configuracoes`: `restricoes_nota_ativas`, `restricao_nota_minimo_avaliacoes` (1 a 1000), `restricao_nota_prazo_dias` (1 a 90), `restricao_nota_motorista_duracoes_dias` (ex.: `5,10,15`), `restricao_nota_passageiro_suspensao_dias` (1 a 365), `restricao_nota_passageiro_bloqueio_apos` (0 a 20). A leitura devolve também os valores `_padrao`.
- `GET /api/gestao/restricoes-nota?aba=alertas|restritos|historico&perfil=motorista|passageiro&search=`
- `POST /api/gestao/restricoes-nota` com `perfil`, `perfil_id`, `motivo` e `dias` (sem `dias` é bloqueio permanente, só para passageiro).
- `POST /api/gestao/restricoes-nota/{id}/liberar` com `motivo`.

### Para os aplicativos

`situacao_nota` (`estado`: `em_dia`, `alerta` ou `restrito`; `faixa`, `prazo_ate`, `restricao_ate`, `bloqueio_permanente`) vem em `GET /api/motorista/me/perfil` e em `GET /api/usuario-logado` do passageiro. Em modo sombra o alerta não aparece. Os avisos também chegam como notificação e push.

Ainda não existe uma tela para listar alertas e penalidades por nota na gestão (só a API) nem um aviso na interface dos aplicativos.

## Elogios

O passageiro pode marcar elogios ao avaliar o motorista: bom condutor, sabe o caminho, veículo limpo, pontual, educado e simpático (`elogios` em `POST /api/avaliacoes-corridas`). O motorista não elogia o passageiro: o campo é ignorado.

## Onde a nota aparece

| Onde | Campos |
|---|---|
| Perfil do motorista no app (`GET /api/motorista/me/perfil`) | `nota`, `nota_base`, `avaliacoes`, `novo`, `janela_da_media`, `distribuicao`, `elogios`, `notas_agradecimento`, `selos`, `verificacoes` |
| Menu do motorista (`GET /api/motorista/me/estatisticas`) | `nota_motorista`, `avaliacoes_recebidas` |
| Passageiro vê o motorista (`motorista_info` da corrida atual e propostas do Negocia) | `nota`, `corridas`, `novo` |
| Motorista vê o passageiro (`passageiro` da corrida atual e ofertas) | `nota`, `corridas`, `novo` (`passageiro_nota`, `passageiro_corridas`, `passageiro_novo` nas ofertas) |
| Passageiro vê a própria nota (`GET /api/usuario-logado`) | `nota_passageiro`, `corridas_passageiro`, `passageiro_novo` |

## Perfil do motorista

- **Notas de agradecimento:** comentários de avaliações reais com nota 4 ou 5, com o primeiro nome de quem avaliou (`GET /api/motorista/me/notas-agradecimento`, paginado).
- **Selos:** de cada tipo vale só o maior nível já alcançado: corridas finalizadas (100, 500, 1000, 5000, 10000), avaliações de 5 estrelas (10, 50, 100, 500, 1000) e tempo na plataforma (6, 12, 24, 36 meses).
- **Verificações:** antecedentes (documento "nada consta" aprovado), CNH, CRLV (veículo aprovado) e foto de perfil.

## Configuração

`PUT /api/gestao/configuracoes` com `avaliacoes_media_ultimas` (1 a 5000). A leitura devolve também `avaliacoes_media_ultimas_padrao`.
