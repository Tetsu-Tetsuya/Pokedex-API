/**
 * Serviço de ESTATÍSTICAS
 * Consolida dados de um Pokémon: medidas, habilidades, atributos,
 * espécie, evoluções e comparação.
 *
 *   GET /api/pokemon/:idOrName             Atividades 01, 02, 03, 04, 05, 06, 08
 *   GET /api/pokemon/:idOrName/species     Atividade 14 — Consulta de espécies
 *   GET /api/pokemon/:idOrName/evolutions  Atividade 15 — Evoluções
 *   GET /api/compare?a=pikachu&b=charmander Atividade 13 — Comparação
 */
const express = require('express');
const pokeapi = require('../lib/pokeapi');
const { ApiError } = pokeapi;
const { formatPokemon, formatSpecies, flattenEvolutionChain } = require('../lib/format');
const { parseIdOrName } = require('../lib/validate');

const router = express.Router();

/** Busca um Pokémon trocando o 404 genérico por uma mensagem clara. */
async function fetchPokemon(raw) {
  const key = parseIdOrName(raw);
  try {
    return await pokeapi.get(`/pokemon/${key}`);
  } catch (err) {
    if (err.status === 404) throw new ApiError(404, `Pokémon "${raw}" não encontrado.`);
    throw err;
  }
}

/** A espécie é obtida pelo link que vem no próprio Pokémon (funciona com nome ou número). */
async function fetchSpecies(raw) {
  const pokemon = await fetchPokemon(raw);
  return pokeapi.get(pokemon.species.url);
}

router.get('/pokemon/:idOrName', async (req, res, next) => {
  try {
    const data = await fetchPokemon(req.params.idOrName);
    res.json(formatPokemon(data));
  } catch (err) {
    next(err);
  }
});

router.get('/pokemon/:idOrName/species', async (req, res, next) => {
  try {
    const species = await fetchSpecies(req.params.idOrName);
    res.json(formatSpecies(species));
  } catch (err) {
    next(err);
  }
});

router.get('/pokemon/:idOrName/evolutions', async (req, res, next) => {
  try {
    const species = await fetchSpecies(req.params.idOrName);
    if (!species.evolution_chain) {
      return res.json({ chainId: null, evolutions: [] });
    }
    const chain = await pokeapi.get(species.evolution_chain.url);
    res.json({ chainId: chain.id, evolutions: flattenEvolutionChain(chain.chain) });
  } catch (err) {
    next(err);
  }
});

router.get('/compare', async (req, res, next) => {
  try {
    const { a, b } = req.query;
    if (!a || !b) {
      throw new ApiError(400, 'Informe dois Pokémon para comparar: ?a=pikachu&b=charmander');
    }
    // As duas consultas rodam em paralelo.
    const [rawA, rawB] = await Promise.all([fetchPokemon(a), fetchPokemon(b)]);
    const first = formatPokemon(rawA);
    const second = formatPokemon(rawB);

    const stats = first.stats.map((stat, i) => {
      const other = second.stats[i];
      let winner = 'tie';
      if (stat.value > other.value) winner = first.name;
      if (stat.value < other.value) winner = second.name;
      return { name: stat.name, label: stat.label, a: stat.value, b: other.value, winner };
    });

    const winsA = stats.filter((s) => s.winner === first.name).length;
    const winsB = stats.filter((s) => s.winner === second.name).length;

    res.json({
      a: first,
      b: second,
      stats,
      totals: { a: first.totalStats, b: second.totalStats },
      summary: { winsA, winsB, ties: stats.length - winsA - winsB },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
