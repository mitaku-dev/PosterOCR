export const TUTORIALS = [
  {
    step: 0,
    title: 'OCR – Texterkennung',
    icon: '📄',
    summary: 'Lade ein Konzertplakat hoch und extrahiere den Text mit OCR.',
    sections: [
      {
        heading: 'Ziel dieses Schritts',
        text: 'Aus einem gescannten Plakat oder Programmheft soll maschinell lesbarer Text gewonnen werden, der die Grundlage für alle weiteren Schritte bildet.',
      },
      {
        heading: 'So funktioniert es',
        text: '1. Bild per Drag & Drop oder Klick auf die Upload-Fläche laden.\n2. OCR-Sprache auswählen (z. B. „Deutsch" für moderne Texte, „Deutsch Fraktur" für historische).\n3. Auf „OCR starten" klicken – Tesserakt.js läuft direkt im Browser.\n4. Nach Abschluss kann der erkannte Text bearbeitet werden.',
      },
      {
        heading: 'Tipp',
        text: 'Bei schlechter Erkennung kann die KI-OCR-Korrektur (⚙ Einstellungen → OCR-Fix-Prompt) helfen, den Text zu bereinigen – vorausgesetzt, ein LLM-API-Key ist konfiguriert.',
      },
    ],
  },
  {
    step: 1,
    title: 'Entitätenerkennung',
    icon: '🔍',
    summary: 'Extrahiere Personen, Gruppen, Orte und Daten aus dem OCR-Text mithilfe einer KI.',
    sections: [
      {
        heading: 'Ziel dieses Schritts',
        text: 'Aus dem rohen OCR-Text sollen strukturierte Entitäten (Personen, Ensembles, Orte, Zeitangaben, Veranstaltungen) extrahiert werden – als Grundlage für den Datenbankabgleich.',
      },
      {
        heading: 'So funktioniert es',
        text: '1. Der OCR-Text wird an einen konfigurierten LLM-Anbieter (Claude, OpenAI, Gemini, Mistral oder lokales Ollama) gesendet.\n2. Die KI erkennt und klassifiziert die Entitäten.\n3. Ergebnisse können nachbearbeitet, umbenannt, ergänzt oder gelöscht werden.\n4. Textstellen können direkt aus dem hervorgehobenen OCR-Text übernommen werden.',
      },
      {
        heading: 'Konfiguration',
        text: 'Unter ⚙ Einstellungen können Alias-Regeln (z. B. „ß → ss") und Kontext-Mappings definiert werden, die die Erkennung verbessern. Der System-Prompt kann bei Bedarf angepasst werden.',
      },
    ],
  },
  {
    step: 2,
    title: 'Musixplora-Abgleich',
    icon: '🎵',
    summary: 'Gleiche die erkannten Entitäten mit der Musixplora-Datenbank ab.',
    sections: [
      {
        heading: 'Ziel dieses Schritts',
        text: 'Jeder Entität soll ein passender Eintrag aus der Musixplora-Datenbank zugeordnet werden, um strukturierte IDs und Metadaten zu erhalten.',
      },
      {
        heading: 'So funktioniert es',
        text: '1. „Alles suchen" startet die Suche für alle Entitäten gleichzeitig.\n2. Ergebnisse werden nach einem Score sortiert (Namensähnlichkeit 80%, Datumsnähe 20%).\n3. Für Komponisten zählt ausschließlich der Namensscore (100%).\n4. Klicke auf einen Treffer, um ihn auszuwählen.\n5. Bei Personen kann bei Bedarf die „Nur Nachnamen suchen"-Funktion genutzt werden.',
      },
      {
        heading: 'KI-Match (optional)',
        text: 'Der 🤖 KI-Match wählt automatisch den besten Treffer per LLM aus. Dies spart Zeit bei vielen Entitäten. Voraussetzung ist ein konfigurierter LLM-API-Key.',
      },
    ],
  },
  {
    step: 3,
    title: 'Normdaten',
    icon: '📖',
    summary: 'Suche autoritative Normdaten (GND, VIAF, Wikidata) für Entitäten ohne Musixplora-Treffer.',
    sections: [
      {
        heading: 'Ziel dieses Schritts',
        text: 'Für Entitäten, die nicht in Musixplora gefunden wurden, sollen verlässliche Identifikatoren aus den großen Normdatenbanken ermittelt werden.',
      },
      {
        heading: 'So funktioniert es',
        text: '1. Für jede Entität ohne Musixplora-Treffer wird automatisch eine Vorsuche gestartet.\n2. Klicke auf „Suchen", um die Ergebnisse für eine Entität zu öffnen.\n3. Es werden simultan GND (lobid.org), VIAF und Wikidata durchsucht.\n4. Die Ergebnisse werden anhand von Lebensdaten, Orten und Berufen bewertet.\n5. Wähle den passenden Eintrag aus oder überspringe die Entität.',
      },
      {
        heading: 'Besonderheiten',
        text: 'Doppelte Ergebnisse (z. B. GND und Wikidata für dieselbe Person) werden automatisch zusammengeführt. Der Score berücksichtigt Datenqualität und Kontext (Veranstaltungsjahr, Orte).',
      },
    ],
  },
  {
    step: 4,
    title: 'Export',
    icon: '💾',
    summary: 'Prüfe alle Ergebnisse und exportiere sie als JSON oder musXplora-Format.',
    sections: [
      {
        heading: 'Ziel dieses Schritts',
        text: 'Die vollständig verarbeiteten Daten sollen in einem strukturierten Format exportiert werden, das in anderen Systemen weiterverarbeitet werden kann.',
      },
      {
        heading: 'So funktioniert es',
        text: '1. Die Übersicht zeigt alle Entitäten mit ihren Musixplora- und Normdaten-Zuordnungen.\n2. Wähle zwischen JSON- und musXplora-Exportformat.\n3. Ein Klick auf „Exportieren" lädt die Daten als Datei herunter.\n4. Der JSON-Export enthält alle OCR-Daten, Entitäten, Musixplora-IDs und Normdaten-Referenzen.',
      },
      {
        heading: 'Hinweis',
        text: 'Nur Personen-Entitäten werden im musXplora-Format exportiert. Für eine vollständige Dokumentation aller Entitäten nutze das JSON-Format.',
      },
    ],
  },
];

export const TUTORIAL_STEP_LABELS = ['OCR', 'Entitäten', 'Musixplora', 'Normdaten', 'Export'];

export const TUTORIAL_EXTRA = [
  {
    step: -1,
    title: 'Weitere Funktionen',
    icon: '✨',
    summary: 'Entdecke die zusätzlichen Werkzeuge der App.',
    sections: [
      {
        heading: '⌕ Schnellsuche',
        text: 'Über den „⌕ Suche"-Button in der Kopfzeile kannst du jederzeit eine direkte Suche in Musixplora und Normdaten starten – ohne den Pipeline-Workflow durchlaufen zu müssen. Gib einfach einen Namen und Entitätstyp ein.',
      },
      {
        heading: '▶ Auto-Modus',
        text: 'Der Auto-Modus durchläuft die gesamte Pipeline automatisch von Schritt 0 bis 4. Voraussetzung ist eine aktive Session und ein konfigurierter LLM-API-Key. Der Fortschritt wird in der Kopfzeile angezeigt.',
      },
      {
        heading: '☰ Sessions',
        text: 'Mit dem ☰-Button links oben kannst du Sessions verwalten: anlegen, speichern, laden, umbenennen und löschen. Sessions speichern den gesamten Pipeline-Zustand (OCR-Text, Entitäten, Matches, Normdaten) im Browser.',
      },
    ],
  },
];
