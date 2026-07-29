import { useState, useCallback } from 'react';
import { PROVIDERS, DEFAULT_SYSTEM_PROMPT, DEFAULT_OCR_FIX_PROMPT } from '../services/llmService';

const STORAGE_KEY = 'poster_pipeline_llm_settings';

function migrateSettings(raw) {
  if (!raw) return null;
  const apiKeys = {};
  for (const [pid, val] of Object.entries(raw.apiKeys || {})) {
    if (Array.isArray(val)) {
      apiKeys[pid] = val;
    } else if (typeof val === 'string' && val) {
      apiKeys[pid] = [val];
    }
  }
  return { ...raw, apiKeys };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateSettings(JSON.parse(raw));
  } catch (_) {}
  return null;
}

function saveSettings(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (_) {}
}

export function useLLMSettings() {
  const stored = loadSettings();

  const [provider, setProvider]         = useState(stored?.provider     ?? 'claude');
  const [model, setModel]               = useState(stored?.model        ?? PROVIDERS.claude.defaultModel);
  const [apiKeys, setApiKeys]           = useState(stored?.apiKeys      ?? {});
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(stored?.ollamaBaseUrl ?? 'http://localhost:11434');
  const [systemPrompt, setSystemPrompt] = useState(stored?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT);
  const [ocrFixPrompt, setOcrFixPrompt] = useState(stored?.ocrFixPrompt ?? DEFAULT_OCR_FIX_PROMPT);
  const [ocrFixIncludeImage, setOcrFixIncludeImage] = useState(stored?.ocrFixIncludeImage ?? false);

  function persist(patch) {
    const next = { provider, model, apiKeys, ollamaBaseUrl, systemPrompt, ocrFixPrompt, ocrFixIncludeImage, ...patch };
    saveSettings(next);
  }

  const updateProvider = useCallback((p) => {
    const defaultModel = PROVIDERS[p]?.defaultModel ?? '';
    setProvider(p);
    setModel(defaultModel);
    persist({ provider: p, model: defaultModel });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt]);

  const updateModel = useCallback((m) => {
    setModel(m);
    persist({ model: m });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt]);

  const updateApiKey = useCallback((providerId, key) => {
    const next = { ...apiKeys, [providerId]: [key] };
    setApiKeys(next);
    persist({ apiKeys: next });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt]);

  const addApiKey = useCallback((providerId, key) => {
    if (!key?.trim()) return;
    const next = { ...apiKeys };
    const arr = Array.isArray(next[providerId]) ? [...next[providerId]] : [];
    arr.push(key.trim());
    next[providerId] = arr;
    setApiKeys(next);
    persist({ apiKeys: next });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt, ocrFixPrompt, ocrFixIncludeImage]);

  const removeApiKey = useCallback((providerId, index) => {
    const next = { ...apiKeys };
    const arr = Array.isArray(next[providerId]) ? [...next[providerId]] : [];
    arr.splice(index, 1);
    if (arr.length === 0) {
      delete next[providerId];
    } else {
      next[providerId] = arr;
    }
    setApiKeys(next);
    persist({ apiKeys: next });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt, ocrFixPrompt, ocrFixIncludeImage]);

  const updateOllamaBaseUrl = useCallback((url) => {
    setOllamaBaseUrl(url);
    persist({ ollamaBaseUrl: url });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt]);

  const updateSystemPrompt = useCallback((p) => {
    setSystemPrompt(p);
    persist({ systemPrompt: p });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt, ocrFixPrompt]);

  const resetSystemPrompt = useCallback(() => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    persist({ systemPrompt: DEFAULT_SYSTEM_PROMPT });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt, ocrFixPrompt]);

  const updateOcrFixPrompt = useCallback((p) => {
    setOcrFixPrompt(p);
    persist({ ocrFixPrompt: p });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt, ocrFixPrompt, ocrFixIncludeImage]);

  const resetOcrFixPrompt = useCallback(() => {
    setOcrFixPrompt(DEFAULT_OCR_FIX_PROMPT);
    persist({ ocrFixPrompt: DEFAULT_OCR_FIX_PROMPT });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt, ocrFixPrompt, ocrFixIncludeImage]);

  const updateOcrFixIncludeImage = useCallback((val) => {
    setOcrFixIncludeImage(val);
    persist({ ocrFixIncludeImage: val });
  }, [provider, model, apiKeys, ollamaBaseUrl, systemPrompt, ocrFixPrompt, ocrFixIncludeImage]);

  const currentKeys = apiKeys[provider] ?? [];
  const currentKey = currentKeys[0] ?? '';
  const providerInfo = PROVIDERS[provider];
  const isConfigured = providerInfo?.noKey ? true : !!currentKey;

  const hasAnyKeys = Object.entries(apiKeys).some(([pid, keys]) => {
    const pInfo = PROVIDERS[pid];
    if (pInfo?.noKey) return false;
    return Array.isArray(keys) ? keys.some(k => !!k) : !!keys;
  });

  return {
    provider, model, apiKeys, ollamaBaseUrl, systemPrompt, ocrFixPrompt,
    ocrFixIncludeImage, updateOcrFixIncludeImage,
    currentKey, currentKeys, providerInfo, isConfigured, hasAnyKeys,
    updateProvider, updateModel, updateApiKey, addApiKey, removeApiKey,
    updateOllamaBaseUrl, updateSystemPrompt, resetSystemPrompt,
    updateOcrFixPrompt, resetOcrFixPrompt,
  };
}
