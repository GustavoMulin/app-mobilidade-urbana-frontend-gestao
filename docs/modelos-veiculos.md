# Modelos de veículos

Página **Modelos de veículos** (`/modelos-veiculos`), no menu lateral. É o catálogo de marcas e modelos aceitos, com o **ano mínimo** do veículo em cada serviço. Quem tem `veiculos.consultar` vê o catálogo; cadastrar, editar e remover exige `veiculos.gerenciar` (Gestão e Admin).

## Tela

A lista é uma sanfona: cada linha é uma **marca**, com a quantidade de modelos. As marcas vêm **paginadas, 10 por página**, em ordem alfabética, com o paginador embaixo da lista e o resumo no topo (por exemplo, `435 marcas · 4097 modelos · página 1 de 44`). Buscar ou trocar o filtro volta para a primeira página. Ao abrir a marca, aparecem os **modelos dela** numa tabela (modelo, tipo, ano de entrega, ano de corrida ou moto, ano de elétrico, com traço quando o modelo não atende o serviço), com paginação de 10, 25 ou 50 linhas. Os modelos só são buscados quando a marca é aberta.

- **Busca** por marca ou modelo. Buscar uma marca traz todos os modelos dela; buscar um modelo traz as marcas que o têm, já com a tabela filtrada.
- **Filtro** Todos, Carros ou Motos. As contagens das marcas passam a contar só o que bate com o filtro.
- **Nova marca** e **Novo modelo** ficam no topo. Dentro de uma marca aberta, **Novo modelo da marca** já abre com a marca escolhida.
- Cada marca tem **editar** (renomear) e **remover**. Remover uma marca remove também todos os modelos dela, depois de uma confirmação.
- Cada modelo tem **editar** (também permite mudar de marca) e **remover**.

## Tabelas

`marcas_veiculos` guarda as marcas e `modelos_veiculos` guarda os modelos, ligada à marca por `marca_id` (excluir a marca exclui os modelos). A tabela `veiculos`, dos carros e motos reais dos motoristas, é outra coisa e não foi alterada.

| Tabela             | Campo                 | Significado                                                                               |
| ------------------ | --------------------- | ----------------------------------------------------------------------------------------- |
| `marcas_veiculos`  | `nome`                | Nome da marca. Único, sem diferenciar maiúsculas de minúsculas.                           |
| `modelos_veiculos` | `marca_id`            | Marca do modelo.                                                                          |
|                    | `modelo`              | Nome do modelo. Único dentro da marca; o mesmo nome em outra marca é permitido.           |
|                    | `tipo`                | `carro` ou `moto`.                                                                        |
|                    | `ano_minimo_entrega`  | Ano mínimo para entregas. Vazio: não atende.                                              |
|                    | `ano_minimo_corrida`  | Ano mínimo para corrida de passageiro (carro) ou moto de passageiro. Vazio: não atende.   |
|                    | `ano_minimo_eletrico` | Ano mínimo para a categoria elétrica. Só carro; moto não tem elétrico. Vazio: não atende. |

Os anos aceitos vão de 1900 até o ano seguinte ao atual.

## API

Todas em `/api/gestao`, com JWT de gestor.

| Método | Rota                            | Função                                                                                                                                                                                    |
| ------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/marcas-veiculos`              | Marcas paginadas, 10 por página (`page`), com `modelos_count` e o `modelos_total` de todas as páginas. Aceita `search` e `tipo`; com filtro, só vêm as marcas que têm modelo dentro dele. |
| GET    | `/marcas-veiculos/{id}/modelos` | Modelos da marca, com o mesmo `search` e `tipo`. Quando a busca bate com o nome da marca, vêm todos os modelos dela.                                                                      |
| POST   | `/marcas-veiculos`              | Cadastra a marca (`nome`). Retorna 201.                                                                                                                                                   |
| GET    | `/marcas-veiculos/{id}`         | Mostra a marca.                                                                                                                                                                           |
| PUT    | `/marcas-veiculos/{id}`         | Renomeia.                                                                                                                                                                                 |
| DELETE | `/marcas-veiculos/{id}`         | Remove a marca e os modelos dela.                                                                                                                                                         |
| POST   | `/modelos-veiculos`             | Cadastra o modelo (`marca_id`, `modelo`, `tipo` e os três anos). Retorna 201.                                                                                                             |
| GET    | `/modelos-veiculos/{id}`        | Mostra o modelo.                                                                                                                                                                          |
| PUT    | `/modelos-veiculos/{id}`        | Atualiza (envie todos os campos).                                                                                                                                                         |
| DELETE | `/modelos-veiculos/{id}`        | Remove.                                                                                                                                                                                   |

Erros de validação voltam em 422 com `errors` por campo. Sem permissão, 403.

## Banco e carga inicial

Duas migrations, na ordem: `2026_10_27_100000_create_marcas_veiculos_table.php` e `2026_10_27_100100_create_modelos_veiculos_table.php`.

```shell
php artisan migrate
php artisan db:seed --class=ModelosVeiculosSeeder
```

O seeder lê `database/seeders/arquivos/modelos-veiculos.json` (440 marcas e 4.099 modelos no arquivo, antes da limpeza abaixo) e converte o texto de cada modelo em anos. Exemplo: `"1996 (Envios Carro) / 2011 (UberX) / 2017 (Electric)"` vira entrega 1996, corrida 2011 e elétrico 2017.

- Rodar de novo não duplica nem sobrescreve o que foi editado na gestão: marcas e modelos que já existem são mantidos.
- Uma entrada do arquivo sem nome real (`VehicleModel.538585835`) é ignorada.
- Espaços sobrando no começo e no fim dos nomes são removidos.
- Marcas que o arquivo traz com duas grafias são unificadas: `Mercedes Benz` vira `Mercedes-Benz`, `Chirey` vira `Chery`, `JAC Motors` vira `JAC`, `Hyundai Motors` vira `Hyundai` e `Changan` vira `Chang'an`. Um modelo que fica repetido depois da união (o Tiggo 8 Pro, que estava em Chery e Chirey) entra uma vez só.
- Com isso o banco fica com **435 marcas e 4.097 modelos**.

`php artisan db:seed` (sem `--class`) também carrega o catálogo, em qualquer ambiente. Em `local` e `testing` ele roda em seguida a demonstração completa e os banners.

O catálogo ainda não é consultado pelo cadastro de veículos: hoje ele só é administrado aqui.
