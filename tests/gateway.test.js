/**
 * Testes da arquitetura de microsserviços: o API Gateway encaminha cada
 * rota para o serviço certo e padroniza o erro quando um serviço cai.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createService } = require('../microservices/service');
const { createGateway } = require('../microservices/gateway');
const catalogRouter = require('../src/routes/catalog');
const statsRouter = require('../src/routes/stats');
const { createFavoritesRouter } = require('../src/routes/favorites');
const { installMock, restoreFetch, listen } = require('./helpers');

const servers = [];
let gw;
let favoritesServer;

test.before(async () => {
  installMock();
  const catalog = await listen(createService('catalogo', catalogRouter));
  const stats = await listen(createService('estatisticas', statsRouter));
  const favorites = await listen(createService('favoritos', createFavoritesRouter({ file: null })));
  favoritesServer = favorites.server;
  const gateway = await listen(createGateway({
    catalogUrl: catalog.url, statsUrl: stats.url, favoritesUrl: favorites.url,
  }));
  servers.push(catalog.server, stats.server, gateway.server);
  gw = gateway.url;
});

test.after(() => {
  servers.forEach((s) => s.close());
  favoritesServer.close();
  restoreFetch();
});

test('gateway encaminha catálogo, detalhes e favoritos para o serviço certo', async () => {
  let r = await fetch(`${gw}/api/pokemon?page=1`);
  assert.equal(r.headers.get('x-served-by'), 'catalogo');
  assert.equal((await r.json()).items.length, 12);

  r = await fetch(`${gw}/api/pokemon/random`);
  assert.equal(r.headers.get('x-served-by'), 'catalogo');

  r = await fetch(`${gw}/api/pokemon/pikachu`);
  assert.equal(r.headers.get('x-served-by'), 'estatisticas');
  assert.equal((await r.json()).name, 'pikachu');

  r = await fetch(`${gw}/api/favorites`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 25 }),
  });
  assert.equal(r.status, 201);
  assert.equal(r.headers.get('x-served-by'), 'favoritos');
});

test('gateway repassa erros dos serviços sem alterar o status', async () => {
  const r = await fetch(`${gw}/api/pokemon/naoexiste`);
  assert.equal(r.status, 404);
});

test('gateway responde 503 quando um serviço está fora do ar', async () => {
  await new Promise((resolve) => favoritesServer.close(resolve));
  const r = await fetch(`${gw}/api/favorites`);
  assert.equal(r.status, 503);
  assert.match((await r.json()).error.message, /favoritos está indisponível/);

  const health = await (await fetch(`${gw}/api/health`)).json();
  assert.equal(health.services.favoritos, 'fora do ar');
  assert.equal(health.services.catalogo, 'ok');
});
