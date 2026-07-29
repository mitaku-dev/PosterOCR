import { callLLM } from './llmService';

function buildMusixploraPrompt(entity, ocrText, results) {
  const detailBlocks = results.map((r, i) => {
    const d = r.detail || {};
    let info = `${i + 1}. "${r.name}"`;
    if (d.name && d.name !== r.name) info += ` (${d.name})`;
    if (d.birth || d.death) info += ` [${d.birth || '?'}–${d.death || '?'}]`;
    if (d.mainJobs?.length) info += ` Beruf: ${d.mainJobs.slice(0, 3).join(', ')}`;
    if (d.occupations?.length) info += ` Tätigkeiten: ${d.occupations.slice(0, 5).join(', ')}`;
    if (d.mainPlace?.length) info += ` Ort: ${d.mainPlace.slice(0, 2).join(', ')}`;
    if (d.places?.length) info += ` Orte: ${d.places.slice(0, 3).join(', ')}`;
    if (d.alternatives?.length) info += ` Alternativ: ${d.alternatives.slice(0, 3).join(', ')}`;
    if (d.nameVariants?.length) info += ` Varianten: ${d.nameVariants.slice(0, 3).join(', ')}`;
    if (d.aliasNames?.length) info += ` Alias: ${d.aliasNames.slice(0, 3).join(', ')}`;
    if (d.nationality?.length) info += ` Nationalität: ${d.nationality.join(', ')}`;
    if (d.gender) info += ` Geschlecht: ${d.gender}`;
    if (d.art) info += ` Art: ${d.art}`;
    if (d.externalIds && Object.keys(d.externalIds).length) info += ` IDs: ${Object.entries(d.externalIds).slice(0, 4).map(([k, v]) => `${k}=${v}`).join(', ')}`;
    return info;
  }).join('\n');

  const entityDesc = `"${entity.text}" (Typ: ${entity.type}${entity.isComposer ? ', Komponist' : ''})`;

  return `Du wählst den besten Treffer aus einer Datenbank-Suche für eine Entität aus einem Konzertprogramm.

Kontext (OCR-Text des gesamten Posters):
${ocrText || '(kein weiterer Kontext)'}

Gesuchte Entität: ${entityDesc}

Suchergebnisse:
${detailBlocks || '(keine Detaildaten verfügbar)'}

Wähle den Treffer, der am besten zur gesuchten Entität passt. Berücksichtige:
- Exakte Namensübereinstimmung
- Typ (Person, Gruppe, Ort etc.)
- Bei Personen: Geburts-/Todesdaten, Berufe, Orte, Lebensdaten im Kontext der Veranstaltung
- Bei Gruppen: Alternativnamen, Orte, Zeitraum
- Bei Orten: Name, Lage

Antworte NUR mit der Nummer des besten Treffers (1-${results.length}) oder 0 wenn keiner passt. Keine Erklärung, nur eine Zahl.`;
}

function buildNormdataPrompt(entity, ocrText, results) {
  const detailBlocks = results.map((r, i) => {
    let info = `${i + 1}. "${r.name}"`;
    if (r.birth || r.death) info += ` [${r.birth || '?'}–${r.death || '?'}]`;
    if (r.occupation?.length) info += ` Beruf: ${r.occupation.slice(0, 3).join(', ')}`;
    if (r.placeHints?.length) info += ` Orte: ${r.placeHints.slice(0, 3).join(', ')}`;
    if (r.source) info += ` Quelle: ${r.source}`;
    if (r.gnd) info += ` GND:${r.gnd}`;
    if (r.wikidataLink) info += ` WIKI:${r.wikidataLink}`;
    if (r.viaf) info += ` VIAF:${r.viaf}`;
    return info;
  }).join('\n');

  const entityDesc = `"${entity.text}" (Typ: ${entity.type}${entity.isComposer ? ', Komponist' : ''})`;

  return `Du wählst den besten Normdaten-Treffer für eine Entität aus einem Konzertprogramm.

Kontext (OCR-Text des gesamten Posters):
${ocrText || '(kein weiterer Kontext)'}

Gesuchte Entität: ${entityDesc}

Normdaten-Treffer:
${detailBlocks || '(keine Detaildaten)'}

Wähle den Treffer, der am besten passt. Berücksichtige Namensähnlichkeit, Lebensdaten, Berufe, Orte.
Antworte NUR mit der Nummer (1-${results.length}) oder 0 wenn keiner passt. Nur eine Zahl.`;
}

export async function aiMusixploraMatch(entity, ocrText, results, llmSettings) {
  if (!results || results.length === 0) return null;
  if (results.length === 1) return 0;

  const prompt = buildMusixploraPrompt(entity, ocrText, results);
  const answer = await callLLM({
    provider: llmSettings.provider,
    apiKeys: llmSettings.currentKeys,
    model: llmSettings.model,
    systemPrompt: 'Du antwortest ausschließlich mit einer Zahl. Keine Erklärung.',
    userMessage: prompt,
    baseUrl: llmSettings.ollamaBaseUrl,
  });

  const num = parseInt(answer?.trim(), 10);
  if (isNaN(num) || num < 0 || num > results.length) return null;
  return num === 0 ? null : num - 1;
}

export async function aiNormdataMatch(entity, ocrText, results, llmSettings) {
  if (!results || results.length === 0) return null;
  if (results.length === 1) return 0;

  const prompt = buildNormdataPrompt(entity, ocrText, results);
  const answer = await callLLM({
    provider: llmSettings.provider,
    apiKeys: llmSettings.currentKeys,
    model: llmSettings.model,
    systemPrompt: 'Du antwortest ausschließlich mit einer Zahl. Keine Erklärung.',
    userMessage: prompt,
    baseUrl: llmSettings.ollamaBaseUrl,
  });

  const num = parseInt(answer?.trim(), 10);
  if (isNaN(num) || num < 0 || num > results.length) return null;
  return num === 0 ? null : num - 1;
}
