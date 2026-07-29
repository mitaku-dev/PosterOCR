# Musixplora Pipeline

**OCR · Entity Detection · Database Matching · Authority Data Export**

A browser-based pipeline that transforms scanned concert posters and historical event programs into structured JSON metadata — entirely client-side.

## Pipeline

```
[Poster Image] → [OCR] → [LLM Entity Extraction] → [Music DB Match] → [Authority Enrichment] → [JSON Export]
     Step 0         Step 0           Step 1                  Step 2                    Step 3             Step 3
```

### Step 0 — OCR
Upload an image (drag & drop or file picker), select a language, and run Tesseract.js v7 in the browser. Progress is shown per stage (core load, language init, recognition, post-processing). The result is editable text.

- 16 languages supported, grouped by download status
- Abortable via worker termination
- 120-second timeout prevents hanging on failed downloads

### Step 1 — Entity Detection
Send the OCR text to a configurable LLM to extract entities (people, groups, places, dates, events). Results can be reviewed, edited, added to, or removed.

- **Providers**: Claude, OpenAI, Gemini, Mistral, Ollama (local)
- Custom system prompt with alias/context mapping support
- Highlighted text view with click-to-select interaction

### Step 2 — Database Matching (Musixplora)
Search entities against the live [Musixplora](https://musixplora.de/) database. Each entity type is mapped to the appropriate search tab (personen → Personen, groups → Institutionen, places → Orte, events → Ereignisse). Alias/variant rules are applied to search queries before sending.

- Real-time search against Musixplora's REST API
- Entity type → search tab mapping with fallback
- Variant alias rules (character replacements, etc.)
- Status tracking: matched, no match, skip

### Step 3 — Authority Data & Export
Enrich entities with authority data from GND (lobid.org), VIAF, and Wikidata. Each result is scored (0–100) based on date plausibility, place hints, and data richness.

- Cross-source deduplication (VIAF ↔ GND)
- Detailed score explanations
- JSON export with Musixplora IDs and authority references

## Tech Stack

| Layer | Library | Version |
|-------|---------|---------|
| UI | React | ^19.2.4 |
| DOM | react-dom | ^19.2.4 |
| Build | Vite | ^8.0.4 |
| OCR | Tesseract.js | ^7.0.0 |
| Lint | ESLint | ^9.39.4 |
| Icons | Lucide React | ^1.8.0 |

All processing runs in the browser — no server required. OCR uses Tesseract WASM, LLM calls go directly to provider APIs, and authority data is fetched from public REST endpoints.

## Getting Started

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

### Build

```bash
npm run build
npm run preview
```

## Configuration

### LLM Providers

API keys are configured in the UI via the settings modal and persisted to localStorage. Supported providers:

| Provider | Key Required | Notes |
|----------|-------------|-------|
| Claude (Anthropic) | Yes | Browser CORS requires `x-api-key` header |
| OpenAI | Yes | Standard `Authorization: Bearer` |
| Gemini (Google) | Yes | Key passed as URL query param |
| Mistral AI | Yes | Standard `Authorization: Bearer` |
| Ollama | No | Connects to local instance, configurable base URL |

A `.env` file is provided for reference (not required at runtime — keys are entered in the UI).

### OCR Languages

16 languages are available: German, German Fraktur (`frk`), English, French, Italian, Spanish, Dutch, Portuguese, Russian, Czech, Polish, Danish, Swedish, Norwegian, Finnish, Hungarian. Downloaded languages are tracked in localStorage and displayed in a separate group.

## Project Structure

```
src/
├── main.jsx                     Entry point
├── App.jsx                      Root component, pipeline orchestration
├── components/
│   ├── PipelineNav.jsx          Step navigation bar
│   ├── StepOCR.jsx              Image upload + OCR
│   ├── StepEntities.jsx         LLM entity detection
│   ├── StepMusixplora.jsx       Database match review
│   ├── StepNormdata.jsx         Authority data search + export
│   ├── LLMSettingsModal.jsx     LLM provider configuration
│   └── ui.jsx                   Shared UI components
├── data/
│   ├── initialState.js          Sample data and constants
│   └── languages.js             OCR language list
├── hooks/
│   ├── usePipelineState.js      Central state management
│   └── useLLMSettings.js        LLM config persistence
└── services/
    ├── musixploraService.js     Musixplora API client
    ├── ocrService.js            Tesseract.js worker
    ├── llmService.js            Multi-provider LLM client
    └── normSearch.js            GND / VIAF / Wikidata search
```

State is managed locally via React hooks and drilled as props. No global state library — the two custom hooks (`usePipelineState`, `useLLMSettings`) hold all application state, with localStorage for LLM settings and downloaded language tracking.

## Architecture

### Data Flow

```
usePipelineState          useLLMSettings
       │                       │
       └─────── App ───────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    StepOCR   StepEntities  StepMusixplora  StepNormdata
       │           │              │               │
       ▼           ▼              ▼               ▼
  ocrService   llmService  musixploraService  normSearch
  (Tesseract)  (Anthropic/  (musixplora.de/    (lobid.org/
                OpenAI/      Server/            VIAF/
                Gemini/      sendQuery.php)     Wikidata)
                Mistral/
                Ollama)
```

### Musixplora API

| Detail | Value |
|--------|-------|
| Endpoint | `musixplora.de/Server/sendQuery.php` |
| Method | `POST` (form-encoded) |
| Entity type mapping | `person`→Personen (tab 0), `group`→Institutionen (tab 1), `place`→Orte (tab 3), `event`/`time`→Ereignisse (tab 5), `other`→Sachen (tab 6) |
| Alias handling | Search queries are rewritten using user-defined variant rules before sending |
| CORS | Bypassed in development via Vite proxy (`/musixplora` → `https://musixplora.de`) |

Search results include the Musixplora entity ID, display name, and type label. No confidence score is provided by the API — the score column is hidden when unavailable.

### Normdaten Search

| Source | Endpoint | Filtering |
|--------|----------|-----------|
| GND | `lobid.org/gnd/search` | `type:Person`, Lucene |
| VIAF | `viaf.org/viaf/AutoSuggest` + cluster fetch | `nametype=personal` |
| Wikidata | `wikidata.org/w/api.php` (wbsearchentities + wbgetentities) | `instance of (P31) = human (Q5)` |

Search uses multiple name variants (original, last-name-only, reversed) and deduplicates results by cross-referenced IDs. Scoring considers birth/death dates relative to extracted event year, location hints, and data completeness.

## Limitations

- **No TypeScript** — the project uses plain JSX
- **No tests** — no test framework or test files exist
- **No backend proxy** — LLM API keys are sent directly from the browser
- **Musixplora CORS** — the API requires a proxy in production (Vite dev server handles this automatically); for production builds, deploy a reverse proxy or use the app from a same-origin context
- **No CSS framework** — styling is inline with CSS custom properties for theming
- **State resets on refresh** — only LLM settings and downloaded languages persist across sessions

## Vision

Musixplora Pipeline is designed for music historians, archivists, and librarians who work with digitized concert programs and need a reproducible, transparent workflow from scanned poster to structured authority data.

The app is in active development. Planned directions include:

- TypeScript migration
- Worker pool for repeated OCR
- Export formats beyond JSON (CSV, MARC, RDF)
- Persistent project state via IndexedDB
- Keyboard shortcuts and accessibility improvements

## License

MIT
