/**
 * Ferramentas de teste: simulam a PokéAPI para que os testes rodem
 * sem internet e de forma previsível. Também permitem simular a
 * PokéAPI fora do ar (Teste obrigatório 03).
 */
const { BASE_URL, clearCache } = require('../src/lib/pokeapi');

const realFetch = global.fetch;

function makePokemon(id, name, types, base = [35, 55, 40, 50, 50, 90]) {
  const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
  return {
    id,
    name,
    height: 4,
    weight: 60,
    sprites: {
      front_default: `https://img/${id}.png`,
      other: { 'official-artwork': { front_default: `https://art/${id}.png` } },
    },
    types: types.map((t, i) => ({ slot: i + 1, type: { name: t, url: `${BASE_URL}/type/${t}/` } })),
    abilities: [
      { ability: { name: 'static' }, is_hidden: false },
      { ability: { name: 'lightning-rod' }, is_hidden: true },
    ],
    stats: statNames.map((n, i) => ({ base_stat: base[i], stat: { name: n } })),
    species: { name, url: `${BASE_URL}/pokemon-species/${id}/` },
  };
}

const fixtures = {
  '/pokemon/25': makePokemon(25, 'pikachu', ['electric']),
  '/pokemon/pikachu': makePokemon(25, 'pikachu', ['electric']),
  '/pokemon/4': makePokemon(4, 'charmander', ['fire'], [39, 52, 43, 60, 50, 65]),
  '/pokemon/charmander': makePokemon(4, 'charmander', ['fire'], [39, 52, 43, 60, 50, 65]),
  '/pokemon-species/25': {
    id: 25,
    name: 'pikachu',
    genera: [{ genus: 'Mouse Pokémon', language: { name: 'en' } }],
    flavor_text_entries: [{ flavor_text: 'When several of\nthese POKéMON gather...', language: { name: 'en' } }],
    habitat: { name: 'forest' },
    color: { name: 'yellow' },
    generation: { name: 'generation-i' },
    is_legendary: false,
    is_mythical: false,
    capture_rate: 190,
    evolution_chain: { url: `${BASE_URL}/evolution-chain/10/` },
  },
  '/evolution-chain/10': {
    id: 10,
    chain: {
      species: { name: 'pichu', url: `${BASE_URL}/pokemon-species/172/` },
      evolution_details: [],
      evolves_to: [{
        species: { name: 'pikachu', url: `${BASE_URL}/pokemon-species/25/` },
        evolution_details: [{ min_level: null, trigger: { name: 'level-up' }, item: null }],
        evolves_to: [{
          species: { name: 'raichu', url: `${BASE_URL}/pokemon-species/26/` },
          evolution_details: [{ min_level: null, trigger: { name: 'use-item' }, item: { name: 'thunder-stone' } }],
          evolves_to: [],
        }],
      }],
    },
  },
  '/type/fire': {
    pokemon: Array.from({ length: 30 }, (_, i) => ({
      pokemon: { name: `fire-${i + 1}`, url: `${BASE_URL}/pokemon/${i + 1}/` },
    })).concat([{ pokemon: { name: 'charizard-mega-x', url: `${BASE_URL}/pokemon/10034/` } }]),
  },
};

/** Responde a /pokemon?limit=X&offset=Y dinamicamente. */
function listResponse(url) {
  const u = new URL(url);
  const limit = Number(u.searchParams.get('limit'));
  const offset = Number(u.searchParams.get('offset'));
  return {
    count: 1302,
    results: Array.from({ length: limit }, (_, i) => ({
      name: `poke-${offset + i + 1}`,
      url: `${BASE_URL}/pokemon/${offset + i + 1}/`,
    })),
  };
}

const mock = { offline: false, calls: [] };

function installMock() {
  clearCache();
  mock.offline = false;
  mock.calls = [];
  global.fetch = async (input, init) => {
    const url = String(input);
    if (!url.startsWith(BASE_URL)) return realFetch(input, init); // chamadas ao nosso servidor
    mock.calls.push(url);
    if (mock.offline) throw new TypeError('fetch failed');

    const path = url.slice(BASE_URL.length).replace(/\/$/, '');
    if (path.startsWith('/pokemon?')) return Response.json(listResponse(url));
    if (path.startsWith('/pokemon/') && /^\/pokemon\/\d+$/.test(path) && !fixtures[path]) {
      const id = Number(path.split('/')[2]);
      return Response.json(makePokemon(id, `poke-${id}`, ['normal']));
    }
    if (fixtures[path]) return Response.json(fixtures[path]);
    return new Response('Not Found', { status: 404 });
  };
}

function restoreFetch() {
  global.fetch = realFetch;
}

/** Sobe um app Express numa porta aleatória e devolve a URL base. */
async function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

module.exports = { installMock, restoreFetch, listen, mock, makePokemon };
