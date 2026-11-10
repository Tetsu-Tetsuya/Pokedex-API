/**
 * API GATEWAY (Atividade 19)
 *
 * Ponto ÚNICO de entrada para o frontend. Ele:
 *   1. serve o frontend (pasta public/);
 *   2. decide para qual serviço cada requisição /api/... vai;
 *   3. padroniza erros quando um serviço está fora do ar.
 *
 *                 Frontend
 *                    |
 *               API Gateway  (porta 3000)
 *         /          |           \
 *   Catálogo   Estatísticas   Favoritos
 *    (3001)       (3002)        (3003)
 *         \          |           /
 *              PokéAPI v2 (GET)
 */
const path = require('path');
const express = require('express');

function createGateway({
  catalogUrl = process.env.CATALOG_URL || 'http://localhost:3001',
  statsUrl = process.env.STATS_URL || 'http://localhost:3002',
  favoritesUrl = process.env.FAVORITES_URL || 'http://localhost:3003',
} = {}) {
  const services = {
    catalogo: catalogUrl,
    estatisticas: statsUrl,
    favoritos: favoritesUrl,
  };

  /** Tabela de roteamento: caminho -> serviço responsável. */
  function resolveService(p) {
    if (p === '/api/pokemon' || p === '/api/pokemon/random' || p === '/api/types') return 'catalogo';
    if (p.startsWith('/api/pokemon/') || p === '/api/compare') return 'estatisticas';
    if (p === '/api/favorites' || p.startsWith('/api/favorites/')) return 'favoritos';
    return null;
  }

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', async (req, res) => {
    const checks = await Promise.all(
      Object.entries(services).map(async ([name, url]) => {
        try {
          const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
          return [name, r.ok ? 'ok' : 'erro'];
        } catch {
          return [name, 'fora do ar'];
        }
      }),
    );
    res.json({ status: 'ok', mode: 'gateway', services: Object.fromEntries(checks) });
  });

  app.use('/api', async (req, res) => {
    const pathname = req.originalUrl.split('?')[0];
    const serviceName = resolveService(pathname);
    if (!serviceName) {
      return res.status(404).json({ error: { status: 404, message: `Rota ${req.method} ${pathname} não existe.` } });
    }

    const target = services[serviceName] + req.originalUrl;
    const hasBody = !['GET', 'HEAD', 'DELETE'].includes(req.method);

    try {
      const upstream = await fetch(target, {
        method: req.method,
        headers: { 'content-type': 'application/json' },
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
        signal: AbortSignal.timeout(10000),
      });
      res.status(upstream.status);
      res.set('x-served-by', serviceName);
      const contentType = upstream.headers.get('content-type');
      if (contentType) res.set('content-type', contentType);
      res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.status(503).json({
        error: { status: 503, message: `O serviço de ${serviceName} está indisponível no momento.` },
      });
    }
  });

  return app;
}

module.exports = { createGateway };
