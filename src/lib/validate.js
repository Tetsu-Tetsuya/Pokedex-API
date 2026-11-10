/**
 * Validações de entrada. Rejeitar dados ruins ANTES de chamar a PokéAPI
 * evita requisições desnecessárias e dá mensagens claras ao usuário.
 */
const { ApiError } = require('./pokeapi');
const { MAX_POKEMON_ID } = require('./format');

/** Normaliza o termo de busca: "  Pikachu " -> "pikachu", "025" -> "25". */
function parseIdOrName(raw) {
  const value = String(raw ?? '').trim().toLowerCase();

  if (!value) {
    throw new ApiError(400, 'Informe o nome ou o número de um Pokémon.');
  }
  if (/^\d+$/.test(value)) {
    const id = Number(value);
    if (id < 1 || id > MAX_POKEMON_ID) {
      throw new ApiError(400, `O número deve estar entre 1 e ${MAX_POKEMON_ID}.`);
    }
    return String(id);
  }
  if (!/^[a-z0-9-]+$/.test(value)) {
    throw new ApiError(400, 'Use apenas letras, números e hífen (ex.: pikachu, mr-mime).');
  }
  return value;
}

/** Valida inteiros positivos vindos da query string (?page=2). */
function parsePositiveInt(raw, field, { min = 1, max = Infinity, fallback } = {}) {
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(String(raw))) {
    throw new ApiError(400, `O parâmetro "${field}" deve ser um número inteiro.`);
  }
  const n = Number(raw);
  if (n < min || n > max) {
    throw new ApiError(400, `O parâmetro "${field}" deve estar entre ${min} e ${max}.`);
  }
  return n;
}

module.exports = { parseIdOrName, parsePositiveInt };
