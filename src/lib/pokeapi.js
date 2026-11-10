/**
 * Cliente da PokéAPI v2.
 *
 * - Usa SOMENTE requisições GET (a PokéAPI é uma API pública de leitura).
 * - Guarda as respostas em cache na memória (Atividade 17 — Cache) para
 *   evitar repetir chamadas e respeitar o limite de uso da API pública.
 * - Converte falhas de rede e status HTTP em erros com mensagens amigáveis
 *   (Atividade 09 — Tratar erros).
 */

const BASE_URL = process.env.POKEAPI_URL || 'https://pokeapi.co/api/v2';
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 10 * 60 * 1000); // 10 minutos
const TIMEOUT_MS = Number(process.env.POKEAPI_TIMEOUT_MS || 8000);

/** Erro com status HTTP, usado por todo o backend. */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Cache simples: chave = URL, valor = { data, expiresAt }. */
const cache = new Map();
const stats = { hits: 0, misses: 0 };

/**
 * Faz um GET na PokéAPI.
 * @param {string} path caminho relativo ("/pokemon/25") ou URL completa.
 */
async function get(path) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    stats.hits++;
    return cached.data;
  }
  stats.misses++;

  let response;
  try {
    response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    // Sem internet, DNS, timeout ou PokéAPI fora do ar.
    throw new ApiError(503, 'A PokéAPI está indisponível no momento. Tente novamente em instantes.');
  }

  if (response.status === 404) {
    throw new ApiError(404, 'Recurso não encontrado na PokéAPI.');
  }
  if (!response.ok) {
    throw new ApiError(502, `A PokéAPI respondeu com erro (status ${response.status}).`);
  }

  const data = await response.json();
  cache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

function clearCache() {
  cache.clear();
  stats.hits = 0;
  stats.misses = 0;
}

function cacheInfo() {
  return { entries: cache.size, ttlMs: CACHE_TTL_MS, ...stats };
}

module.exports = { get, ApiError, clearCache, cacheInfo, BASE_URL };
