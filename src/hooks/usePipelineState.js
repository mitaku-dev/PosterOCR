import { useState, useCallback, useRef } from 'react';
import {
  INITIAL_ENTITIES,
  INITIAL_MATCHES,
  INITIAL_NORM_RESULTS,
  INITIAL_ALIASES,
  INITIAL_CONTEXT_MAPPINGS,
  INITIAL_PREFERRED_JOBS,
} from '../data/initialState';
import { searchNormdaten } from '../services/normSearch';
import { detectEntities, callLLM, isQuotaError } from '../services/llmService';
import { createOcrJob } from '../services/ocrService';
import { searchAndEnrichAll, searchAndEnrichOne } from '../services/musixploraService';

const LS_DOWNLOADED = 'ocr_downloaded_langs';

export function usePipelineState() {
  const [step, setStep] = useState(0);
  const [stepDone, setStepDone] = useState([false, false, false, false, false]);
  const [downloadedLangs, setDownloadedLangs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_DOWNLOADED) || '[]'); }
    catch { return []; }
  });

  // Step 0
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [preprocessedBlob, setPreprocessedBlob] = useState(null);
  const [ocrMode, setOcrMode] = useState('deu');
  const [ocrText, setOcrText] = useState('');
  const [ocrRunning, setOcrRunning] = useState(false);

  const ocrJobRef = useRef(null);
  const ocrAbortedRef = useRef(false);

  // Step 1 — entities
  const [entities, setEntities] = useState(INITIAL_ENTITIES);
  const [contextMappings, setContextMappings] = useState(INITIAL_CONTEXT_MAPPINGS);
  const [entityRunning, setEntityRunning] = useState(false);
  const [entityError, setEntityError] = useState(null);
  const [entityRawResponse, setEntityRawResponse] = useState(null);

  // Step 2 — musixplora
  const [matches, setMatches] = useState(INITIAL_MATCHES);
  const [aliases, setAliases] = useState(INITIAL_ALIASES);
  const [searchRunning, setSearchRunning] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ done: 0, total: 0 });

  // Step 3 — normdaten
  const [normResults, setNormResults] = useState(INITIAL_NORM_RESULTS);
  const [normRunning, setNormRunning] = useState({});

  // Scoring config
  const [preferredJobs, setPreferredJobs] = useState(INITIAL_PREFERRED_JOBS);

  const markDone = useCallback((s) => {
    setStepDone(prev => { const next = [...prev]; next[s] = true; return next; });
  }, []);

  const goToStep = useCallback((s) => setStep(s), []);
  const advance  = useCallback((s) => { markDone(s); setStep(s + 1); }, [markDone]);

  // Entity helpers
  const updateEntity = useCallback((id, changes) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));
  }, []);
  const removeEntity = useCallback((id) => {
    setEntities(prev => prev.filter(e => e.id !== id));
  }, []);
  const addEntity = useCallback((text, type) => {
    const id = Date.now();
    setEntities(prev => [...prev, { id, text, type, alias: '', isComposer: type === 'person' ? false : false }]);
  }, []);

  // LLM entity detection
  const runEntityDetection = useCallback(async (llmSettings, ocrTextOverride) => {
    const text = ocrTextOverride !== undefined ? ocrTextOverride : ocrText;
    setEntityRunning(true);
    setEntityError(null);
    setEntityRawResponse(null);
    try {
      const { rawText, entities: detected } = await detectEntities({
        provider:       llmSettings.provider,
        apiKeys:        llmSettings.currentKeys,
        model:          llmSettings.model,
        systemPrompt:   llmSettings.systemPrompt,
        ocrText: text,
        contextMappings,
        baseUrl:        llmSettings.ollamaBaseUrl,
      });
      setEntityRawResponse(rawText);
      setEntities(detected);
      markDone(1);
      return detected;
    } catch (err) {
      if (isQuotaError(err)) throw err;
      setEntityError(err.message);
      return [];
    } finally {
      setEntityRunning(false);
    }
  }, [ocrText, contextMappings, markDone]);

  // Match helpers
  const selectMatch = useCallback((entityId, resultIndex) => {
    setMatches(prev => ({ ...prev, [entityId]: { ...prev[entityId], selected: resultIndex } }));
  }, []);
  const setMatchStatus = useCallback((entityId, status) => {
    setMatches(prev => ({ ...prev, [entityId]: { ...prev[entityId], status, selected: null } }));
  }, []);

  // Norm helpers
  const selectNorm = useCallback((entityId, result) => {
    setNormResults(prev => ({ ...prev, [entityId]: { ...prev[entityId], selected: result } }));
  }, []);
  const runNormSearch = useCallback(async (entityId, entityText, context = {}) => {
    setNormRunning(prev => ({ ...prev, [entityId]: true }));
    setNormResults(prev => ({
      ...prev,
      [entityId]: { status: 'searching', selected: null, results: [], gndError: null, wikidataError: null, viafError: null },
    }));
    const entity = entities.find(e => e.id === entityId);
    const isComposer = entity?.isComposer ?? false;
    try {
      const { results, gnd, viaf, wikidata, gndError, wikidataError, viafError } = await searchNormdaten(entityText, context, isComposer, preferredJobs);
      setNormResults(prev => ({
        ...prev,
        [entityId]: {
          status: 'done', selected: null, results,
          gndCount: gnd.length, viafCount: viaf.length, wikidataCount: wikidata.length,
          gndError, wikidataError, viafError,
        },
      }));
    } catch (err) {
      setNormResults(prev => ({ ...prev, [entityId]: { status: 'error', selected: null, results: [], error: err.message } }));
    } finally {
      setNormRunning(prev => ({ ...prev, [entityId]: false }));
    }
  }, [entities, preferredJobs]);

  // OCR stage tracking
  const [stageIdx, setStageIdx] = useState(-1);
  const [progress, setProgress] = useState(0);

  // Real OCR via Tesseract.js
  const runOcr = useCallback(async (overrideSource) => {
    const source = overrideSource || preprocessedBlob || imageFile;
    if (!source) return;
    ocrAbortedRef.current = false;
    setOcrRunning(true);
    setStageIdx(-1);
    setProgress(0);

    const stageOrder = ['load', 'init', 'ocr', 'post'];

    try {
      const job = createOcrJob(source, ocrMode, ({ stage, pct }) => {
        if (ocrAbortedRef.current) return;
        const idx = stageOrder.indexOf(stage);
        if (idx >= 0) setStageIdx(idx);
        setProgress(pct);
      });
      ocrJobRef.current = job;

      const text = await job.promise;
      if (ocrAbortedRef.current) return undefined;

      setOcrText(text);
      markDone(0);

      // Persist downloaded language
      const prev = JSON.parse(localStorage.getItem(LS_DOWNLOADED) || '[]');
      if (!prev.includes(ocrMode)) {
        const next = [...prev, ocrMode];
        localStorage.setItem(LS_DOWNLOADED, JSON.stringify(next));
        setDownloadedLangs(next);
      }

      return text;
    } catch (err) {
      if (ocrAbortedRef.current) return;
      setOcrText(`[OCR-Fehler] ${err.message}`);
      console.error(err);
    } finally {
      setOcrRunning(false);
      setStageIdx(3);
      setProgress(100);
      ocrJobRef.current = null;
    }
  }, [imageFile, preprocessedBlob, ocrMode, markDone, setOcrText]);

  const ocrAbort = useCallback(() => {
    ocrAbortedRef.current = true;
    if (ocrJobRef.current) {
      ocrJobRef.current.abort();
      ocrJobRef.current = null;
    }
    setOcrRunning(false);
    setStageIdx(-1);
    setProgress(0);
  }, []);

  // AI OCR cleaner — uses ocrFixPrompt from llmSettings
  const runOcrFix = useCallback(async (llmSettings, ocrTextOverride, imagePreviewOverride) => {
    const text = ocrTextOverride !== undefined ? ocrTextOverride : ocrText;
    if (!text) return null;
    const imageData = llmSettings?.ocrFixIncludeImage && (imagePreviewOverride || imagePreview)
      ? (imagePreviewOverride || imagePreview)
      : undefined;
    try {
      const cleaned = await callLLM({
        provider:     llmSettings.provider,
        apiKeys:      llmSettings.currentKeys,
        model:        llmSettings.model,
        systemPrompt: llmSettings.ocrFixPrompt,
        userMessage:  text,
        baseUrl:      llmSettings.ollamaBaseUrl,
        imageData,
      });
      if (cleaned) {
        setOcrText(cleaned);
        return cleaned;
      }
    } catch (err) {
      if (isQuotaError(err)) throw err;
      console.error('OCR-Fix failed:', err);
    }
    return text;
  }, [ocrText, imagePreview]);

  // Musixplora search via live API
  const runMusixploraSearch = useCallback(async (entitiesOverride) => {
    const ents = entitiesOverride || entities;
    setSearchRunning(true);
    setSearchProgress({ done: 0, total: ents.length });
    try {
      const newMatches = await searchAndEnrichAll(ents, aliases, preferredJobs, (done, total) => {
        setSearchProgress({ done, total });
      });
      setMatches(prev => {
        const merged = { ...prev };
        for (const [id, result] of Object.entries(newMatches)) {
          merged[id] = result;
        }
        return merged;
      });
      markDone(2);
      return newMatches;
    } catch (err) {
      console.error('Musixplora search failed:', err);
      return {};
    } finally {
      setSearchRunning(false);
      setSearchProgress({ done: 0, total: 0 });
    }
  }, [entities, aliases, preferredJobs, markDone]);

  const runFallbackSearch = useCallback(async (entityId) => {
    const entity = entities.find(e => e.id === entityId);
    if (!entity) return;
    try {
      const matchData = await searchAndEnrichOne(entity, aliases, entities, preferredJobs);
      setMatches(prev => ({ ...prev, [entityId]: matchData }));
    } catch (err) {
      console.error('Fallback search failed:', err);
    }
  }, [entities, aliases, preferredJobs]);

  // ─── Serialization for session save/load ───────────────────────────────

  const serializePipeline = useCallback(() => ({
    step, stepDone,
    imagePreview, ocrMode, ocrText,
    entities, contextMappings, entityRawResponse,
    matches, aliases, searchProgress,
    normResults, preferredJobs,
  }), [step, stepDone, imagePreview, ocrMode, ocrText,
      entities, contextMappings, entityRawResponse,
      matches, aliases, searchProgress, normResults, preferredJobs]);

  const restorePipeline = useCallback((data) => {
    if (data.step !== undefined) setStep(data.step);
    if (data.stepDone) setStepDone(data.stepDone);
    if (data.imagePreview !== undefined) setImagePreview(data.imagePreview);
    if (data.ocrMode) setOcrMode(data.ocrMode);
    if (data.ocrText !== undefined) setOcrText(data.ocrText);
    if (data.entities) setEntities(data.entities);
    if (data.contextMappings) setContextMappings(data.contextMappings);
    if (data.entityRawResponse !== undefined) setEntityRawResponse(data.entityRawResponse);
    if (data.matches) setMatches(data.matches);
    if (data.aliases) setAliases(data.aliases);
    if (data.searchProgress) setSearchProgress(data.searchProgress);
    if (data.normResults) setNormResults(data.normResults);
    if (data.preferredJobs) setPreferredJobs(data.preferredJobs);
  }, []);

  const resetToDefaults = useCallback(() => {
    setStep(0);
    setStepDone([false, false, false, false, false]);
    setImageFile(null);
    setImagePreview(null);
    setPreprocessedBlob(null);
    setOcrMode('deu');
    setOcrText('');
    setEntities(INITIAL_ENTITIES);
    setContextMappings(INITIAL_CONTEXT_MAPPINGS);
    setEntityRawResponse(null);
    setEntityError(null);
    setMatches(INITIAL_MATCHES);
    setAliases(INITIAL_ALIASES);
    setSearchProgress({ done: 0, total: 0 });
    setNormResults(INITIAL_NORM_RESULTS);
    setPreferredJobs(INITIAL_PREFERRED_JOBS);
  }, []);

  return {
    step, setStep: goToStep, advance, stepDone, markDone,
    imageFile, setImageFile, imagePreview, setImagePreview,
    preprocessedBlob, setPreprocessedBlob,
    ocrMode, setOcrMode, ocrText, setOcrText,
    ocrRunning, runOcr, ocrAbort, runOcrFix, stageIdx, progress,
    entities, updateEntity, removeEntity, addEntity,
    contextMappings, setContextMappings,
    entityRunning, entityError, entityRawResponse, runEntityDetection,
    matches, selectMatch, setMatchStatus,
    aliases, setAliases, searchRunning, searchProgress, runMusixploraSearch, runFallbackSearch,
    normResults, selectNorm, runNormSearch, normRunning,
    preferredJobs, setPreferredJobs,
    downloadedLangs,
    serializePipeline, restorePipeline, resetToDefaults,
  };
}
