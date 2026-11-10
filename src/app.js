/**
 * Aplicação MONOLÍTICA (Encontro 1): um único backend Node.js + Express
 * que serve o frontend e expõe todas as rotas da API.
 *
 *   Frontend  ->  Node.js + Express  ->  PokéAPI (GET)
 */
const path = require('path');
const express = require('express');
const catalogRouter = require('./routes/catalog');
const statsRouter = require('./routes/stats');
const { createFavoritesRouter } = require('./routes/favorites');
const { notFound, errorHandler } = require('./middleware/errors');
const { cacheInfo } = require('./lib/pokeapi');

function createApp({ favoritesFile = path.join(__dirname, '..', 'data', 'favorites.json') } = {}) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mode: 'monolith', cache: cacheInfo() });
  });

  // A ordem importa: o catálogo tem /pokemon/random, que precisa ser
  // registrado antes de /pokemon/:idOrName (do serviço de estatísticas).
  app.use('/api', catalogRouter);
  app.use('/api', statsRouter);
  app.use('/api', createFavoritesRouter({ file: favoritesFile }));

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
