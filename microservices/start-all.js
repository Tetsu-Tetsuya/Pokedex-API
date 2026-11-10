/**
 * Sobe os 3 serviços + o API Gateway (Desafio avançado — microsserviços).
 * Uso: npm run start:micro  ->  abra http://localhost:3000
 *
 * Para fins didáticos tudo roda no mesmo processo, mas cada serviço escuta
 * em uma porta diferente e só conversa com os outros via HTTP. Para separar
 * de verdade, basta rodar cada um em um processo/contêiner próprio.
 */
const path = require('path');
const { createService } = require('./service');
const { createGateway } = require('./gateway');
const catalogRouter = require('../src/routes/catalog');
const statsRouter = require('../src/routes/stats');
const { createFavoritesRouter } = require('../src/routes/favorites');

const ports = { gateway: 3000, catalog: 3001, stats: 3002, favorites: 3003 };

createService('catalogo', catalogRouter).listen(ports.catalog, () =>
  console.log(`Serviço de catálogo      -> http://localhost:${ports.catalog}`));

createService('estatisticas', statsRouter).listen(ports.stats, () =>
  console.log(`Serviço de estatísticas  -> http://localhost:${ports.stats}`));

createService(
  'favoritos',
  createFavoritesRouter({ file: path.join(__dirname, '..', 'data', 'favorites.json') }),
).listen(ports.favorites, () => console.log(`Serviço de favoritos     -> http://localhost:${ports.favorites}`));

createGateway({
  catalogUrl: `http://localhost:${ports.catalog}`,
  statsUrl: `http://localhost:${ports.stats}`,
  favoritesUrl: `http://localhost:${ports.favorites}`,
}).listen(ports.gateway, () => console.log(`API Gateway + frontend   -> http://localhost:${ports.gateway}`));
