# PosterOCR — Musixplora Pipeline

**OCR · Entity Detection · Database Matching · Authority Data Export**

A browser-based pipeline that transforms scanned concert posters and historical event programs into structured JSON metadata — entirely client-side.

## How to use

### Web App (GitHub Pages)

The app is available at **[https://mitaku-dev.github.io/PosterOCR/](https://mitaku-dev.github.io/PosterOCR/)** — no installation required. Opens in any modern browser. On first launch you'll be guided through adding an LLM API key.

### Desktop App (Electron)

Pre-built installers are available as **downloadable artifacts** from the [GitHub Actions](https://github.com/mitaku-dev/PosterOCR/actions) page:

1. Go to **Actions → Deploy to GitHub Pages → latest run**
2. Scroll down to **Artifacts**
3. Download **PosterOCR-Windows** (`.exe` installer) or **PosterOCR-Linux** (`.AppImage` / `.deb`)
4. Extract and run — no browser or server needed

### Build from source

```bash
git clone https://github.com/mitaku-dev/PosterOCR.git
cd PosterOCR
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # production build → dist/
npm run build:electron  # package as Electron app → release/
```

## Pipeline

```
[Poster Image] → [OCR] → [LLM Entity Extraction] → [Music DB Match] → [Authority Enrichment] → [JSON Export]
     Step 0         Step 0           Step 1                  Step 2                    Step 3             Step 4
```

### Step 0 — OCR
Upload an image (drag & drop or file picker), select a language, and run Tesseract.js v7 in the browser. Progress is shown per stage (core load, language init, recognition, post-processing). The result is editable text.

- 16 languages supported, grouped by download status
- Abortable via worker termination
- 120-second timeout prevents hanging on failed downloads
- Optional OCR-fix via LLM (cleans recognition errors)

### Step 1 — Entity Detection
Send the OCR text to a configurable LLM to extract entities (people, groups, places, dates, events). Results can be reviewed, edited, added to, or removed.

- **Providers**: Claude, OpenAI, Gemini, Mistral, Ollama (local)
- Custom system prompt with alias/context mapping support
- Highlighted text view with click-to-select interaction

### Step 2 — Database Matching (Musixplora)
Search entities against the live [Musixplora](https://musixplora.de/) database. Each entity type is mapped to the appropriate search tab.

- Real-time search against Musixplora's REST API
- Entity type → search tab mapping with fallback
- Variant alias rules (character replacements, etc.)
- Scoring: name similarity (80%) + date plausibility (20%) + job bonus (+10)
- AI-assisted match selection (optional)
- Fallback surname-only search for persons

### Step 3 — Authority Data (GND / VIAF / Wikidata)
Enrich entities with authority data. Each result is scored (0–100) based on date plausibility, place hints, and name variants.

- Cross-source deduplication (VIAF ↔ GND ↔ Wikidata)
- Detailed score breakdowns
- External links to GND, VIAF, and Wikidata
- AI-assisted match selection (optional)

### Step 4 — Export
Review all matched and enriched data, then export as JSON with Musixplora IDs and authority references.

## Features

- **Entity Search Modal** — standalone search tool (`⌕ Suche` in the header) to query Musixplora and Normdata directly without going through the pipeline
- **Session Management** — save/load/rename/delete pipeline sessions (localStorage)
- **Auto Mode** — run the full pipeline automatically with progress tracking
- **Settings Panel** — configure alias rules, preferred jobs (for scoring bonuses), LLM providers, theme
- **Dark / Light / System Theme**
- **AI Match** — optional LLM-assisted best-match selection for both Musixplora and Normdata

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

Multiple API keys per provider are supported with automatic fallback on quota errors.

### OCR Languages

16 languages: German, German Fraktur (`frk`), English, French, Italian, Spanish, Dutch, Portuguese, Russian, Czech, Polish, Danish, Swedish, Norwegian, Finnish, Hungarian. Downloaded languages are tracked in localStorage.

### Scoring Configuration

- **Preferred Jobs** — occupations that grant a +10 scoring bonus in Musixplora and Normdata matching (e.g., Komponist, Dirigent)
- **Aliases** — character replacement rules (e.g., `ß → ss`) applied to search queries before sending

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
│   ├── StepReview.jsx           JSON / MusXplora export
│   ├── SessionSidebar.jsx       Session list sidebar
│   ├── SettingsPanel.jsx        Full settings (aliases, jobs, LLM, design)
│   ├── EntitySearchModal.jsx    Standalone search tool (Musixplora + Normdata)
│   ├── FirstSetupModal.jsx      First-time LLM key setup
│   ├── LLMSettingsModal.jsx     LLM provider/model/prompt config
│   ├── AutoModeErrorModal.jsx   Quota error with retry UI
│   ├── AiErrorModal.jsx         Generic AI error display
│   └── ui.jsx                   Shared UI components (EntityTag, Badge, Btn, etc.)
├── data/
│   ├── initialState.js          Constants, entity types, defaults
│   └── languages.js             OCR language list
├── hooks/
│   ├── usePipelineState.js      Central state management
│   ├── useLLMSettings.js        LLM config persistence (localStorage)
│   ├── useSessions.js           Session CRUD (localStorage)
│   ├── useAutoMode.js           Auto-mode progress polling
│   └── useTheme.js              Light/dark/system toggle
└── services/
    ├── musixploraService.js     Musixplora API client + scoring
    ├── ocrService.js            Tesseract.js worker wrapper
    ├── llmService.js            Multi-provider LLM client
    ├── normSearch.js            GND / VIAF / Wikidata search + scoring
    ├── aiMatchingService.js     LLM-assisted best-match selection
    ├── autoModeService.js       Automated pipeline runner
    └── imagePreprocessing.js    Canvas-based image preprocessing
```

State is managed locally via React hooks and drilled as props. No global state library — the two custom hooks (`usePipelineState`, `useLLMSettings`) hold all application state, with localStorage for persistence.

## Architecture

### Data Flow

```
usePipelineState          useLLMSettings
       │                       │
       └─────── App ───────────┘
                   │
        ┌──────────┼──────────┬──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼
    StepOCR   StepEntities  StepMx    StepNorm    StepReview
       │           │          │          │
       ▼           ▼          ▼          ▼
  ocrService   llmService  mxService  normSearch
  (Tesseract)  (Anthropic/ (musixplora (lobid/
                OpenAI/     .de/API)    VIAF/
                Gemini/                 Wikidata)
                Mistral/
                Ollama)
```

### Musixplora API

| Detail | Value |
|--------|-------|
| Endpoint | `musixplora.de/Server/sendQuery.php` |
| Method | `POST` (form-encoded) |
| Entity type mapping | `person`→Personen (tab 0), `group`→Institutionen (tab 1), `place`→Orte (tab 3), `event`/`time`→Ereignisse (tab 5), `other`→Sachen (tab 6) |
| Scoring | Name similarity (80%) + date plausibility (20%) + job bonus (+10) |
| CORS | Vite proxy in dev, direct fetch in production |

### Normdaten Search

| Source | Endpoint | Filtering |
|--------|----------|-----------|
| GND | `lobid.org/gnd/search` | `type:Person`, Lucene |
| VIAF | `viaf.org/viaf/AutoSuggest` + cluster fetch | `nametype=personal` |
| Wikidata | `wikidata.org/w/api.php` (wbsearchentities + wbgetentities) | `instance of (P31) = human (Q5)` |

Search uses multiple name variants and deduplicates by cross-referenced IDs. Scoring considers birth/death dates, location hints, name variants, and preferred jobs.

## Limitations

- **No TypeScript** — the project uses plain JSX
- **No tests** — no test framework or test files exist
- **No backend proxy** — LLM API keys are sent directly from the browser
- **No CSS framework** — styling is inline with CSS custom properties for theming
- **localStorage-only persistence** — sessions and settings survive page reload but not browser data clearance

## License

MIT
