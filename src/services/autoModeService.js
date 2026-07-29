import { searchNormdaten } from './normSearch';
import { aiMusixploraMatch, aiNormdataMatch } from './aiMatchingService';
import { isQuotaError } from './llmService';

const STEPS = [
  { id: 'ocr',       label: 'OCR',         weight: 20 },
  { id: 'entities',  label: 'Entitäten',   weight: 20 },
  { id: 'musixplora',label: 'Musixplora',  weight: 30 },
  { id: 'normdata',  label: 'Normdaten',   weight: 20 },
  { id: 'done',      label: 'Fertig',      weight: 10 },
];
const TOTAL_WEIGHT = STEPS.reduce((s, st) => s + st.weight, 0);

function stepPct(stepIdx, subPct = 0) {
  let done = 0;
  for (let i = 0; i < stepIdx; i++) done += STEPS[i].weight;
  return Math.round((done + (STEPS[stepIdx]?.weight || 0) * subPct / 100) / TOTAL_WEIGHT * 100);
}

// ─── Global runner registry ──────────────────────────────────────────────────

const runners = new Map();

export function getRunner(sessionId) {
  return runners.get(sessionId);
}

export function abortRunner(sessionId) {
  const r = runners.get(sessionId);
  if (r) {
    r.aborted = true;
    r.abortController?.abort();
    if (r.resolveRetry) { r.resolveRetry(); r.resolveRetry = null; }
  }
}

export function isRunning(sessionId) {
  const r = runners.get(sessionId);
  return r && !r.aborted && r.running;
}

// ─── Quota-error retry helpers ───────────────────────────────────────────────

function readLlmSettingsFromStorage() {
  try {
    const raw = localStorage.getItem('poster_pipeline_llm_settings');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function readKeysForProvider(apiKeys, pid) {
  const val = apiKeys?.[pid];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string' && val) return [val];
  return [];
}

async function withQuotaRetry(runner, providedLlmSettings, fn) {
  const mutable = { ...providedLlmSettings };
  let keyIndex = 0;

  for (;;) {
    const keys = mutable.currentKeys || [];
    mutable.currentKey = keyIndex < keys.length ? keys[keyIndex] : '';

    try {
      return await fn(mutable);
    } catch (err) {
      if (!isQuotaError(err)) throw err;

      keyIndex++;
      if (keyIndex < keys.length) continue;

      // All keys exhausted — pause and wait for user to add/change keys
      runner.llmError = { message: err.message, timestamp: Date.now() };
      runner.waitingForUser = true;
      runner.retryPromise = new Promise(resolve => { runner.resolveRetry = resolve; });
      await runner.retryPromise;
      runner.resolveRetry = null;

      // Re-read settings from localStorage in case user changed provider/key
      const stored = readLlmSettingsFromStorage();
      if (stored) {
        const storedKeys = stored.apiKeys || {};
        const pid = stored.provider ?? mutable.provider;
        mutable.provider = pid;
        mutable.model = stored.model ?? mutable.model;
        mutable.currentKeys = readKeysForProvider(storedKeys, pid);
        mutable.ollamaBaseUrl = stored.ollamaBaseUrl ?? mutable.ollamaBaseUrl;
        mutable.systemPrompt = stored.systemPrompt ?? mutable.systemPrompt;
        mutable.ocrFixPrompt = stored.ocrFixPrompt ?? mutable.ocrFixPrompt;
        mutable.ocrFixIncludeImage = stored.ocrFixIncludeImage ?? mutable.ocrFixIncludeImage;
      }

      keyIndex = 0;
      runner.llmError = null;
      runner.waitingForUser = false;
    }
  }
}

// ─── Run auto mode for a session ─────────────────────────────────────────────

export async function runAutoMode({
  sessionId,
  updateSession,
  llmSettings,
  pipeline,
  imagePreview,
}) {
  const existing = runners.get(sessionId);
  if (existing?.running) return;

  const abortController = new AbortController();
  const runner = {
    sessionId, running: true, aborted: false, abortController,
    stepIdx: 0, subPct: 0,
  };
  runners.set(sessionId, runner);

  function progress(stepIdx, subPct = 0, data) {
    runner.stepIdx = stepIdx;
    runner.subPct = subPct;
    const pct = stepPct(stepIdx, subPct);
    const patch = { autoModeProgress: pct, autoModeStep: STEPS[stepIdx]?.label || '' };
    if (data) patch.data = data;
    updateSession(patch);
  }

  try {
    // ── Step 0: OCR + AI cleaner ─────────────────────────────────────────
    progress(0, 0, { step: 0 });
    if (runner.aborted) return;

    const rawText = await pipeline.runOcr(imagePreview);
    if (runner.aborted || !rawText) return;

    const finalText = await withQuotaRetry(runner, llmSettings, async (fresh) => {
      return await pipeline.runOcrFix(fresh, rawText, imagePreview) || rawText;
    });

    progress(0, 100, { ocrText: finalText, step: 1 });
    if (runner.aborted) return;

    // ── Step 1: Entity detection ─────────────────────────────────────────
    progress(1, 0, { step: 1 });
    const detectedEntities = await withQuotaRetry(runner, llmSettings, async (fresh) => {
      return await pipeline.runEntityDetection(fresh, finalText);
    });
    if (runner.aborted) return;

    progress(1, 100, { entities: detectedEntities, step: 2 });
    if (runner.aborted) return;

    // ── Step 2: Musixplora search + AI match ─────────────────────────────
    progress(2, 0, { step: 2 });
    const rawMatches = await pipeline.runMusixploraSearch(detectedEntities);
    if (runner.aborted) return;

    // AI match for each entity
    const enrichedMatches = { ...rawMatches };
    let matchCount = 0;
    for (const entity of detectedEntities) {
      if (runner.aborted) return;
      const entityMatch = enrichedMatches[entity.id];
      if (entityMatch?.status === 'matched' && entityMatch.results?.length > 0) {
        const idx = await withQuotaRetry(runner, llmSettings, async (fresh) => {
          return await aiMusixploraMatch(entity, finalText, entityMatch.results, fresh);
        });
        if (idx !== null && idx !== undefined && entityMatch.results[idx]) {
          enrichedMatches[entity.id] = { ...entityMatch, selected: idx };
        } else {
          enrichedMatches[entity.id] = { ...entityMatch, status: 'no_match', selected: null };
        }
      } else if (entityMatch) {
        enrichedMatches[entity.id] = entityMatch;
      }
      matchCount++;
      progress(2, 70 + Math.round(matchCount / detectedEntities.length * 30));
    }
    if (runner.aborted) return;
    progress(2, 100, { matches: enrichedMatches, step: 3 });
    if (runner.aborted) return;

    // ── Step 3: Normdata search + AI match ───────────────────────────────
    progress(3, 0, { step: 3 });

    const normResults = {};
    let normCount = 0;
    const personEntities = detectedEntities.filter(e => e.type === 'person');
    for (const entity of personEntities) {
      if (runner.aborted) return;
      try {
        const context = { eventYear: null, placeHints: [] };
        for (const e of detectedEntities) {
          if (e.type === 'time') {
            const m = (e.text + ' ' + (e.alias || '')).match(/\b(1[89]\d{2}|20[012]\d)\b/);
            if (m) { const y = parseInt(m[1], 10); if (!context.eventYear || y < context.eventYear) context.eventYear = y; }
          }
          if (e.type === 'place') {
            const p = (e.alias || e.text).trim();
            if (p) context.placeHints.push(p);
          }
        }

        const { results } = await searchNormdaten(
          entity.text, context, entity.isComposer, pipeline.preferredJobs,
        );
        if (runner.aborted) return;

        if (results.length > 0) {
          const idx = await withQuotaRetry(runner, llmSettings, async (fresh) => {
            return await aiNormdataMatch(entity, finalText, results, fresh);
          });
          const selected = idx !== null && idx !== undefined && results[idx] ? results[idx] : null;
          normResults[entity.id] = { status: selected ? 'done' : 'no_match', selected, results };
        } else {
          normResults[entity.id] = { status: 'no_match', selected: null, results: [] };
        }
      } catch {
        normResults[entity.id] = { status: 'error', selected: null, results: [] };
      }
      normCount++;
      progress(3, Math.round(normCount / personEntities.length * 100));
    }
    if (runner.aborted) return;
    progress(3, 100, { normResults, step: 4 });
    if (runner.aborted) return;

    // ── Done ─────────────────────────────────────────────────────────────
    progress(4);
    updateSession({ autoModeDone: true });
    runner.running = false;
  } catch (err) {
    runner.running = false;
    updateSession({ autoModeError: err.message });
    throw err;
  }
}
