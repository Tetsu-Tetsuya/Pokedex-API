# Pokédex Explorer

Aplicação web que consome a **PokéAPI v2** (somente `GET`) através de um backend
**Node.js + Express**, com frontend em HTML, CSS e JavaScript puro.

O projeto tem duas formas de execução, seguindo o roteiro "do monólito aos serviços":

| Modo | Comando | O que sobe |
|---|---|---|
| **Monólito** (Encontro 1) | `npm start` | 1 servidor Express na porta 3000 com frontend + API |
| **Microsserviços** (Desafio avançado) | `npm run start:micro` | API Gateway (3000) + Catálogo (3001) + Estatísticas (3002) + Favoritos (3003) |

## Como rodar

Pré-requisito: **Node.js 18 ou superior** (usa o `fetch` nativo).

```bash
npm install
npm start            # abra http://localhost:3000
npm test             # roda os 25 testes automatizados
```

Para o modo microsserviços: `npm run start:micro` e abra `http://localhost:3000`.
O frontend é o mesmo — ele só conhece `/api/...` e não sabe se do outro lado
existe um monólito ou um gateway.

## Arquitetura

### Inicial — backend único

```
Frontend  →  Node.js + Express  →  PokéAPI (GET)
```

### Desafio avançado — microsserviços

```
                Frontend
                   │
              API Gateway        ← ponto único de entrada, roteia e padroniza erros
       ┌───────────┼────────────┐
   Catálogo   Estatísticas   Favoritos
       └───────────┼────────────┘
            PokéAPI v2 (GET)
```

| Serviço | Responsabilidade | Rotas |
|---|---|---|
| Catálogo | listas, paginação, filtros por tipo, sorteio, cache | `GET /api/pokemon`, `GET /api/pokemon/random`, `GET /api/types` |
| Estatísticas | dados do Pokémon, medidas, habilidades, atributos, espécie, evoluções, comparação | `GET /api/pokemon/:idOuNome`, `.../species`, `.../evolutions`, `GET /api/compare` |
| Favoritos | preferências do usuário | `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/:id` |
| API Gateway | entrada única, encaminhamento, erro 503 padronizado, health check | `GET /api/health` + todas as acima |

### Estrutura de pastas

```
pokedex-explorer/
├── server.js                  # sobe o monólito
├── src/
│   ├── app.js                 # monta o Express do monólito
│   ├── lib/pokeapi.js         # cliente da PokéAPI (GET + cache + erros)
│   ├── lib/format.js          # conversões e formatação dos dados
│   ├── lib/validate.js        # validação de entradas
│   ├── middleware/errors.js   # formato padrão de erro
│   └── routes/                # catalog.js, stats.js, favorites.js
├── microservices/             # gateway.js, service.js, start-all.js
├── public/                    # index.html, styles.css, app.js (frontend)
├── tests/                     # testes automatizados (node:test)
├── docs/TESTES.md             # plano de testes manuais
└── data/favorites.json        # criado automaticamente ao favoritar
```

## Endpoints

Todas as respostas de erro seguem o formato:

```json
{ "error": { "status": 404, "message": "Pokémon \"xyz\" não encontrado." } }
```

| Método | Rota | Exemplo | Resposta |
|---|---|---|---|
| GET | `/api/pokemon/:idOuNome` | `/api/pokemon/pikachu` ou `/api/pokemon/25` | id, nome, imagem, tipos, altura (m), peso (kg), habilidades, 6 estatísticas |
| GET | `/api/pokemon?page=&limit=&type=` | `/api/pokemon?page=2&type=fire` | itens da página, total, totalPages, hasNext, hasPrevious |
| GET | `/api/pokemon/random` | — | um Pokémon sorteado (1 a 1025) |
| GET | `/api/pokemon/:idOuNome/species` | `/api/pokemon/25/species` | gênero, descrição, habitat, cor, geração, lendário/mítico |
| GET | `/api/pokemon/:idOuNome/evolutions` | `/api/pokemon/eevee/evolutions` | lista de estágios da cadeia evolutiva |
| GET | `/api/compare?a=&b=` | `/api/compare?a=pikachu&b=charmander` | dois Pokémon + vencedor de cada atributo |
| GET | `/api/favorites` | — | lista de favoritos |
| POST | `/api/favorites` | corpo `{ "id": 25 }` | 201 criado · 409 se já existe · 404 se não existe |
| DELETE | `/api/favorites/:id` | `/api/favorites/25` | 204 removido · 404 se não estava nos favoritos |
| GET | `/api/health` | — | estado do servidor/serviços e do cache |

**Códigos de status usados:** 200, 201, 204, 400 (entrada inválida), 404 (não encontrado),
409 (favorito duplicado), 502 (PokéAPI respondeu erro), 503 (PokéAPI ou serviço fora do ar).

### Endpoints da PokéAPI consumidos

```
GET https://pokeapi.co/api/v2/pokemon/pikachu
GET https://pokeapi.co/api/v2/pokemon/25
GET https://pokeapi.co/api/v2/pokemon?limit=12&offset=0
GET https://pokeapi.co/api/v2/type/fire
GET https://pokeapi.co/api/v2/pokemon-species/25
GET https://pokeapi.co/api/v2/evolution-chain/10
```

## Onde está cada uma das 20 atividades

| # | Atividade | Onde |
|---|---|---|
| 01 | Consultar Pokémon | `routes/stats.js` (`GET /pokemon/:idOrName`) + busca no `public/app.js` |
| 02 | Consultar por identificador | mesmo endpoint aceita número; `validate.js` normaliza "025" → "25" |
| 03 | Apresentar imagens | `format.js` (arte oficial com sprite de reserva) |
| 04 | Converter unidades | `format.js` → `decimetersToMeters`, `hectogramsToKilograms` |
| 05 | Exibir habilidades | `format.js` + painel "Habilidades" (marca as ocultas) |
| 06 | Exibir estatísticas | `format.js` (6 atributos traduzidos + total) |
| 07 | Criar barras gráficas | `public/app.js` `renderDetail` + `.bar` no CSS (escala 0–255, cores por faixa) |
| 08 | Implementar pesquisa | formulário de busca no frontend |
| 09 | Tratar erros | `pokeapi.js` (rede/404/5xx), `validate.js`, `middleware/errors.js`, mensagens no frontend |
| 10 | Criar paginação | `routes/catalog.js` + botões Anterior/Próxima |
| 11 | Filtros por tipo | `?type=fire|water|grass` + botões Todos/Fogo/Água/Planta |
| 12 | Favoritos | botão Favoritar + seção Favoritos |
| 13 | Comparação | `GET /compare` + tabela com vencedor por atributo |
| 14 | Consulta de espécies | `GET /pokemon/:id/species` + painel "Espécie" |
| 15 | Evoluções | `GET /pokemon/:id/evolutions` + cartões clicáveis |
| 16 | Pesquisa aleatória | `GET /pokemon/random` + botão Aleatório |
| 17 | Cache | `pokeapi.js` (Map em memória, TTL de 10 min) |
| 18 | Serviço de favoritos | `routes/favorites.js` (persistência em `data/favorites.json`) |
| 19 | API Gateway | `microservices/gateway.js` |
| 20 | Documentação e testes | este README, `docs/TESTES.md`, pasta `tests/` |

## Acessibilidade e experiência de uso

- Link "Pular para o conteúdo", foco visível em todos os controles.
- Mensagens de status com `role="status"` / `aria-live` (leitores de tela anunciam carregando/erros).
- Barras de estatística com `role="meter"` e valores numéricos visíveis (não dependem só de cor).
- Botões de filtro e favorito com `aria-pressed`; imagens com texto alternativo.
- Layout responsivo (testado em 390 px de largura).
- Indicador de carregamento e botões de paginação desativados durante a requisição.

## Testes

`npm test` roda 25 testes com o executor nativo do Node (`node:test`), **sem precisar de internet**:
a PokéAPI é simulada em `tests/helpers.js`, o que também permite testar a API fora do ar.
O roteiro de testes manuais (para executar no navegador e registrar resultados) está em
[`docs/TESTES.md`](docs/TESTES.md).

## Questões para discussão

**1. Quando um backend único deixa de ser suficiente? Quais custos os microsserviços adicionam?**

O backend único é a melhor escolha enquanto a equipe é pequena e as partes do sistema crescem
juntas — aqui, por exemplo, ele resolve tudo com um único deploy. Ele começa a pesar quando
partes diferentes têm necessidades diferentes: o catálogo recebe muito mais acessos do que os
favoritos e precisaria escalar sozinho; equipes diferentes passam a mexer no mesmo código e uma
mudança em favoritos obriga a publicar tudo; ou uma falha em um módulo derruba a aplicação inteira.
Os microsserviços resolvem isso, mas cobram um preço: comunicação pela rede (mais latência e novos
tipos de falha, como um serviço fora do ar — veja o teste do gateway retornando 503), mais coisas
para implantar e monitorar, logs espalhados, dados distribuídos e a necessidade de versionar os
contratos entre serviços. A regra prática é começar monólito bem organizado em módulos
(como `routes/catalog.js`, `stats.js`, `favorites.js`) e só separar quando houver um motivo concreto.

**2. Onde implementar cache e como lidar com dados desatualizados ou falhas da PokéAPI?**

O cache fica no backend, no cliente da PokéAPI (`src/lib/pokeapi.js`), porque assim ele vale para
todos os usuários e reduz as chamadas à API pública, que tem limites de uso. Os dados de Pokémon
quase nunca mudam, então um tempo de expiração (TTL) de alguns minutos ou horas é seguro; o TTL
garante que, se algo mudar, o dado será renovado. O navegador também faz um cache próprio das
imagens. Para falhas, o backend usa timeout (8 s), converte erros de rede em `503` com mensagem
amigável e nunca deixa o servidor cair. Uma melhoria possível é servir o dado antigo do cache
quando a PokéAPI estiver fora do ar ("stale-if-error") e, em produção, usar um cache compartilhado
como Redis para que vários servidores aproveitem as mesmas respostas.

**3. Por que usar apenas GET na PokéAPI e onde armazenar favoritos em uma solução com backend?**

A PokéAPI é uma API pública **somente de leitura**: ela não aceita `POST`, `PUT` ou `DELETE`, e
`GET` é o método seguro e idempotente para consultar dados — pode ser repetido e cacheado sem
efeitos colaterais. Por isso os favoritos, que são dados **do nosso usuário**, não podem ficar
nela: ficam no nosso backend, no serviço de favoritos, que expõe `POST`/`DELETE` próprios. Neste
projeto eles são salvos em `data/favorites.json` para simplificar; em produção o lugar certo é um
banco de dados (PostgreSQL, MongoDB etc.), com os favoritos vinculados a cada usuário autenticado.
