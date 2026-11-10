# Plano de testes — Pokédex Explorer

Roteiro dos **testes obrigatórios**: caminho feliz, limites e falhas.
Execute no navegador (`npm start` → http://localhost:3000) e preencha a coluna **Resultado**.
Os mesmos cenários também estão automatizados em `tests/` (`npm test`).

Legenda: ✅ passou · ❌ falhou · ⚠️ passou com ressalva

## 01 · Busca e apresentação

| # | Passos | Resultado esperado | Resultado |
|---|---|---|---|
| 1.1 | Buscar `pikachu` | Mostra #0025 Pikachu, imagem, tipo Elétrico | |
| 1.2 | Buscar `25` | Mesmo Pokémon do teste 1.1 | |
| 1.3 | Buscar `  PIKACHU ` (maiúsculas e espaços) | Encontra o Pikachu normalmente | |
| 1.4 | Conferir medidas do Pikachu | Altura 0,4 m · Peso 6 kg (API envia 4 dm e 60 hg) | |
| 1.5 | Conferir habilidades | Static e Lightning Rod (marcada como "oculta") | |
| 1.6 | Conferir estatísticas | 6 barras: HP, Ataque, Defesa, Ataque Esp., Defesa Esp., Velocidade, com valores numéricos | |
| 1.7 | Buscar `charizard` | Dois tipos exibidos (Fogo e Voador) | |

## 02 · Catálogo e filtros

| # | Passos | Resultado esperado | Resultado |
|---|---|---|---|
| 2.1 | Abrir a página | Catálogo com 12 cartões, "Página 1 de 86", botão Anterior desativado | |
| 2.2 | Clicar em Próxima | Página 2 começa no #0013 | |
| 2.3 | Clicar em Anterior | Volta para a página 1 | |
| 2.4 | Clicar em Fogo | Só Pokémon de fogo; volta para a página 1; total de páginas muda | |
| 2.5 | Clicar em Água e depois em Planta | Lista e total mudam a cada filtro | |
| 2.6 | Clicar em Todos | Volta ao catálogo completo | |
| 2.7 | Ir até a última página de um filtro | Botão Próxima desativado | |
| 2.8 | Clicar em um cartão | Abre os detalhes do Pokémon | |

## 03 · Erros e disponibilidade

| # | Passos | Resultado esperado | Resultado |
|---|---|---|---|
| 3.1 | Buscar `naoexiste` | Mensagem: Pokémon "naoexiste" não encontrado. | |
| 3.2 | Clicar em Pesquisar com o campo vazio | Mensagem pedindo um nome ou número (nenhuma requisição é feita) | |
| 3.3 | Buscar `0` e `5000` | Mensagem: o número deve estar entre 1 e 1025 | |
| 3.4 | Abrir `/api/pokemon?page=999` | Status 400 — "Página inválida. Existem apenas 86 página(s)." | |
| 3.5 | Abrir `/api/pokemon?page=abc` | Status 400 — page deve ser número inteiro | |
| 3.6 | Desligar a internet e buscar um Pokémon **novo** | Mensagem "A PokéAPI está indisponível…"; a página não trava | |
| 3.7 | Com a internet desligada, buscar um Pokémon já consultado | Continua funcionando (veio do cache) | |
| 3.8 | Parar o servidor e tentar buscar | Mensagem "Não foi possível falar com o servidor" | |
| 3.9 | Modo micro: parar só o serviço de favoritos | `/api/favorites` responde 503 e o resto do site continua | |

> Dica para simular a PokéAPI fora do ar sem desligar a internet:
> `POKEAPI_URL=http://localhost:9 npm start` (porta sem ninguém escutando).

## 04 · Estado e dados adicionais

| # | Passos | Resultado esperado | Resultado |
|---|---|---|---|
| 4.1 | Abrir um Pokémon e clicar em Favoritar | Botão vira "★ Nos favoritos"; aparece na seção Favoritos | |
| 4.2 | Recarregar a página (F5) | O favorito continua lá (salvo no backend) | |
| 4.3 | Clicar no × do favorito | Removido da lista; botão volta a "☆ Favoritar" | |
| 4.4 | Comparar `pikachu` com `charmander` | Tabela com os 6 atributos, vencedor destacado, total e resumo | |
| 4.5 | Comparar com um nome inexistente | Mensagem de erro, sem tabela | |
| 4.6 | Abrir `eevee` | Painel Espécie preenchido; evoluções mostram todas as ramificações | |
| 4.7 | Clicar em uma evolução | Abre os detalhes daquele Pokémon | |
| 4.8 | Abrir `tauros` | Mensagem "Este Pokémon não evolui." | |
| 4.9 | Clicar em Aleatório várias vezes | Pokémon diferentes, sempre válidos | |
| 4.10 | Abrir `/api/health` duas vezes após buscas repetidas | `cache.hits` aumenta | |

## Acessibilidade e experiência

| # | Passos | Resultado esperado | Resultado |
|---|---|---|---|
| 5.1 | Navegar só com Tab/Enter | Todos os botões e cartões alcançáveis, foco visível | |
| 5.2 | Tela de celular (≈ 390 px) | Sem rolagem horizontal; formulários empilhados | |
| 5.3 | Durante carregamentos | Indicador "Carregando…" e botões de página desativados | |

## Registro da execução

- Data: ____/____/______
- Navegador e versão: __________________
- Responsável: __________________
- Observações / bugs encontrados:
