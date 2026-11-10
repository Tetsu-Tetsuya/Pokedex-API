/**
 * Serviço de CATÁLOGO
 * Responsável por listar Pokémon, paginar, filtrar por tipo e sortear.
 *
 *   GET /api/pokemon?page=1&limit=12           Atividade 10 — Paginação
 *   GET /api/pokemon?page=1&limit=12&type=fire Atividade 11 — Filtros por tipo
 *   GET /api/pokemon/random                    Atividade 16 — Pesquisa aleatória
 *   GET /api/types                             Tipos disponíveis para filtro
 */
const express = require('express');
const pokeapi = require('../lib/pokeapi');
const { ApiError } = pokeapi;
const { MAX_POKEMON_ID, TYPE_LABELS, formatListItem, formatPokemon, idFromUrl } = require('../lib/format');
const { parsePositiveInt } = require('../lib/validate');

const router = express.Router();

router.get('/types', (req, res) => {
  const types = Object.entries(TYPE_LABELS).map(([name, label]) => ({ name, label }));
  res.json({ types });
});

router.get('/pokemon', async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 'page', { fallback: 1 });
    const limit = parsePositiveInt(req.query.limit, 'limit', { min: 1, max: 50, fallback: 12 });
    const type = req.query.type ? String(req.query.type).toLowerCase() : null;

    if (type && !TYPE_LABELS[type]) {
      throw new ApiError(400, `Tipo "${type}" não existe. Ex.: fire, water, grass.`);
    }

    let total;
    let items;

    if (type) {
      // GET https://pokeapi.co/api/v2/type/fire — devolve TODOS os Pokémon do tipo.
      const data = await pokeapi.get(`/type/${type}`);
      const all = data.pokemon
        .map((entry) => entry.pokemon)
        .filter((p) => idFromUrl(p.url) <= MAX_POKEMON_ID); // ignora formas alternativas
      total = all.length;
      items = all.slice((page - 1) * limit, page * limit).map(formatListItem);
    } else {
      // GET https://pokeapi.co/api/v2/pokemon?limit=12&offset=0 — paginação da própria API.
      total = MAX_POKEMON_ID;
      const offset = (page - 1) * limit;
      const pageSize = Math.max(0, Math.min(limit, total - offset));
      items = [];
      if (pageSize > 0) {
        const data = await pokeapi.get(`/pokemon?limit=${pageSize}&offset=${offset}`);
        items = data.results.map(formatListItem);
      }
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (page > totalPages) {
      throw new ApiError(400, `Página inválida. Existem apenas ${totalPages} página(s).`);
    }

    res.json({
      page,
      limit,
      type,
      total,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
      items,
    });
  } catch (err) {
    next(err);
  }
});

// Precisa vir ANTES de "/pokemon/:idOrName" (no monólito) para não ser tratado como nome.
router.get('/pokemon/random', async (req, res, next) => {
  try {
    const id = 1 + Math.floor(Math.random() * MAX_POKEMON_ID);
    const data = await pokeapi.get(`/pokemon/${id}`);
    res.json(formatPokemon(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
