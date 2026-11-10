const test = require('node:test');
const assert = require('node:assert/strict');
const {
  decimetersToMeters, hectogramsToKilograms, idFromUrl, formatPokemon, flattenEvolutionChain,
} = require('../src/lib/format');
const { parseIdOrName, parsePositiveInt } = require('../src/lib/validate');
const { makePokemon } = require('./helpers');

test('converte decímetros para metros e hectogramas para quilos', () => {
  assert.equal(decimetersToMeters(4), 0.4);
  assert.equal(decimetersToMeters(17), 1.7);
  assert.equal(hectogramsToKilograms(60), 6);
  assert.equal(hectogramsToKilograms(905), 90.5);
});

test('extrai o id de uma URL da PokéAPI', () => {
  assert.equal(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/'), 25);
});

test('formatPokemon traz imagem, tipos traduzidos, medidas, habilidades e 6 estatísticas', () => {
  const p = formatPokemon(makePokemon(25, 'pikachu', ['electric']));
  assert.equal(p.image, 'https://art/25.png');
  assert.deepEqual(p.types, [{ name: 'electric', label: 'Elétrico' }]);
  assert.deepEqual(p.height, { value: 0.4, unit: 'm' });
  assert.deepEqual(p.weight, { value: 6, unit: 'kg' });
  assert.equal(p.abilities.length, 2);
  assert.equal(p.abilities[1].hidden, true);
  assert.equal(p.stats.length, 6);
  assert.equal(p.totalStats, 320);
});

test('normaliza e valida o termo de busca', () => {
  assert.equal(parseIdOrName('  Pikachu '), 'pikachu');
  assert.equal(parseIdOrName('025'), '25');
  assert.throws(() => parseIdOrName(''), { status: 400 });
  assert.throws(() => parseIdOrName('0'), { status: 400 });
  assert.throws(() => parseIdOrName('9999'), { status: 400 });
  assert.throws(() => parseIdOrName('<script>'), { status: 400 });
});

test('valida números da query string', () => {
  assert.equal(parsePositiveInt(undefined, 'page', { fallback: 1 }), 1);
  assert.equal(parsePositiveInt('3', 'page'), 3);
  assert.throws(() => parsePositiveInt('abc', 'page'), { status: 400 });
  assert.throws(() => parsePositiveInt('0', 'page'), { status: 400 });
});

test('achata a cadeia de evolução em estágios', () => {
  const list = flattenEvolutionChain({
    species: { name: 'a', url: '/pokemon-species/1/' },
    evolves_to: [{
      species: { name: 'b', url: '/pokemon-species/2/' },
      evolution_details: [{ min_level: 16, trigger: { name: 'level-up' } }],
      evolves_to: [],
    }],
  });
  assert.deepEqual(list.map((e) => [e.name, e.stage, e.minLevel]), [['a', 1, null], ['b', 2, 16]]);
});
