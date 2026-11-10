/**
 * Fábrica de microsserviço: cada serviço é um Express independente,
 * com sua própria porta, mas reaproveitando as mesmas rotas do monólito.
 * Isso mostra que a separação é de RESPONSABILIDADE, não de reescrita.
 */
const express = require('express');
const { notFound, errorHandler } = require('../src/middleware/errors');
const { cacheInfo } = require('../src/lib/pokeapi');

function createService(name, router) {
  const app = express();
  app.use(express.json());
  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: name, cache: cacheInfo() }));
  app.use('/api', router);
  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createService };
