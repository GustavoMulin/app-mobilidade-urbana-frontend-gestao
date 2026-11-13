# Avaliações e nota de motoristas e passageiros

Página **Configurações → Avaliações** (`/avaliacoes`), com a permissão `configuracoes.gerenciar`. Complementa `integracao-apps.md`.

## Regras

- **Nota base:** toda conta nova, de motorista ou de passageiro, começa com **5,0**. Ela vale até chegar a primeira avaliação real.
- **Nota:** depois da primeira avaliação real, a nota é a **média das últimas N avaliações reais** recebidas. N é definido na gestão (padrão **200**, de 1 a 5000). Avaliações mais antigas deixam de entrar na conta conforme chegam as novas.
- **Avaliação real:** a que a pessoa deu de fato. A nota 5 que o passageiro recebe sozinho quando não avalia a corrida (`automatica`) **não conta** na média nem na distribuição de estrelas.
- **Novo usuário:** quem tem menos de 20 corridas finalizadas aparece nos aplicativos com o selo "Novo usuário" (limite em `AVALIACOES_CORRIDAS_PARA_DEIXAR_DE_SER_NOVO`, no `.env` do backend).
- **Quem avalia quem:** o passageiro avalia o motorista (nota de 1 a 5, comentário e elogios) e o motorista avalia o passageiro (nota e comentário). Só corrida finalizada pode ser avaliada, uma vez por pessoa.

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
