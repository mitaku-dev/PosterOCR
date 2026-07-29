/**
 * llmService.js
 * Multi-provider LLM service for entity detection.
 * Supports: Claude (Anthropic), OpenAI, Gemini, Mistral, Ollama (local)
 */

export class QuotaError extends Error {
  constructor(msg) { super(msg); this.name = 'QuotaError'; }
}

export function isQuotaError(err) {
  if (err instanceof QuotaError) return true;
  if (!err?.message) return false;
  return /quota|rate.?limit|insufficient_quota|insufficient.?balance|RESOURCE_EXHAUSTED/i.test(err.message);
}

function checkQuota(status, errMsg) {
  if (status === 429 || status === 402) return true;
  return /quota|rate.?limit|insufficient_quota|insufficient.?balance|RESOURCE_EXHAUSTED/i.test(errMsg);
}

export const PROVIDERS = {
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    icon: '◆',
    color: '#D97757',
    models: [
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
      { id: 'claude-fable-5', label: 'Claude Fable 5' },
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
      { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
      { id: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    ],
    defaultModel: 'claude-sonnet-5',
    keyPlaceholder: 'sk-ant-api03-…',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    icon: '⬡',
    color: '#10A37F',
    models: [
      { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol' },
      { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
      { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    ],
    defaultModel: 'gpt-5.6-terra',
    keyPlaceholder: 'sk-…',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini (Google)',
    icon: '✦',
    color: '#4285F4',
    models: [
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
    ],
    defaultModel: 'gemini-2.5-flash',
    keyPlaceholder: 'AIzaSy…',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    icon: '≋',
    color: '#FF7000',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large' },
      { id: 'mistral-small-latest', label: 'Mistral Small' },
      { id: 'codestral-latest', label: 'Codestral' },
      { id: 'ministral-3b-latest', label: 'Ministral 3B' },
      { id: 'open-mistral-nemo', label: 'Mistral Nemo (open)' },
    ],
    defaultModel: 'mistral-small-latest',
    keyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://console.mistral.ai/api-keys/',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (lokal)',
    icon: '⊛',
    color: '#6B6B6B',
    models: [
      { id: 'llama3.2', label: 'Llama 3.2' },
      { id: 'llama3.1', label: 'Llama 3.1' },
      { id: 'mistral', label: 'Mistral' },
      { id: 'gemma2', label: 'Gemma 2' },
      { id: 'phi3', label: 'Phi-3' },
    ],
    defaultModel: 'llama3.2',
    keyPlaceholder: '(kein API-Key erforderlich)',
    noKey: true,
    docsUrl: 'https://ollama.com',
    baseUrl: 'http://localhost:11434',
  },
};

export const DEFAULT_SYSTEM_PROMPT = `Du bist ein Experte für die Analyse von Konzertprogrammen und historischen Musikveranstaltungen.

Analysiere den folgenden OCR-Text eines Konzertprogramms und extrahiere alle relevanten Entitäten.

Gib die Entitäten als JSON-Array zurück. Jede Entität hat folgende Felder:
- "text": Der exakte Text wie er im Dokument steht (wichtig: nicht normalisieren)
- "type": Eine der folgenden Kategorien: "person", "group", "place", "time", "event", "other"
- "alias": Falls bekannt, eine normierte Form oder ein alternativer Name (z.B. "Unichor" für "Universitäts-Chor der Karl-Marx-Universität"), sonst ""
- "isComposer": (nur bei Personen) true wenn die Person ein Komponist ist, sonst false

Kategorien:
- person: Einzelpersonen (Dirigenten, Solisten, Komponisten, Redner, etc.)
- group: Ensembles, Orchester, Chöre, Bands
- place: Veranstaltungsorte, Städte, Gebäude, Säle
- time: Datums- und Zeitangaben
- event: Veranstaltungsnamen, Konzertreihen, Festivals
- other: Sonstige relevante Entitäten

Wichtige Hinweise:
- Extrahiere NUR tatsächlich vorkommende Entitäten, keine Vermutungen
- Bei Komponisten: immer als "person" klassifizieren und "isComposer": true setzen
- Bei Dirigenten, Solisten, etc. die keine Komponisten sind: "isComposer": false
- Institutionelle Bezeichnungen (Orchester, Chor, etc.) als "group"
- Gib ausschließlich das JSON-Array zurück — keine Einleitung, kein Markdown, keine Codeblöcke, keine Gedanken, keine Erklärungen.
Starte direkt mit '[' und ende mit ']'. Nichts davor, nichts danach.

Antwortformat (ausschließlich dies, kein anderer Text):
[{"text": "Johann Sebastian Bach", "type": "person", "alias": "", "isComposer": true},{"text": "Gewandhausorchester Leipzig", "type": "group", "alias": "Gewandhaus", "isComposer": false}]`;

// ─── Helper: build multimodal content array ──────────────────────────────────

function parseImageDataUri(dataUri) {
  if (!dataUri) return null;
  const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

function buildContentWithImage(text, imageDataUri) {
  const parsed = parseImageDataUri(imageDataUri);
  if (!parsed) return text;
  return [
    { type: 'text', text },
    { type: 'image', source: { type: 'base64', media_type: parsed.mime, data: parsed.data } },
  ];
}

function buildOpenAIContent(text, imageDataUri) {
  const parsed = parseImageDataUri(imageDataUri);
  if (!parsed) return text;
  return [
    { type: 'text', text },
    { type: 'image_url', image_url: { url: imageDataUri } },
  ];
}

function buildGeminiParts(text, imageDataUri) {
  const parsed = parseImageDataUri(imageDataUri);
  if (!parsed) return [{ text }];
  return [
    { text },
    { inline_data: { mime_type: parsed.mime, data: parsed.data } },
  ];
}

function buildOllamaBody(model, systemPrompt, userMessage, imageDataUri) {
  const base = { model, stream: false };
  const parsed = parseImageDataUri(imageDataUri);
  if (!parsed) {
    return JSON.stringify({ ...base, prompt: `${systemPrompt}\n\n${userMessage}` });
  }
  return JSON.stringify({ ...base, system: systemPrompt, prompt: userMessage, images: [parsed.data] });
}

// ─── Provider-specific API calls ──────────────────────────────────────────────

async function callClaude(apiKey, model, systemPrompt, userMessage, imageDataUri) {
  const content = imageDataUri ? buildContentWithImage(userMessage, imageDataUri) : userMessage;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `Claude API Fehler ${res.status}`;
    if (checkQuota(res.status, msg)) throw new QuotaError(msg);
    throw new Error(msg);
  }
  const data = await res.json();
  const blocks = data.content ?? [];
  for (const block of blocks) {
    if (block.type === 'text' && block.text) return block.text;
  }
  return '';
}

async function callOpenAI(apiKey, model, systemPrompt, userMessage, imageDataUri) {
  const content = imageDataUri ? buildOpenAIContent(userMessage, imageDataUri) : userMessage;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content },
      ],
      max_tokens: 8192,
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `OpenAI Fehler ${res.status}`;
    if (checkQuota(res.status, msg)) throw new QuotaError(msg);
    throw new Error(msg);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGemini(apiKey, model, systemPrompt, userMessage, imageDataUri) {
  const parts = imageDataUri ? buildGeminiParts(userMessage, imageDataUri) : [{ text: userMessage }];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `Gemini Fehler ${res.status}`;
    if (checkQuota(res.status, msg)) throw new QuotaError(msg);
    throw new Error(msg);
  }
  const data = await res.json();
  const partsOut = data.candidates?.[0]?.content?.parts ?? [];
  for (const part of partsOut) {
    if (part.text) return part.text;
  }
  return '';
}

async function callMistral(apiKey, model, systemPrompt, userMessage, imageDataUri) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      max_tokens: 8192,
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `Mistral Fehler ${res.status}`;
    if (checkQuota(res.status, msg)) throw new QuotaError(msg);
    throw new Error(msg);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callOllama(baseUrl, model, systemPrompt, userMessage, imageDataUri) {
  const body = buildOllamaBody(model, systemPrompt, userMessage, imageDataUri);
  const url = `${baseUrl || 'http://localhost:11434'}/api/generate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`Ollama Fehler ${res.status} — läuft Ollama lokal?`);
  const data = await res.json();
  return data.response ?? '';
}

// ─── Parse LLM response into entity array ────────────────────────────────────

export function parseEntityResponse(text) {
  if (!text || !text.trim()) throw new Error('Leere Antwort vom LLM erhalten');

  // Strip markdown code fences everywhere
  let cleaned = text.trim();
  cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/\s*```\s*$/g, '').trim();

  // Find first '[' and last ']' to extract JSON array
  const start = cleaned.indexOf('[');
  const end   = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('Kein JSON-Array in der Antwort gefunden');

  const jsonStr = cleaned.slice(start, end + 1);
  let raw;
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    // Try to fix truncated/malformed JSON by balancing brackets
    const fixed = jsonStr.replace(/,\s*\]/g, ']').replace(/,\s*}$/g, '}').replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    raw = JSON.parse(fixed);
  }

  if (!Array.isArray(raw)) throw new Error('Antwort ist kein Array');

  const VALID_TYPES = new Set(['person', 'group', 'place', 'time', 'event', 'other']);

  return raw
    .filter(item => typeof item === 'object' && item !== null && typeof item.text === 'string' && item.text.trim())
    .map((item, i) => ({
      id: Date.now() + i,
      text: item.text.trim(),
      type: VALID_TYPES.has(item.type) ? item.type : 'other',
      alias: typeof item.alias === 'string' ? item.alias.trim() : '',
      isComposer: item.type === 'person' ? !!item.isComposer : false,
    }));
}

export const DEFAULT_OCR_FIX_PROMPT = `Du bist ein Experte für die Bereinigung von OCR-Texten historischer Konzertprogramme.

Entferne alle unnötigen Sonderzeichen, korrigiere offensichtliche OCR-Fehler und formatiere den Text sauber.
Behalte den gesamten Inhalt vollständig bei — ändere keine Namen, Daten oder Orte.
Verbessere nur die Lesbarkeit durch Korrektur von Zeilenumbrüchen, überflüssigen Leerzeichen und offensichtlichen OCR-Artefakten.

Gib ausschließlich den bereinigten Text zurück, keine Erklärungen oder Einleitungen.`;

// ─── Key-rotation fallback ──────────────────────────────────────────────────

async function tryKeys(keys, fn) {
  const arr = Array.isArray(keys) && keys.length > 0 ? keys : [];
  if (arr.length === 0) return fn('');
  let lastErr;
  for (const key of arr) {
    if (!key) continue;
    try {
      return await fn(key);
    } catch (err) {
      lastErr = err;
      if (!isQuotaError(err)) throw err;
    }
  }
  throw lastErr || new Error('Alle API-Keys erschöpft');
}

// ─── Main entry point: entity detection ────────────────────────────────────────

// ─── Generic LLM call (returns raw text, no parsing) ─────────────────────────

export async function callLLM({ provider, apiKey, apiKeys, model, systemPrompt, userMessage, baseUrl, imageData }) {
  const keys = apiKeys || (apiKey ? [apiKey] : []);
  return tryKeys(keys, (key) => {
    switch (provider) {
      case 'claude':  return callClaude(key, model, systemPrompt, userMessage, imageData);
      case 'openai':  return callOpenAI(key, model, systemPrompt, userMessage, imageData);
      case 'gemini':  return callGemini(key, model, systemPrompt, userMessage, imageData);
      case 'mistral': return callMistral(key, model, systemPrompt, userMessage, imageData);
      case 'ollama':  return callOllama(baseUrl, model, systemPrompt, userMessage, imageData);
      default: throw new Error(`Unbekannter Anbieter: ${provider}`);
    }
  });
}

export async function detectEntities({ provider, apiKey, apiKeys, model, systemPrompt, ocrText, contextMappings, baseUrl }) {
  const userMessage = buildUserMessage(ocrText, contextMappings);
  const keys = apiKeys || (apiKey ? [apiKey] : []);

  const rawText = await tryKeys(keys, (key) => {
    switch (provider) {
      case 'claude':  return callClaude(key, model, systemPrompt, userMessage);
      case 'openai':  return callOpenAI(key, model, systemPrompt, userMessage);
      case 'gemini':  return callGemini(key, model, systemPrompt, userMessage);
      case 'mistral': return callMistral(key, model, systemPrompt, userMessage);
      case 'ollama':  return callOllama(baseUrl, model, systemPrompt, userMessage);
      default: throw new Error(`Unbekannter Anbieter: ${provider}`);
    }
  });

  return { rawText, entities: parseEntityResponse(rawText) };
}

function buildUserMessage(ocrText, contextMappings) {
  let msg = `Analysiere folgenden Konzertprogramm-Text:\n\n${ocrText}`;
  if (contextMappings?.length > 0) {
    msg += '\n\nBekannte Alias-Zuordnungen (diese bitte als "alias" verwenden):\n';
    contextMappings.forEach(m => { msg += `- "${m.from}" → "${m.to}"\n`; });
  }
  return msg;
}
