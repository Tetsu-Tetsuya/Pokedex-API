/**
 * Funções que convertem os dados "crus" da PokéAPI no formato que o
 * frontend precisa. Manter isso no backend deixa o frontend simples e
 * padroniza as respostas.
 */

/** Maior número da Pokédex nacional considerado no catálogo. */
const MAX_POKEMON_ID = 1025;

const TYPE_LABELS = {
  normal: 'Normal', fire: 'Fogo', water: 'Água', grass: 'Planta', electric: 'Elétrico',
  ice: 'Gelo', fighting: 'Lutador', poison: 'Venenoso', ground: 'Terrestre', flying: 'Voador',
  psychic: 'Psíquico', bug: 'Inseto', rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão',
  dark: 'Sombrio', steel: 'Aço', fairy: 'Fada',
};

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Ataque Esp.',
  'special-defense': 'Defesa Esp.',
  speed: 'Velocidade',
};

/** Extrai o id numérico de uma URL da PokéAPI: ".../pokemon/25/" -> 25 */
function idFromUrl(url) {
  return Number(url.split('/').filter(Boolean).pop());
}

/** URL da arte oficial (imagem grande) a partir do id. */
function artworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

/** Atividade 04 — Converter unidades: a PokéAPI usa decímetros e hectogramas. */
function decimetersToMeters(dm) {
  return Math.round(dm * 10) / 100; // 7 dm -> 0.7 m
}
function hectogramsToKilograms(hg) {
  return Math.round(hg * 10) / 100; // 60 hg -> 6 kg
}

function typeLabel(name) {
  return TYPE_LABELS[name] || name;
}

/** Formata a resposta de GET /pokemon/{id ou nome}. */
function formatPokemon(p) {
  const stats = p.stats.map((s) => ({
    name: s.stat.name,
    label: STAT_LABELS[s.stat.name] || s.stat.name,
    value: s.base_stat,
  }));

  return {
    id: p.id,
    name: p.name,
    // Atividade 03 — Apresentar imagens (arte oficial, com sprite como reserva)
    image:
      p.sprites?.other?.['official-artwork']?.front_default ||
      p.sprites?.front_default ||
      artworkUrl(p.id),
    sprite: p.sprites?.front_default || null,
    types: p.types.map((t) => ({ name: t.type.name, label: typeLabel(t.type.name) })),
    height: { value: decimetersToMeters(p.height), unit: 'm' },
    weight: { value: hectogramsToKilograms(p.weight), unit: 'kg' },
    // Atividade 05 — Exibir habilidades
    abilities: p.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    // Atividade 06 — Exibir estatísticas
    stats,
    totalStats: stats.reduce((sum, s) => sum + s.value, 0),
  };
}

/** Item resumido para cartões do catálogo (sem chamadas extras à API). */
function formatListItem({ name, url }) {
  const id = idFromUrl(url);
  return { id, name, image: artworkUrl(id) };
}

/** Escolhe o texto em português, depois espanhol, depois inglês. */
function pickLanguage(entries, field) {
  for (const lang of ['pt-br', 'pt', 'es', 'en']) {
    const found = entries.find((e) => e.language.name === lang);
    if (found) return found[field];
  }
  return null;
}

/** Atividade 14 — Consulta de espécies (GET /pokemon-species/{id}). */
function formatSpecies(s) {
  const description = pickLanguage(s.flavor_text_entries || [], 'flavor_text');
  return {
    id: s.id,
    name: s.name,
    genus: pickLanguage(s.genera || [], 'genus'),
    description: description ? description.replace(/[\n\f\r]+/g, ' ') : null,
    habitat: s.habitat?.name || null,
    color: s.color?.name || null,
    generation: s.generation?.name || null,
    isLegendary: Boolean(s.is_legendary),
    isMythical: Boolean(s.is_mythical),
    captureRate: s.capture_rate,
    evolutionChainId: s.evolution_chain ? idFromUrl(s.evolution_chain.url) : null,
  };
}

/** Atividade 15 — Evoluções: transforma a árvore em lista com estágios. */
function flattenEvolutionChain(chain) {
  const result = [];
  (function walk(node, stage) {
    const id = idFromUrl(node.species.url);
    const detail = node.evolution_details?.[0];
    result.push({
      id,
      name: node.species.name,
      stage,
      image: artworkUrl(id),
      minLevel: detail?.min_level ?? null,
      trigger: detail?.trigger?.name ?? null,
      item: detail?.item?.name ?? null,
    });
    node.evolves_to.forEach((next) => walk(next, stage + 1));
  })(chain, 1);
  return result;
}

module.exports = {
  MAX_POKEMON_ID,
  TYPE_LABELS,
  STAT_LABELS,
  idFromUrl,
  artworkUrl,
  decimetersToMeters,
  hectogramsToKilograms,
  typeLabel,
  formatPokemon,
  formatListItem,
  formatSpecies,
  flattenEvolutionChain,
};
