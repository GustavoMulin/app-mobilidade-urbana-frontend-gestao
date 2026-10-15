# Central de ajuda: tickets e chat

A gestão agora atende em `/central-ajuda`, com a identidade visual do aplicativo: cartões claros, azul principal e conversa ao lado da fila de tickets. Atendimento/suporte, Gestão e Admin acessam o módulo pela permissão `ajuda.gerenciar`.

## Modelo de dados

Mantivemos `chamados_ajuda`, que já representava os pedidos de ajuda do app. A migration `2026_10_14_130000_adiciona_chat_aos_chamados_ajuda.php` estende essa tabela e transforma a descrição de cada chamado antigo na primeira mensagem, conservando ID, autor e data. Não é necessário recriar o banco.

| Tabela              | Campos principais                                                                                                                                           | Relações e índices                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `chamados_ajuda`    | `id` bigint, `motivo` varchar(80), `descricao` text, `solicitante_tipo` varchar(20), `status` varchar(20), datas de última mensagem, resolução e fechamento | Solicitante → `users`; corrida opcional → `corridas`; responsável opcional → `gestores`; índices por status/data e responsável/status |
| `chamado_mensagens` | `id` bigint, `autor_tipo` varchar(20), `autor_nome` varchar(255), `conteudo` text, `client_message_id` UUID opcional, timestamps                            | Ticket com exclusão em cascata; usuário/gestor opcionais com `nullOnDelete`; índice `(chamado_id,id)`; UUID único por ticket          |

As situações são definidas no enum PHP `StatusTicket` e validadas na API: `open`, `in_progress`, `pending`, `resolved`, `closed`. A coluna é string para permitir evolução sem alterações de um enum nativo do MySQL.

O solicitante é Passageiro ou Motorista. A mesma conta pode ter os dois perfis, mas cada ticket registra qual perfil originou o atendimento. Uma corrida só pode ser vinculada quando pertence ao perfil indicado. O outro participante da corrida não recebe acesso à conversa.

O Sistema registra mudanças de status e responsável. Não é uma conta que precisa existir em `users`. Gestores continuam em sua tabela e guard atuais; não acrescentamos credenciais à tabela de usuários.

## Regras do atendimento

- Assumir um ticket usa transação e bloqueio da linha. Dois operadores não podem assumir o mesmo ticket simultaneamente.
- A primeira resposta do suporte assume automaticamente um ticket sem responsável.
- Um operador consulta tickets de colegas, mas só o responsável responde ou altera o status. Admin pode intervir; a ação fica identificada no histórico.
- `pending` aguarda resposta do solicitante. Sua resposta retoma o atendimento. Um ticket resolvido também pode ser retomado pelo solicitante.
- O suporte reabre tickets resolvidos antes de responder. Para fechar é necessário resolver primeiro. Tickets fechados bloqueiam mensagens até serem reabertos pelo suporte.
- Cada tentativa de envio mantém um UUID. Repetir a mesma requisição devolve a mensagem já salva; alterar conteúdo ou autor com o mesmo UUID retorna 409.
- O servidor determina a identidade do autor. Campos de autor enviados pelo cliente são recusados.

## Fluxo e tempo real

1. O frontend envia a mensagem por HTTP com JWT, texto e UUID.
2. `TicketsController` valida acesso e dados; `TicketsAjudaService` bloqueia o ticket, salva a mensagem e atualiza o contexto em transação.
3. Após o commit, `TicketMensagemEnviada` entra na fila `broadcasts` e o worker publica pelo Reverb.
4. Echo recebe `.ticket.mensagem` no canal privado e busca as mensagens novas. O frontend deduplica pelo ID, inclusive quando a mesma mensagem chega pela resposta HTTP e pelo evento.

Os eventos implementam `ShouldBroadcast` e `ShouldDispatchAfterCommit`: o chat só anuncia mensagens persistidas. Isso segue a [documentação de broadcasting do Laravel 13](https://laravel.com/docs/13.x/broadcasting).

| Canal privado               | Autorização                                   | Conteúdo                                            |
| --------------------------- | --------------------------------------------- | --------------------------------------------------- |
| `ajuda.ticket.{id}.cliente` | Guard `jwt`, usuário dono do ticket           | Mensagens e alterações do seu ticket                |
| `ajuda.ticket.{id}.suporte` | Guard `gestores`, permissão `ajuda.gerenciar` | Mensagens e alterações do ticket                    |
| `ajuda.suporte`             | Guard `gestores`, mesma permissão             | Apenas ID de ticket alterado, para atualizar a fila |

O navegador da gestão autoriza em `/api/gestao/broadcasting/auth`; os aplicativos de passageiros/motoristas usam `/api/broadcasting/auth`. Os guards são separados, evitando colisões entre IDs de `users` e `gestores`.

No frontend, `src/services/echo.js` usa o cliente Axios do app para autorização, mantendo a renovação de JWT. A sessão encerra a conexão no logout. `useChatTicket.js` cancela requisições antigas ao trocar de conversa, recupera histórico por cursor e sincroniza após reconexão. Lista e chat suspendem as consultas periódicas quando o socket está conectado e o respectivo canal está autorizado. Se a conexão cair ou o canal não puder ser autorizado, consultam a cada 15 segundos como recuperação. Atualizações automáticas da lista acontecem em segundo plano, sem bloquear a interface com o carregamento.

`ChatTicket.vue` usa [QChatMessage do Quasar](https://quasar.dev/vue-components/chat/) com texto puro; HTML recebido em mensagens nunca é executado.

## API

Rotas da gestão, sob `/api/gestao`:

| Método | Rota                            | Uso                                                                                                      |
| ------ | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| GET    | `/ajuda/tickets`                | Fila paginada; filtros `status`, `solicitante_tipo`, `search`, `page`, `per_page`                        |
| POST   | `/ajuda/tickets`                | Abrir em nome de usuário com `user_id`, `solicitante_tipo`, `motivo`, `descricao`, `corrida_id` opcional |
| GET    | `/ajuda/solicitantes`           | Buscar passageiros/motoristas por nome/CPF                                                               |
| GET    | `/ajuda/tickets/{id}`           | Contexto, solicitante, corrida e responsável                                                             |
| GET    | `/ajuda/tickets/{id}/mensagens` | Últimas 50; `before_id` para anteriores, `after_id` para novas; `limit` até 100                          |
| POST   | `/ajuda/tickets/{id}/mensagens` | Enviar `{conteudo, client_message_id}`                                                                   |
| POST   | `/ajuda/tickets/{id}/assumir`   | Assumir atendimento                                                                                      |
| PATCH  | `/ajuda/tickets/{id}/status`    | Alterar `{status}`                                                                                       |

Os aplicativos usam `/api/ajuda/tickets` para listar/criar e as mesmas rotas de detalhes/mensagens, com acesso restrito aos tickets próprios. As rotas antigas `/api/ajuda/chamados` continuam retornando nomes de status em português, para compatibilidade.

Exemplo para o aplicativo do solicitante:

```js
// apiCliente aponta para /api e envia o JWT de User, não o JWT de Gestor.
const { data } = await apiCliente.post(`/ajuda/tickets/${ticketId}/mensagens`, {
  conteudo: 'Preciso revisar o valor desta corrida.',
  client_message_id: crypto.randomUUID(), // Guarde este UUID para repetir uma tentativa.
})
echo
  .private(`ajuda.ticket.${ticketId}.cliente`)
  .listen('.ticket.mensagem', ({ mensagem }) => adicionarSemDuplicar(mensagem))
```

## Configuração local

Reverb já estava instalado no backend. O servidor utiliza `REVERB_SERVER_HOST/PORT`; a publicação HTTP usa `REVERB_HOST/PORT/SCHEME`. São funções distintas, como explica a [documentação do Reverb](https://laravel.com/docs/13.x/reverb).

Backend `.env`, preservando as credenciais existentes:

```dotenv
BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=database
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
# Configure REVERB_APP_ID, REVERB_APP_KEY e um REVERB_APP_SECRET forte somente no backend.
# Em produção, restrinja aos hosts dos seus aplicativos, sem protocolo:
REVERB_ALLOWED_ORIGINS=localhost,127.0.0.1
```

Frontend `.env`, com a mesma chave PÚBLICA do backend:

```dotenv
API_URL="http://localhost/api/"
REVERB_APP_KEY="mesma-chave-publica-do-backend"
REVERB_HOST="localhost"
REVERB_PORT="8080"
REVERB_SCHEME="http"
```

O segredo nunca deve ser colocado no frontend. Para testes por IP da rede, use o IP acessível pelos navegadores e inclua seus hosts em `REVERB_ALLOWED_ORIGINS`. Em produção, utilize HTTPS/WSS.

No backend:

```powershell
docker compose exec -T laravel.test php artisan migrate
docker compose exec -T laravel.test php artisan optimize:clear
```

O Supervisor inclui o processo Reverb e um worker dedicado `queue:work --queue=broadcasts`. Como seu arquivo é copiado na construção da imagem, reconstrua-a para manter o worker automático após reiniciar:

```powershell
docker compose build laravel.test
docker compose up -d --no-deps --force-recreate laravel.test
```

Se executar fora do Docker, mantenha estes processos separados:

```shell
php artisan reverb:start
php artisan queue:work --queue=broadcasts --sleep=1 --tries=3 --timeout=60
```

No frontend, `npm install` instala Echo/Pusher. Reinicie `npm run dev` depois de ajustar o `.env`.

## Validação e escopo

Testes locais ficam em `.local-tests` e não entram no commit. Cobrem isolamento de conversas, guards JWT distintos, concorrência de atendimento, autoria, UUID, status, paginação e compatibilidade das rotas antigas. O teste de Reverb utiliza servidor/credenciais temporários e somente o banco `testing`.

Esta entrega contempla tickets, mensagens textuais e imagens, leitura por operador e gestão do atendimento. A interface do chat nos aplicativos de Passageiro/Motorista deve consumir os endpoints acima; este repositório contém a interface de gestão.

## Imagens na conversa

No chat, use o botão de imagem ou cole um print com `Ctrl + V`. É possível enviar apenas a imagem ou acrescentar texto. Clique na miniatura para ampliar e baixar. `Enter` envia a mensagem e `Shift + Enter` quebra a linha.

- Até 3 imagens por mensagem, com até 5 MB cada, nos formatos JPG, PNG ou WebP.
- A API também valida o conteúdo do arquivo, as dimensões (até 12.000 pixels por lado) e o limite de 40 megapixels.
- A migration `2026_10_15_190000_create_chamado_mensagem_anexos_table.php` cria os metadados em `chamado_mensagem_anexos`. Os arquivos ficam no disco privado `ticket_anexos`, em `storage/app/private/ticket_anexos`; não precisam de `storage:link`.
- O envio mantém o endpoint `POST /ajuda/tickets/{id}/mensagens`. Para imagens, utilize `multipart/form-data` com `client_message_id`, `conteudo` opcional e `imagens[]`. Deixe o cliente HTTP definir o boundary.
- Repita o mesmo UUID, texto e arquivos em caso de falha para evitar duplicação. Alterar o conteúdo ou as imagens com um UUID já usado retorna 409.

Exemplo para o aplicativo do solicitante (base `/api`):

```js
const formulario = new FormData()
formulario.append('client_message_id', crypto.randomUUID())
formulario.append('conteudo', 'Segue o print do problema.')
formulario.append('imagens[]', arquivo)
const { data } = await apiCliente.post(`/ajuda/tickets/${ticketId}/mensagens`, formulario)
```

As mensagens retornam `anexos`, contendo `id`, `nome`, `mime_type`, `tamanho`, `largura`, `altura` e `url`. A URL é relativa à base da API do perfil autenticado:

| Método | Rota                                                                     | Autorização                                |
| ------ | ------------------------------------------------------------------------ | ------------------------------------------ |
| GET    | `/api/ajuda/tickets/{ticket}/mensagens/{mensagem}/anexos/{anexo}`        | JWT do solicitante dono do ticket          |
| GET    | `/api/gestao/ajuda/tickets/{ticket}/mensagens/{mensagem}/anexos/{anexo}` | JWT do operador com acesso atual ao ticket |

O GET retorna o arquivo binário. No navegador, busque com Axios autenticado e `responseType: 'blob'`, depois gere uma URL com `URL.createObjectURL`. Não coloque o JWT na URL. Um operador que perde acesso ao ticket também perde acesso aos seus anexos na API. A resposta e o evento de mensagem incluem os metadados dos anexos; o evento só é disparado após a persistência da mensagem e das imagens.
