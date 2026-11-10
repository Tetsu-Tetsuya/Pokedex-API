/**
 * Serviço de FAVORITOS (Atividades 12 e 18)
 *
 *   GET    /api/favorites        lista favoritos
 *   POST   /api/favorites        { "id": 25 } ou { "name": "pikachu" }
 *   DELETE /api/favorites/:id    remove
 *
 * Observação importante: a PokéAPI é somente leitura (GET). Por isso os
 * favoritos NÃO ficam nela — ficam no nosso backend, salvos em um arquivo
 * JSON (data/favorites.json). Em produção isso seria um banco de dados.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const pokeapi = require('../lib/pokeapi');
const { ApiError } = pokeapi;
const { formatPokemon } = require('../lib/format');
const { parseIdOrName } = require('../lib/validate');

/**
 * Cria um repositório de favoritos.
 * @param {string|null} file caminho do JSON; null = só memória (usado nos testes)
 */
function createStore(file) {
  let items = [];
  if (file && fs.existsSync(file)) {
    try {
      items = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      items = []; // arquivo corrompido: recomeça vazio
    }
  }
  const save = () => {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(items, null, 2));
  };
  return {
    list: () => [...items].sort((x, y) => x.id - y.id),
    has: (id) => items.some((f) => f.id === id),
    add(fav) { items.push(fav); save(); return fav; },
    remove(id) {
      const before = items.length;
      items = items.filter((f) => f.id !== id);
      save();
      return items.length < before;
    },
  };
}

function createFavoritesRouter({ file = null } = {}) {
  const store = createStore(file);
  const router = express.Router();

  router.get('/favorites', (req, res) => {
    const favorites = store.list();
    res.json({ total: favorites.length, favorites });
  });

  router.post('/favorites', async (req, res, next) => {
    try {
      const raw = req.body?.id ?? req.body?.name;
      const key = parseIdOrName(raw);

      let data;
      try {
        data = await pokeapi.get(`/pokemon/${key}`); // confirma que o Pokémon existe
      } catch (err) {
        if (err.status === 404) throw new ApiError(404, `Pokémon "${raw}" não encontrado.`);
        throw err;
      }
      const p = formatPokemon(data);
      if (store.has(p.id)) {
        throw new ApiError(409, `${p.name} já está nos favoritos.`);
      }
      const favorite = {
        id: p.id,
        name: p.name,
        image: p.image,
        types: p.types,
        addedAt: new Date().toISOString(),
      };
      res.status(201).json(store.add(favorite));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/favorites/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) throw new ApiError(400, 'Id de favorito inválido.');
      if (!store.remove(id)) throw new ApiError(404, 'Este Pokémon não está nos favoritos.');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createFavoritesRouter };
