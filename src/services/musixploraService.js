const API_BASE = import.meta.env.PROD ? 'https://musixplora.de' : '/musixplora';
const API_PATH = '/Server/sendQuery.php';

const TYPE_TO_TAB = {
  person: 0,
  group:  1,
  place:  3,
  event:  5,
  time:   5,
  other:  6,
};

const TAB_LABEL = ['Person', 'Institution', 'Werk', 'Ort', '', 'Ereignis', 'Sache', 'Katalog'];

const TAB_NAME_FIELD = {
  0: 'F11F12',
  1: 'F11',
  2: 'F21',
  3: 'F32',
  5: 'Art',
  6: 'F21',
  7: 'Titel',
};

const TAB_URL_TYPE = {
  0: 'musici',
  1: 'casae',
  2: 'baccae',
  3: 'loci',
  5: 'eventa',
  6: 'res',
  7: 'catalogus',
};

const DETAIL_COMMANDS = {
  0: 'resultMusici',
  1: 'resultCasae',
  2: 'resultBaccae',
  3: 'resultLoci',
  5: 'resultEventa',
  6: 'resultRes',
};

export function getTabForEntity(entity) {
  return TYPE_TO_TAB[entity.type];
}

function applyAliases(text, aliases) {
  if (!aliases || aliases.length === 0) return text;
  let result = text;
  for (const { from, to } of aliases) {
    result = result.split(from).join(to);
  }
  return result;
}

function parseResult(entry, tab) {
  const nameField = TAB_NAME_FIELD[tab];
  const name = nameField && entry[nameField] ? entry[nameField] : entry.F41 || entry.id || '';
  const id = entry.id || entry.F41 || '';

  const meta = (tab === 1 || tab === 3) && entry.F32 ? String(entry.F32) : '';

  return {
    id: String(id),
    name: String(name),
    type: TAB_LABEL[tab] || '',
    urlType: TAB_URL_TYPE[tab] || '',
    score: 50,
    meta,
  };
}

export async function searchMusixplora(entity, aliases = []) {
  const tab = TYPE_TO_TAB[entity.type];
  if (tab === undefined) return { status: 'skip', results: [] };

  const query = applyAliases(entity.alias || entity.text, aliases);
  if (!query.trim()) return { status: 'no_match', results: [] };

  const params = new URLSearchParams();
  params.append('data', JSON.stringify({ 'Einfache Suche': [query] }));
  params.append('command', 'find');
  params.append('tab', String(tab));
  params.append('by', 'false');
  params.append('subset', '');
  params.append('filter', '');

  const response = await fetch(`${API_BASE}${API_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`Musixplora-Fehler (${response.status})`);
  }

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error('Ungültige Antwort von Musixplora');
  }

  if (!Array.isArray(data)) return { status: 'no_match', results: [] };

  const results = data.map(entry => parseResult(entry, tab));
  return {
    status: results.length > 0 ? 'matched' : 'no_match',
    results,
  };
}

function extractContext(entities) {
  let eventYear = null;
  const placeHints = [];
  for (const ent of entities) {
    if (ent.type === 'time') {
      const m = (ent.text + ' ' + (ent.alias || '')).match(/\b(1[89]\d{2}|20[012]\d)\b/);
      if (m) {
        const y = parseInt(m[1], 10);
        if (!eventYear || y < eventYear) eventYear = y;
      }
    }
    if (ent.type === 'place') {
      const p = (ent.alias || ent.text).trim();
      if (p) placeHints.push(p);
    }
  }
  return { eventYear, placeHints };
}

export async function fetchMusixploraDetail(mxpId, tab) {
  const command = DETAIL_COMMANDS[tab];
  if (!command) return null;

  const params = new URLSearchParams();
  params.append('data', JSON.stringify(mxpId));
  params.append('command', command);
  params.append('tab', String(tab));
  params.append('by', 'false');
  params.append('subset', '');
  params.append('filter', '');

  const response = await fetch(`${API_BASE}${API_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) return null;
  const text = await response.text();
  try { return JSON.parse(text); } catch { return null; }
}

// ── Normalizers ──────────────────────────────────────────────────────────────

function normalizePerson(raw) {
  const nd = raw.names?.nameData || {};
  const name = nd.displayName || [nd.defaultSurname, nd.defaultPrename].filter(Boolean).join(', ');
  const dates = raw.dates || {};
  const birth = dates.F13 || null;
  const death = dates.F14 || null;
  const gender = Array.isArray(raw.gender) ? raw.gender[0] : null;
  const mainJobs = [
    ...(Array.isArray(raw.mj) ? raw.mj.map(j => j[0]) : []),
  ].filter(Boolean);
  const otherJobs = [
    ...(Array.isArray(raw.oj) ? raw.oj.map(j => j[0]) : []),
  ].filter(Boolean);
  const occupations = [...mainJobs, ...otherJobs];
  const nationality = Array.isArray(raw.nation) ? raw.nation.map(n => n[0]).filter(Boolean) : [];
  const mainPlace = Array.isArray(raw.mainPlace) ? raw.mainPlace.map (place => place[0]) : [];
  const places = Array.isArray(raw.places) ? raw.places.map(p => (typeof p === 'string' ? p : p.name || '')).filter(Boolean) : [];
  const externalIds = {};
  if (Array.isArray(raw.ids)) {
    for (const id of raw.ids) {
      const val = id?.id || id?.mg || '';
      const label = id?.name || '';
      if (val) externalIds[label] = val;
    }
  }
  const art = raw.art || raw.type || null;
  const nameVariants = nd.nameVariants || [];
  const aliasNames = Array.isArray(raw.alias) ? raw.alias.map(a => (typeof a === 'string' ? a : a.name || '')).filter(Boolean) : [];
  return { name, birth, death, gender, mainJobs, otherJobs, occupations, nationality, mainPlace, places, externalIds, art, nameVariants, aliasNames };
}

function normalizeInstitution(raw) {
  const name = raw.F11 || raw.type || raw.F41 || '';
  const alternatives = Array.isArray(raw.alternatives) ? raw.alternatives.map(a => (typeof a === 'string' ? a : a.name || '')).filter(Boolean) : [];
  const branches = [
    ...(Array.isArray(raw.mj) ? raw.mj.map(j => (typeof j === 'string' ? j : j.name || '')) : []),
    ...(Array.isArray(raw.oj) ? raw.oj.map(j => (typeof j === 'string' ? j : j.name || '')) : []),
  ].filter(Boolean);
  const dates = raw.time ? (typeof raw.time === 'string' ? raw.time : '') : '';
  const places = Array.isArray(raw.places) ? raw.places.map(p => (typeof p === 'string' ? p : p.name || '')).filter(Boolean) : [];
  const externalIds = {};
  if (Array.isArray(raw.ids)) {
    for (const id of raw.ids) {
      const v = id?.id || id?.mg || '';
      const l = id?.name || '';
      if (v) externalIds[l] = v;
    }
  }
  return { name, alternatives, branches, dates, places, externalIds };
}

function normalizePlace(raw) {
  const name = raw.F32 || raw.F41 || '';
  const topo = raw.topology || '';
  return { name, topology };
}

function normalizeEvent(raw) {
  const name = raw.Art || raw.F41 || '';
  const date = raw.date || raw.F51 || '';
  return { name, date };
}

function normalizeDetail(raw, tab) {
  if (!raw) return null;
  try {
    switch (tab) {
      case 0: return normalizePerson(raw);
      case 1: return normalizeInstitution(raw);
      case 3: return normalizePlace(raw);
      case 5: return normalizeEvent(raw);
      default: return { name: raw.F41 || raw.id || '' };
    }
  } catch { return null; }
}

// ── Name parsing & scoring ───────────────────────────────────────────────────

function parseName(name) {
  if (!name) return { surname: '', given: [] };
  let surname = '', given = [];
  const n = name.trim();
  if (n.includes(',')) {
    const parts = n.split(',').map(s => s.trim());
    surname = parts[0];
    given = parts[1] ? parts[1].split(/\s+/).filter(Boolean) : [];
  } else {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      surname = parts.pop();
      given = parts;
    } else if (parts.length === 1) {
      surname = parts[0];
    }
  }
  return { surname, given, display: name.trim() };
}

function computeNameScore(query, resultName) {
  if (!query || !resultName) return 0;
  const q = parseName(query);
  const r = parseName(resultName);
  let score = 0;

  const qs = q.surname.toLowerCase();
  const rs = r.surname.toLowerCase();
  const qg = q.given.map(s => s.toLowerCase().replace(/\.$/, ''));
  const rg = r.given.map(s => s.toLowerCase().replace(/\.$/, ''));

  if (qs && rs) {
    if (qs === rs) score += 50;
    else if (qs.includes(rs) || rs.includes(qs)) score += 30;
    else if (qs.length > 2 && rs.length > 2 && qs[0] === rs[0] && qs[qs.length - 1] === rs[rs.length - 1]) score += 15;
    else if (qs[0] === rs[0]) score += 8;
  }

  if (qg.length > 0 && rg.length > 0) {
    let givenScore = 0;
    for (const qgn of qg) {
      for (const rgn of rg) {
        if (qgn === rgn) { givenScore = Math.max(givenScore, 25); break; }
        if (qgn[0] === rgn[0] && (qgn.length <= 2 || rgn.length <= 2)) givenScore = Math.max(givenScore, 12);
        if (qgn.length > 1 && rgn.length > 1 && (qgn.includes(rgn) || rgn.includes(qgn))) givenScore = Math.max(givenScore, 10);
      }
    }
    score += givenScore;
    const allMatch = qg.every(qgn => rg.some(rgn => qgn === rgn));
    if (allMatch) score += qg.length === rg.length ? 15 : 8;
  }

  if (qs && rg.some(rgn => qs === rgn)) score += 15;
  if (rs && qg.some(qgn => qgn === rs)) score += 15;

  return Math.min(100, Math.max(0, score));
}

function computeRichnessScore(detail) {
  if (!detail) return 0;
  let score = 0;
  if (detail.birth) score += 15;
  if (detail.death) score += 10;
  if (detail.gender) score += 5;
  if (detail.occupations?.length) score += Math.min(detail.occupations.length * 5, 20);
  if (detail.nationality?.length) score += 5;
  if (detail.places?.length) score += 5;
  if (detail.externalIds) score += Math.min(Object.keys(detail.externalIds).length * 5, 15);
  if (detail.dates) score += 5;
  if (detail.branches?.length) score += Math.min(detail.branches.length * 3, 10);
  if (detail.alternatives?.length) score += 5;
  if (detail.topology) score += 5;
  return Math.min(100, score);
}

function computeDateScore(detail, context = {}) {
  if (!detail) return 0;
  const { eventYear } = context;
  let score = 50;
  if (detail.birth && detail.death) score += 20;
  else if (detail.birth || detail.death) score += 10;

  if (eventYear && detail.birth) {
    const b = parseInt(detail.birth, 10);
    if (!isNaN(b)) {
      const age = eventYear - b;
      if (age >= 15 && age <= 80) score += 30;
      else if (age >= 10 && age < 15) score += 5;
      else if (age < 0) score -= 40;
      else score -= 10;
    }
  } else if (eventYear && !detail.birth) {
    score -= 15;
  }
  return Math.max(0, Math.min(100, score));
}

function scoreResult(detail, context = {}, query = '', isComposer = false, preferredJobs = []) {
  if (!detail && !query) return { total: 50, nameScore: 0, dateScore: 50 };
  const nameScore = detail ? computeNameScore(query, detail.name || '') : 0;

  if (isComposer) {
    return { total: Math.max(0, Math.min(100, nameScore)), nameScore, dateScore: 0 };
  }

  const dateScore = computeDateScore(detail, context);
  let total = Math.round(nameScore * 0.80 + dateScore * 0.20);

  if (preferredJobs.length > 0 && detail?.occupations?.length) {
    const match = detail.occupations.some(o => preferredJobs.some(pj => o.toLowerCase() === pj.toLowerCase()));
    if (match) total = Math.min(100, total + 10);
  }

  return { total: Math.max(0, Math.min(100, total)), nameScore, dateScore };
}

// ── Fallback search ──────────────────────────────────────────────────────────
// Only applies to person entities: when full query yields 0 results,
// re-search by surname (last name) only.

async function searchWithFallback(entity, aliases = []) {
  const tab = TYPE_TO_TAB[entity.type];
  if (tab === undefined) return { status: 'skip', results: [], searchInfo: [] };

  const query = applyAliases(entity.alias || entity.text, aliases);
  if (!query.trim()) return { status: 'no_match', results: [], searchInfo: [] };

  const fullResult = await searchMusixplora(entity, aliases);
  const searchInfo = [{ term: query, type: 'full', count: fullResult.results.length }];
  if (fullResult.status === 'matched') {
    return { ...fullResult, searchInfo };
  }

  // Fallback only for persons — search by surname only
  if (entity.type === 'person') {
    const parsed = parseName(query);
    const surname = parsed.surname;
    if (surname && surname.toLowerCase() !== query.toLowerCase()) {
      try {
        const tempEntity = { ...entity, text: surname, alias: '' };
        const result = await searchMusixplora(tempEntity, []);
        if (result.results.length > 0) {
          return {
            status: 'matched',
            results: result.results.map(r => ({ ...r, _fallbackTerm: surname })),
            searchInfo: [
              ...searchInfo,
              { term: surname, type: 'fallback', count: result.results.length },
            ],
          };
        }
      } catch {}
    }
  }

  return { status: 'no_match', results: [], searchInfo };
}

async function withConcurrency(tasks, limit = 6) {
  const results = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit);
    const batchResults = await Promise.allSettled(batch.map(t => t()));
    results.push(...batchResults);
  }
  return results;
}

export async function searchAndEnrichAll(entities, aliases = [], preferredJobs = [], onProgress) {
  const context = extractContext(entities);
  const results = {};
  let completed = 0;
  const total = entities.length;

  const searches = entities.map(async (entity) => {
    const entityId = entity.id;
    try {
      const entityResult = await searchWithFallback(entity, aliases);
      const tab = getTabForEntity(entity);
      const matchData = {
        status: entityResult.status,
        selected: null,
        results: entityResult.results,
        searchInfo: entityResult.searchInfo || [],
      };

      if (entityResult.status === 'matched' && tab !== undefined && tab !== 4 && tab !== 7) {
        const query = entity.alias || entity.text;
        const topResults = entityResult.results.slice(0, 10);
        const enrichmentTasks = topResults.map((r, i) => async () => {
          try {
            const raw = await fetchMusixploraDetail(r.id, tab);
            const detail = normalizeDetail(raw, tab);
            console.log(detail);
            const { total, nameScore, dateScore } = scoreResult(detail, context, query, entity.isComposer, preferredJobs);
            return { index: i, detail, score: total, scoreBreakdown: { nameScore, dateScore } };
          } catch {
            return { index: i, detail: null, score: 50, scoreBreakdown: { nameScore: 0, dateScore: 50 } };
          }
        });
        const settled = await withConcurrency(enrichmentTasks, 6);
        for (const s of settled) {
          if (s.status !== 'fulfilled' || !s.value) continue;
          const { index, detail, score, scoreBreakdown } = s.value;
          if (matchData.results[index]) {
            matchData.results[index].detail = detail;
            matchData.results[index].score = score;
            matchData.results[index].scoreBreakdown = scoreBreakdown;
          }
        }
      }

      results[entityId] = matchData;
    } catch (err) {
      results[entityId] = {
        status: 'no_match', selected: null, results: [], searchInfo: [], error: err.message,
      };
    }
    completed++;
    onProgress?.(completed, total);
  });

  await Promise.all(searches);
  return results;
}

// ── Standalone per-entity fallback (for manual trigger) ──────────────────────

export async function searchAndEnrichOne(entity, aliases = [], entities = [], preferredJobs = []) {
  const context = extractContext(entities);
  const entityResult = await searchWithFallback(entity, aliases);
  const tab = getTabForEntity(entity);
  const matchData = {
    status: entityResult.status,
    selected: null,
    results: entityResult.results,
    searchInfo: entityResult.searchInfo || [],
  };

  if (entityResult.status === 'matched' && tab !== undefined && tab !== 4 && tab !== 7) {
    const query = entity.alias || entity.text;
    const topResults = entityResult.results.slice(0, 10);
    const enrichmentTasks = topResults.map((r, i) => async () => {
      try {
        const raw = await fetchMusixploraDetail(r.id, tab);
        const detail = normalizeDetail(raw, tab);
            const { total, nameScore, dateScore } = scoreResult(detail, context, query, entity.isComposer, preferredJobs);
            return { index: i, detail, score: total, scoreBreakdown: { nameScore, dateScore } };
      } catch {
        return { index: i, detail: null, score: 50, scoreBreakdown: { nameScore: 0, dateScore: 50 } };
      }
    });
    const settled = await withConcurrency(enrichmentTasks, 6);
    for (const s of settled) {
      if (s.status !== 'fulfilled' || !s.value) continue;
      const { index, detail, score, scoreBreakdown } = s.value;
      if (matchData.results[index]) {
        matchData.results[index].detail = detail;
        matchData.results[index].score = score;
        matchData.results[index].scoreBreakdown = scoreBreakdown;
      }
    }
  }

  return matchData;
}

export function getScoreExplanation(detail, context = {}) {
  const notes = [];
  const { eventYear } = context;

  if (eventYear && detail?.birth) {
    const b = parseInt(detail.birth, 10);
    if (!isNaN(b)) {
      const age = eventYear - b;
      if (age < 0) notes.push({ text: `Nach Veranstaltung (${eventYear}) geboren`, kind: 'neg' });
      else if (age < 10) notes.push({ text: `Zu jung bei Veranstaltung (${age} Jahre)`, kind: 'warn' });
      else if (age < 100) notes.push({ text: `Lebensalter plausibel (${age} J.)`, kind: 'pos' });
      else notes.push({ text: `Sehr früh geboren`, kind: 'warn' });
    }
  } else if (eventYear && !detail?.birth) {
    notes.push({ text: 'Kein Geburtsjahr', kind: 'neutral' });
  }

  if (detail?.externalIds && Object.keys(detail.externalIds).length > 0) {
    notes.push({ text: `${Object.keys(detail.externalIds).length} externe ID(s)`, kind: 'pos' });
  }
  if (detail?.occupations?.length > 2) {
    notes.push({ text: `${detail.occupations.length} Tätigkeiten`, kind: 'pos' });
  }
  if (detail?.places?.length > 0) {
    notes.push({ text: `${detail.places.length} Ortsangabe(n)`, kind: 'pos' });
  }
  return notes;
}
