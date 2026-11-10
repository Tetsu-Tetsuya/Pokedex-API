/**
 * Frontend do Pokédex Explorer.
 * Ele NUNCA chama a PokéAPI diretamente: tudo passa pelo nosso backend
 * (monólito ou API Gateway), em /api/...
 */

const MAX_STAT = 255; // maior valor base possível de um atributo

const state = {
  page: 1,
  type: '',
  favorites: new Map(), // id -> favorito
  current: null,        // Pokémon exibido nos detalhes
};

// ---------- utilidades ----------

const $ = (sel) => document.querySelector(sel);

/** Escapa texto antes de colocar em HTML (evita injeção de HTML). */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const pad = (id) => `#${String(id).padStart(4, '0')}`;
const pretty = (name) => String(name).replace(/-/g, ' ');

/** Chama o backend e transforma erros em exceções com a mensagem do servidor. */
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Não foi possível falar com o servidor. Ele está rodando?');
  }
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error?.message || `Erro ${response.status}`);
  }
  return body;
}

/** Mostra mensagem de status (normal, carregando ou erro). */
function setStatus(el, message, kind = '') {
  el.textContent = message;
  el.className = `status ${kind}`.trim();
}

function typeBadges(types) {
  return types.map((t) => `<span class="type t-${esc(t.name)}">${esc(t.label)}</span>`).join('');
}

function cardHTML(p) {
  return `
    <button type="button" class="poke-card" data-name="${esc(p.name)}" aria-label="Ver detalhes de ${esc(pretty(p.name))}">
      <img src="${esc(p.image)}" alt="" loading="lazy" width="110" height="110" />
      <div class="num">${pad(p.id)}</div>
      <div class="name">${esc(pretty(p.name))}</div>
    </button>`;
}

// ---------- busca e detalhes (Atividades 01–08, 14, 15, 16) ----------

async function showPokemon(query, { random = false } = {}) {
  const status = $('#search-status');
  setStatus(status, 'Buscando…', 'loading');
  try {
    const p = random ? await api('/pokemon/random') : await api(`/pokemon/${encodeURIComponent(query)}`);
    state.current = p;
    renderDetail(p);
    setStatus(status, `${pretty(p.name)} encontrado.`);
    $('#detalhes').scrollIntoView({ behavior: 'smooth', block: 'start' });
    loadExtras(p); // espécie e evoluções carregam em seguida
  } catch (err) {
    setStatus(status, err.message, 'error');
  }
}

function renderDetail(p) {
  const isFav = state.favorites.has(p.id);
  const statRows = p.stats.map((s) => {
    const pct = Math.min(100, Math.round((s.value / MAX_STAT) * 100));
    const level = s.value >= 100 ? 'high' : s.value < 50 ? 'low' : '';
    return `
      <div class="stat-row">
        <span>${esc(s.label)}</span>
        <span class="value">${s.value}</span>
        <div class="bar" role="meter" aria-label="${esc(s.label)}" aria-valuemin="0" aria-valuemax="${MAX_STAT}" aria-valuenow="${s.value}">
          <span class="${level}" style="width:${pct}%"></span>
        </div>
      </div>`;
  }).join('');

  const section = $('#detalhes');
  section.hidden = false;
  section.innerHTML = `
    <div class="detail-head">
      <img src="${esc(p.image)}" alt="Arte oficial de ${esc(pretty(p.name))}" width="220" height="220" />
      <div>
        <p class="eyebrow">${pad(p.id)}</p>
        <h2>${esc(pretty(p.name))}</h2>
        <div class="types">${typeBadges(p.types)}</div>
        <button type="button" class="btn fav" id="fav-btn" aria-pressed="${isFav}">
          ${isFav ? '★ Nos favoritos' : '☆ Favoritar'}
        </button>
      </div>
    </div>
    <div class="detail-grid">
      <div class="panel">
        <h3>Medidas</h3>
        <div class="measures">
          <div>Altura<strong>${p.height.value.toLocaleString('pt-BR')} ${p.height.unit}</strong></div>
          <div>Peso<strong>${p.weight.value.toLocaleString('pt-BR')} ${p.weight.unit}</strong></div>
        </div>
        <h3 style="margin-top:16px">Habilidades</h3>
        <ul class="abilities">
          ${p.abilities.map((a) => `<li>${esc(pretty(a.name))}${a.hidden ? '<span class="tag">oculta</span>' : ''}</li>`).join('')}
        </ul>
      </div>
      <div class="panel">
        <h3>Estatísticas base <small class="tag">total ${p.totalStats}</small></h3>
        ${statRows}
      </div>
      <div class="panel" id="species-panel"><h3>Espécie</h3><p class="status loading">Carregando…</p></div>
    </div>
    <div class="panel" id="evolutions-panel" style="margin-top:16px"><h3>Evoluções</h3><p class="status loading">Carregando…</p></div>
  `;
  $('#fav-btn').addEventListener('click', () => toggleFavorite(p));
}

async function loadExtras(p) {
  const [species, evo] = await Promise.allSettled([
    api(`/pokemon/${p.id}/species`),
    api(`/pokemon/${p.id}/evolutions`),
  ]);
  if (state.current?.id !== p.id) return; // usuário já trocou de Pokémon

  const sp = $('#species-panel');
  if (species.status === 'fulfilled') {
    const s = species.value;
    sp.innerHTML = `
      <h3>Espécie</h3>
      ${s.genus ? `<p><strong>${esc(s.genus)}</strong></p>` : ''}
      ${s.description ? `<p>${esc(s.description)}</p>` : ''}
      <p class="muted" style="margin:0">
        Habitat: ${esc(s.habitat || '—')} · Cor: ${esc(s.color || '—')} · Geração: ${esc((s.generation || '—').replace('generation-', '').toUpperCase())}
        ${s.isLegendary ? '<span class="tag">lendário</span>' : ''}${s.isMythical ? '<span class="tag">mítico</span>' : ''}
      </p>`;
  } else {
    sp.innerHTML = `<h3>Espécie</h3><p class="status error">${esc(species.reason.message)}</p>`;
  }

  const ep = $('#evolutions-panel');
  if (evo.status === 'fulfilled') {
    const list = evo.value.evolutions;
    if (list.length <= 1) {
      ep.innerHTML = '<h3>Evoluções</h3><p class="muted">Este Pokémon não evolui.</p>';
    } else {
      ep.innerHTML = `<h3>Evoluções</h3><div class="evolutions">${list.map((e, i) => `
        ${i > 0 ? '<span class="arrow" aria-hidden="true">→</span>' : ''}
        <button type="button" class="evo" data-name="${esc(e.name)}" aria-label="Ver ${esc(pretty(e.name))}">
          <img src="${esc(e.image)}" alt="" width="72" height="72" loading="lazy" />
          <span>${esc(pretty(e.name))}</span>
          <small>Estágio ${e.stage}${e.minLevel ? ` · nv. ${e.minLevel}` : ''}</small>
        </button>`).join('')}</div>`;
      ep.querySelectorAll('.evo').forEach((b) => b.addEventListener('click', () => showPokemon(b.dataset.name)));
    }
  } else {
    ep.innerHTML = `<h3>Evoluções</h3><p class="status error">${esc(evo.reason.message)}</p>`;
  }
}

// ---------- catálogo (Atividades 10 e 11) ----------

async function loadCatalog() {
  const status = $('#catalog-status');
  const grid = $('#catalog-grid');
  setStatus(status, 'Carregando catálogo…', 'loading');
  $('#prev-btn').disabled = true;
  $('#next-btn').disabled = true;
  try {
    const params = new URLSearchParams({ page: state.page, limit: 12 });
    if (state.type) params.set('type', state.type);
    const data = await api(`/pokemon?${params}`);
    grid.innerHTML = data.items.map((p) => `<li>${cardHTML(p)}</li>`).join('');
    $('#page-info').textContent = `Página ${data.page} de ${data.totalPages}`;
    $('#prev-btn').disabled = !data.hasPrevious;
    $('#next-btn').disabled = !data.hasNext;
    setStatus(status, `${data.total} Pokémon · ${data.items.length} exibidos nesta página.`);
  } catch (err) {
    grid.innerHTML = '';
    setStatus(status, err.message, 'error');
  }
}

function setupCatalog() {
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      state.type = chip.dataset.type;
      state.page = 1;
      loadCatalog();
    });
  });
  $('#prev-btn').addEventListener('click', () => { if (state.page > 1) { state.page--; loadCatalog(); } });
  $('#next-btn').addEventListener('click', () => { state.page++; loadCatalog(); });
}

// ---------- favoritos (Atividades 12 e 18) ----------

async function loadFavorites() {
  const status = $('#favorites-status');
  try {
    const data = await api('/favorites');
    state.favorites = new Map(data.favorites.map((f) => [f.id, f]));
    renderFavorites();
  } catch (err) {
    setStatus(status, err.message, 'error');
  }
}

function renderFavorites() {
  const list = [...state.favorites.values()];
  $('#favorites-grid').innerHTML = list.map((f) => `
    <li class="fav-item">
      ${cardHTML(f)}
      <button type="button" class="remove" data-id="${f.id}" aria-label="Remover ${esc(pretty(f.name))} dos favoritos">×</button>
    </li>`).join('');
  setStatus($('#favorites-status'), list.length ? `${list.length} favorito(s).` : 'Nenhum favorito ainda. Abra um Pokémon e clique em “Favoritar”.');
  document.querySelectorAll('#favorites-grid .remove').forEach((b) =>
    b.addEventListener('click', () => removeFavorite(Number(b.dataset.id))));
}

async function toggleFavorite(p) {
  try {
    if (state.favorites.has(p.id)) {
      await removeFavorite(p.id);
    } else {
      const fav = await api('/favorites', { method: 'POST', body: JSON.stringify({ id: p.id }) });
      state.favorites.set(fav.id, fav);
      renderFavorites();
    }
    if (state.current?.id === p.id) updateFavButton(p.id);
  } catch (err) {
    setStatus($('#search-status'), err.message, 'error');
  }
}

async function removeFavorite(id) {
  try {
    await api(`/favorites/${id}`, { method: 'DELETE' });
  } catch (err) {
    setStatus($('#favorites-status'), err.message, 'error');
  }
  state.favorites.delete(id);
  renderFavorites();
  if (state.current?.id === id) updateFavButton(id);
}

function updateFavButton(id) {
  const btn = $('#fav-btn');
  if (!btn) return;
  const isFav = state.favorites.has(id);
  btn.setAttribute('aria-pressed', String(isFav));
  btn.textContent = isFav ? '★ Nos favoritos' : '☆ Favoritar';
}

// ---------- comparação (Atividade 13) ----------

async function compare(a, b) {
  const status = $('#compare-status');
  const out = $('#compare-result');
  setStatus(status, 'Comparando…', 'loading');
  out.innerHTML = '';
  try {
    const params = new URLSearchParams({ a, b });
    const d = await api(`/compare?${params}`);
    const head = (p) => `
      <div>
        <img src="${esc(p.image)}" alt="${esc(pretty(p.name))}" width="120" height="120" />
        <h3>${esc(pretty(p.name))}</h3>
        <div class="types" style="justify-content:center">${typeBadges(p.types)}</div>
      </div>`;
    out.innerHTML = `
      <div class="compare-heads">${head(d.a)}${head(d.b)}</div>
      <table class="compare-table">
        <caption class="sr-only">Comparação de estatísticas</caption>
        <thead><tr><th scope="col">Atributo</th><th scope="col">${esc(pretty(d.a.name))}</th><th scope="col">${esc(pretty(d.b.name))}</th></tr></thead>
        <tbody>
          ${d.stats.map((s) => `
            <tr>
              <th scope="row">${esc(s.label)}</th>
              <td class="${s.winner === d.a.name ? 'win' : ''}">${s.a}</td>
              <td class="${s.winner === d.b.name ? 'win' : ''}">${s.b}</td>
            </tr>`).join('')}
          <tr><th scope="row">Total</th>
            <td class="${d.totals.a > d.totals.b ? 'win' : ''}">${d.totals.a}</td>
            <td class="${d.totals.b > d.totals.a ? 'win' : ''}">${d.totals.b}</td></tr>
          <tr><th scope="row">Altura / Peso</th>
            <td>${d.a.height.value.toLocaleString('pt-BR')} m / ${d.a.weight.value.toLocaleString('pt-BR')} kg</td>
            <td>${d.b.height.value.toLocaleString('pt-BR')} m / ${d.b.weight.value.toLocaleString('pt-BR')} kg</td></tr>
        </tbody>
      </table>`;
    setStatus(status, `${pretty(d.a.name)} vence em ${d.summary.winsA} atributo(s), ${pretty(d.b.name)} em ${d.summary.winsB}, ${d.summary.ties} empate(s).`);
  } catch (err) {
    setStatus(status, err.message, 'error');
  }
}

// ---------- inicialização ----------

function init() {
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#search-input').value.trim();
    if (!q) {
      setStatus($('#search-status'), 'Digite um nome ou número para pesquisar.', 'error');
      $('#search-input').focus();
      return;
    }
    showPokemon(q);
  });
  $('#random-btn').addEventListener('click', () => showPokemon(null, { random: true }));

  $('#compare-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const a = e.target.a.value.trim();
    const b = e.target.b.value.trim();
    if (!a || !b) {
      setStatus($('#compare-status'), 'Preencha os dois campos.', 'error');
      return;
    }
    compare(a, b);
  });

  // Delegação: qualquer cartão do catálogo ou dos favoritos abre os detalhes.
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.poke-card');
    if (card) showPokemon(card.dataset.name);
  });

  setupCatalog();
  loadCatalog();
  loadFavorites();
}

init();
