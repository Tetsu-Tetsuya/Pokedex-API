/**
 * Testes da API (monólito). Cobrem os 4 blocos de "Testes obrigatórios":
 *   01 Busca e apresentação · 02 Catálogo e filtros
 *   03 Erros e disponibilidade · 04 Estado e dados adicionais
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { installMock, restoreFetch, listen, mock } = require('./helpers');

let server;
let base;

test.before(async () => {
  installMock();
  ({ server, url: base } = await listen(createApp({ favoritesFile: null })));
});
test.after(() => {
  server.close();
  restoreFetch();
});
test.beforeEach(() => {
  installMock(); // limpa o cache e desliga o modo "fora do ar"
});

const get = (p) => fetch(base + p);

// ---------- 01 · Busca e apresentação ----------

test('01 busca por nome válido devolve dados formatados', async () => {
  const r = await get('/api/pokemon/Pikachu');
  assert.equal(r.status, 200);
  const p = await r.json();
  assert.equal(p.name, 'pikachu');
  assert.equal(p.image, 'https://art/25.png');
  assert.equal(p.types[0].label, 'Elétrico');
  assert.deepEqual(p.height, { value: 0.4, unit: 'm' });
  assert.deepEqual(p.weight, { value: 6, unit: 'kg' });
  assert.equal(p.abilities.length, 2);
  assert.equal(p.stats.length, 6);
});

test('01 busca por número válido devolve o mesmo Pokémon', async () => {
  const p = await (await get('/api/pokemon/25')).json();
  assert.equal(p.id, 25);
  assert.equal(p.name, 'pikachu');
});

// ---------- 02 · Catálogo e filtros ----------

test('02 catálogo devolve 12 itens por página e total de páginas', async () => {
  const d = await (await get('/api/pokemon?page=1')).json();
  assert.equal(d.items.length, 12);
  assert.equal(d.totalPages, Math.ceil(1025 / 12));
  assert.equal(d.hasPrevious, false);
  assert.equal(d.hasNext, true);
  assert.equal(d.items[0].id, 1);
});

test('02 página seguinte e anterior', async () => {
  const p2 = await (await get('/api/pokemon?page=2')).json();
  assert.equal(p2.items[0].id, 13);
  assert.equal(p2.hasPrevious, true);
});

test('02 última página não passa do limite da Pokédex', async () => {
  const last = Math.ceil(1025 / 12);
  const d = await (await get(`/api/pokemon?page=${last}`)).json();
  assert.equal(d.items.at(-1).id, 1025);
  assert.equal(d.hasNext, false);
});

test('02 filtro por tipo pagina os resultados e ignora formas alternativas', async () => {
  const d = await (await get('/api/pokemon?type=fire&page=3')).json();
  assert.equal(d.total, 30); // a forma mega (id 10034) foi descartada
  assert.equal(d.totalPages, 3);
  assert.equal(d.items.length, 6);
});

// ---------- 03 · Erros e disponibilidade ----------

test('03 Pokémon inexistente responde 404 com mensagem clara', async () => {
  const r = await get('/api/pokemon/naoexiste');
  assert.equal(r.status, 404);
  const body = await r.json();
  assert.match(body.error.message, /não encontrado/);
});

test('03 página inválida responde 400', async () => {
  for (const page of ['0', 'abc', '999']) {
    const r = await get(`/api/pokemon?page=${page}`);
    assert.equal(r.status, 400, `page=${page}`);
  }
});

test('03 tipo inválido responde 400', async () => {
  assert.equal((await get('/api/pokemon?type=banana')).status, 400);
});

test('03 PokéAPI fora do ar responde 503 sem derrubar o servidor', async () => {
  mock.offline = true;
  const r = await get('/api/pokemon/pikachu');
  assert.equal(r.status, 503);
  assert.match((await r.json()).error.message, /indisponível/);
  mock.offline = false;
  assert.equal((await get('/api/pokemon/pikachu')).status, 200); // continua funcionando
});

test('03 rota inexistente responde 404 em JSON', async () => {
  const r = await get('/api/nada');
  assert.equal(r.status, 404);
  assert.ok((await r.json()).error);
});

// ---------- 04 · Estado e dados adicionais ----------

test('04 cache evita chamar a PokéAPI duas vezes', async () => {
  await get('/api/pokemon/25');
  await get('/api/pokemon/25');
  assert.equal(mock.calls.filter((u) => u.endsWith('/pokemon/25')).length, 1);
});

test('04 adicionar, listar e remover favoritos', async () => {
  const post = (body) => fetch(`${base}/api/favorites`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });

  let r = await post({ id: 25 });
  assert.equal(r.status, 201);
  r = await post({ name: 'pikachu' });
  assert.equal(r.status, 409); // duplicado
  r = await post({ name: 'naoexiste' });
  assert.equal(r.status, 404);

  const list = await (await get('/api/favorites')).json();
  assert.equal(list.total, 1);
  assert.equal(list.favorites[0].name, 'pikachu');

  r = await fetch(`${base}/api/favorites/25`, { method: 'DELETE' });
  assert.equal(r.status, 204);
  r = await fetch(`${base}/api/favorites/25`, { method: 'DELETE' });
  assert.equal(r.status, 404);
});

test('04 comparar dois Pokémon', async () => {
  const d = await (await get('/api/compare?a=pikachu&b=charmander')).json();
  assert.equal(d.a.name, 'pikachu');
  assert.equal(d.b.name, 'charmander');
  assert.equal(d.stats.length, 6);
  const speed = d.stats.find((s) => s.name === 'speed');
  assert.equal(speed.winner, 'pikachu'); // 90 x 65
  assert.equal((await get('/api/compare?a=pikachu')).status, 400);
});

test('04 espécie e evoluções', async () => {
  const s = await (await get('/api/pokemon/pikachu/species')).json();
  assert.equal(s.genus, 'Mouse Pokémon');
  assert.equal(s.description.includes('\n'), false);

  const e = await (await get('/api/pokemon/25/evolutions')).json();
  assert.deepEqual(e.evolutions.map((x) => x.name), ['pichu', 'pikachu', 'raichu']);
  assert.equal(e.evolutions[2].item, 'thunder-stone');
});

test('04 sorteio devolve um Pokémon válido', async () => {
  const p = await (await get('/api/pokemon/random')).json();
  assert.ok(p.id >= 1 && p.id <= 1025);
  assert.equal(p.stats.length, 6);
});
