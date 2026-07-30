import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Btn, Badge, Divider, SectionLabel, EntityTag, StepFooter, OptionalBadge } from './ui';
import { TYPE_COLORS } from '../data/initialState';
import { aiNormdataMatch } from '../services/aiMatchingService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractContext(entities) {
  // Pull event year from time entities
  let eventYear = null;
  const placeHints = [];

  for (const ent of entities) {
    if (ent.type === 'time') {
      const m = (ent.text + ' ' + (ent.alias || '')).match(/\b(1[89]\d{2}|20[012]\d)\b/);
      if (m) { const y = parseInt(m[1], 10); if (!eventYear || y < eventYear) eventYear = y; }
    }
    if (ent.type === 'place') {
      const place = (ent.alias || ent.text).trim();
      if (place) placeHints.push(place);
    }
  }

  return { eventYear, placeHints };
}

// ─── Source badge ─────────────────────────────────────────────────────────────

const SOURCE_CFG = {
  GND:      { bg: '#E6F1FB', color: '#185FA5', label: 'GND',      dot: '#185FA5' },
  VIAF:     { bg: '#E1F5EE', color: '#085041', label: 'VIAF',     dot: '#1D9E75' },
  Wikidata: { bg: '#EEEDFE', color: '#3C3489', label: 'Wikidata', dot: '#7F77DD' },
};

export function SourceBadge({ source, small }) {
  const c = SOURCE_CFG[source] || { bg: '#F1EFE8', color: '#444441', label: source, dot: '#888' };
  return (
    <span style={{
      fontSize: small ? 10 : 11, padding: small ? '1px 5px' : '2px 7px',
      borderRadius: 10, fontWeight: 600, background: c.bg, color: c.color, flexShrink: 0,
    }}>
      {c.label}
    </span>
  );
}

export function ScorePill({ score, breakdown }) {
  const [showPopup, setShowPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const pillRef = useRef(null);
  const color = score >= 70 ? '#085041' : score >= 50 ? '#633806' : '#5a5750';
  const bg    = score >= 70 ? '#E1F5EE' : score >= 50 ? '#FAEEDA' : '#F1EFE8';

  const lines = breakdown ? [
    { label: 'Basis', value: breakdown.base, style: {} },
    { label: 'Datum', value: breakdown.date, style: { color: breakdown.date > 0 ? '#085041' : breakdown.date < 0 ? '#A32D2D' : undefined } },
    { label: 'Ort', value: breakdown.place, style: { color: breakdown.place > 0 ? '#085041' : undefined } },
    { label: 'Namensvariante', value: breakdown.nameBonus, style: { color: breakdown.nameBonus > 0 ? '#085041' : undefined } },
    { label: 'Berufsbonus', value: breakdown.jobBonus, style: { color: breakdown.jobBonus > 0 ? '#1D9E75' : undefined } },
  ] : null;

  const handleMouseEnter = () => {
    if (!pillRef.current) return;
    const rect = pillRef.current.getBoundingClientRect();
    setPopupPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    setShowPopup(true);
  };

  return (
    <span style={{ display: 'inline-flex' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowPopup(false)}
    >
      <span ref={pillRef} style={{
        fontSize: 11, padding: '2px 7px', borderRadius: 10, fontWeight: 600,
        background: bg, color, flexShrink: 0, cursor: 'default',
      }}>
        {score}
      </span>
      {showPopup && lines && (
        <div style={{
          position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 1000,
          transform: 'translateX(-50%)',
          background: 'var(--bg)', border: '0.5px solid var(--border-md)',
          borderRadius: 8, padding: '7px 10px', minWidth: 130,
          boxShadow: '0 4px 16px rgba(0,0,0,.15)',
          pointerEvents: 'none', whiteSpace: 'nowrap',
          fontSize: 11, lineHeight: 1.7,
        }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, color: 'var(--fg-muted)', ...l.style }}>
              <span>{l.label}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {l.value > 0 ? `+${l.value}` : l.value}
              </span>
            </div>
          ))}
          <div style={{ borderTop: '0.5px solid var(--border-faint)', margin: '4px 0 2px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12, color: '#378ADD' }}>
            <span>Gesamt</span>
            <span>{score}</span>
          </div>
        </div>
      )}
    </span>
  );
}

// ─── External links for each source ──────────────────────────────────────────

export function buildLinks(result) {
  const links = [];

  if (result.source === 'GND') {
    links.push({ label: 'GND',      url: `https://d-nb.info/gnd/${result.id}`, color: SOURCE_CFG.GND.color });
    links.push({ label: 'lobid',    url: `https://lobid.org/gnd/${result.id}`, color: '#444' });
    if (result.viafId)       links.push({ label: 'VIAF',     url: `https://viaf.org/viaf/${result.viafId}`,           color: SOURCE_CFG.VIAF.color });
    if (result.wikidataLink) links.push({ label: 'Wikidata', url: `https://www.wikidata.org/wiki/${result.wikidataLink}`, color: SOURCE_CFG.Wikidata.color });
  }

  if (result.source === 'VIAF') {
    links.push({ label: 'VIAF',     url: `https://viaf.org/viaf/${result.id}`, color: SOURCE_CFG.VIAF.color });
    if (result.gndLink) links.push({ label: 'GND',  url: `https://d-nb.info/gnd/${result.gndLink}`,          color: SOURCE_CFG.GND.color });
    if (result.lcLink)  links.push({ label: 'LC',   url: `https://id.loc.gov/authorities/names/${result.lcLink}`, color: '#8B0000' });
    if (result.wikidataLink) links.push({ label: 'Wikidata', url: `https://www.wikidata.org/wiki/${result.wikidataLink}`, color: SOURCE_CFG.Wikidata.color });
  }

  if (result.source === 'Wikidata') {
    links.push({ label: 'Wikidata', url: `https://www.wikidata.org/wiki/${result.id}`,     color: SOURCE_CFG.Wikidata.color });
    links.push({ label: 'Wikipedia', url: `https://de.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(result.name)}`, color: '#666' });
    if (result.gndLink) links.push({ label: 'GND',  url: `https://d-nb.info/gnd/${result.gndLink}`,  color: SOURCE_CFG.GND.color });
    if (result.viafId)  links.push({ label: 'VIAF', url: `https://viaf.org/viaf/${result.viafId}`,  color: SOURCE_CFG.VIAF.color });
  }

  return links.filter(l => l.url);
}

// ─── Score explanation tooltip ────────────────────────────────────────────────

export function ScoreExplanation({ result, context, isComposer }) {
  const { eventYear, placeHints = [] } = context || {};
  const notes = [];

  const birthYear = result.birth ? parseInt(result.birth, 10) : null;
  const deathYear = result.death ? parseInt(result.death, 10) : null;

  if (eventYear && birthYear) {
    const age = eventYear - birthYear;
    if (isComposer) {
      if (age < 0) notes.push(`✕ Nach Veranstaltung (${eventYear}) geboren`);
      else if (age < 10) notes.push(`⚠ Zu jung bei Veranstaltung (${age} Jahre)`);
    } else {
      if (age < 0)        notes.push(`✕ Nach Veranstaltung (${eventYear}) geboren`);
      else if (age < 10)  notes.push(`⚠ Zu jung bei Veranstaltung (${age} Jahre)`);
      else if (age < 100) notes.push(`✓ Lebensalter plausibel bei Veranstaltung (${age} J.)`);
      else                notes.push(`⚠ Sehr früh geboren für ${eventYear}`);
      if (deathYear) {
        if (deathYear < eventYear)
          notes.push(`✕ Vor Veranstaltung gestorben (${deathYear})`);
        else if (deathYear === eventYear)
          notes.push(`✓ Im Veranstaltungsjahr ${eventYear} verstorben — möglich`);
      }
    }
  } else if (eventYear && !birthYear && !isComposer) {
    notes.push('? Kein Geburtsjahr verfügbar');
  }

  if (!isComposer && placeHints.length && (result.birthPlace || result.citizenship)) {
    const place = result.birthPlace || result.citizenship;
    notes.push(`Ortshinweis: ${placeHints[0]} ↔ ${place}`);
  }

  if (!notes.length) return null;
  return (
    <div style={{ marginTop: 5, fontSize: 11, color: 'var(--fg-muted)', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {notes.map((n, i) => (
        <span key={i} style={{
          padding: '1px 7px', borderRadius: 9,
          background: n.startsWith('✓') ? '#E1F5EE' : n.startsWith('✕') ? '#FCEBEB' : '#FAEEDA',
          color: n.startsWith('✓') ? '#085041' : n.startsWith('✕') ? '#A32D2D' : '#633806',
        }}>{n}</span>
      ))}
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

export function ResultCard({ result, selected, context, onSelect, isComposer, preferredJobs }) {
  const [expanded, setExpanded] = useState(false);
  const links = buildLinks(result);

  const jobMatch = preferredJobs?.length > 0 && result.occupations?.length
    ? result.occupations.some(o => preferredJobs.some(pj => o.toLowerCase() === pj.toLowerCase()))
    : false;

  return (
    <div style={{
      border: `0.5px solid ${selected ? '#1D9E75' : 'var(--border-faint)'}`,
      borderRadius: 10, marginBottom: 8, overflow: 'hidden',
      background: selected ? '#E1F5EE' : 'var(--bg)',
      transition: 'all .15s',
    }}>
      {/* Main row */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: selected ? '#085041' : 'var(--fg)' }}>
              {result.name}
            </span>
            <SourceBadge source={result.source} />
            <ScorePill score={result.score ?? 50} breakdown={result.scoreBreakdown} />
            {isComposer && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 6,
                background: '#1D9E7522', color: '#1D9E75',
                border: '0.5px solid #1D9E7544',
              }} title="Komponist">♪ Komponist</span>
            )}
            {jobMatch && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 6,
                background: '#FAEEDA', color: '#633806',
                border: '0.5px solid #E0C48A',
              }} title="Berufsbonus +10">💼 Bonus</span>
            )}
            {selected && <span style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600, marginLeft: 2 }}>✓ ausgewählt</span>}
          </div>

          {/* Vitals */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--fg-muted)', marginBottom: 3 }}>
            {(result.birth || result.death) && (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {result.birth ? `* ${result.birth}` : ''}
                {result.birth && result.death ? ' — ' : ''}
                {result.death ? `† ${result.death}` : ''}
              </span>
            )}
            {result.birthPlace && <span>📍 {result.birthPlace}</span>}
            {result.gender && <span style={{ fontStyle: 'italic', opacity: .8 }}>{result.gender}</span>}
            {result.occupations?.length > 0 && (
              <span>{result.occupations.slice(0, 2).join(' · ')}</span>
            )}
          </div>

          {/* Data density — subtle dots */}
          {(() => {
            const fields = [result.birth, result.death, result.birthPlace, result.occupations?.length > 0, result.description];
            const count = fields.filter(Boolean).length;
            if (count === 0) return null;
            return (
              <div style={{ display: 'flex', gap: 3, marginTop: 3 }} title={`${count}/${fields.length} Datenfelder vorhanden`}>
                {fields.map((f, i) => (
                  <span key={i} style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: f ? 'var(--fg-faint)' : 'var(--border-faint)',
                    opacity: f ? .6 : .35,
                  }} />
                ))}
              </div>
            );
          })()}

          {/* Description */}
          {result.description && (
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2, marginBottom: 0, lineHeight: 1.5 }}>
              {result.description.length > 180 ? result.description.slice(0, 180) + '…' : result.description}
            </p>
          )}

          {/* Score explanation */}
          <ScoreExplanation result={result} context={context} isComposer={isComposer} />

          {/* IDs row */}
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            {links.map(l => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  fontSize: 11, padding: '1px 7px', borderRadius: 6,
                  border: `0.5px solid ${l.color}44`,
                  background: `${l.color}11`,
                  color: l.color, textDecoration: 'none', fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}
              >
                {l.label} ↗
              </a>
            ))}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-faint)', marginLeft: 2 }}>
              {result.source === 'GND' ? `GND ${result.id}` : result.id}
            </span>
          </div>
        </div>

        {/* Actions column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0, alignItems: 'flex-end' }}>
          <button onClick={() => onSelect(result)} style={{
            padding: '5px 13px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            background: selected ? '#1D9E75' : 'var(--fg)', color: selected ? '#fff' : 'var(--bg)',
            transition: 'all .15s',
          }}>
            {selected ? '✓ Ausgewählt' : 'Auswählen'}
          </button>
          {(result.variantNames?.length > 0 || result.deathPlace || result.citizenship) && (
            <button onClick={() => setExpanded(e => !e)} style={{
              fontSize: 10, color: 'var(--fg-faint)', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', padding: '2px 4px',
            }}>
              {expanded ? 'weniger ▴' : 'mehr ▾'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{
          padding: '9px 12px 12px', borderTop: '0.5px solid var(--border-faint)',
          background: selected ? 'rgba(29,158,117,.06)' : 'var(--bg-secondary)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px',
          fontSize: 12,
        }}>
          {result.deathPlace   && <D label="Sterbeort"          value={result.deathPlace} />}
          {result.citizenship  && <D label="Staatsbürgerschaft" value={result.citizenship} />}
          {result.occupations?.length > 2 && <D label="Weitere Berufe" value={result.occupations.slice(2).join(', ')} span />}
          {result.variantNames?.length > 0 && <D label="Namensvarianten" value={result.variantNames.join(' · ')} span />}
          {result.gndLink && result.source !== 'GND' && <D label="GND-ID" value={result.gndLink} mono />}
          {result.viafId  && result.source !== 'VIAF' && <D label="VIAF-ID" value={result.viafId} mono />}
          {result.wikidataLink && result.source !== 'Wikidata' && <D label="Wikidata-ID" value={result.wikidataLink} mono />}
          {result.lcLink  && <D label="LC-ID" value={result.lcLink} mono />}
          {result.bnfLink && <D label="BnF-ID" value={result.bnfLink} mono />}
        </div>
      )}
    </div>
  );
}

function D({ label, value, mono, span }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>{label}</div>
      <div style={{ color: 'var(--fg-muted)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', fontSize: mono ? 11 : 12 }}>{value}</div>
    </div>
  );
}

// ─── Search popup ─────────────────────────────────────────────────────────────

function SearchPopup({ entity, normData, context, onSearch, onSelect, onClose, isSearching, preferredJobs, ocrText, llmSettings, onAiError }) {
  const popupRef = useRef();
  const results  = normData?.results || [];
  const selected = normData?.selected;
  const [aiMatching, setAiMatching] = useState(false);

  useEffect(() => {
    function onDown(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const gndCount  = results.filter(r => r.source === 'GND').length;
  const viafCount = results.filter(r => r.source === 'VIAF').length;
  const wdCount   = results.filter(r => r.source === 'Wikidata').length;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.38)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div ref={popupRef} style={{
        background: 'var(--bg)', borderRadius: 14, width: '100%', maxWidth: 700,
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        border: '0.5px solid var(--border-md)',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
      }}>
        {/* Header */}
        <div style={{ padding: '13px 18px', borderBottom: '0.5px solid var(--border-faint)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Normdaten-Suche</div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <EntityTag type={entity.type} label={entity.alias || entity.text} />
              {normData?.status === 'done' && results.length > 0 && (
                <div style={{ display: 'flex', gap: 5 }}>
                  {gndCount  > 0 && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 9, background: SOURCE_CFG.GND.bg,      color: SOURCE_CFG.GND.color      }}>{gndCount} GND</span>}
                  {viafCount > 0 && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 9, background: SOURCE_CFG.VIAF.bg,     color: SOURCE_CFG.VIAF.color     }}>{viafCount} VIAF</span>}
                  {wdCount   > 0 && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 9, background: SOURCE_CFG.Wikidata.bg, color: SOURCE_CFG.Wikidata.color }}>{wdCount} Wikidata</span>}
                </div>
              )}
            </div>
            {/* Context info */}
            {(context.eventYear || context.placeHints?.length > 0) && (
              <div style={{ marginTop: 5, fontSize: 11, color: 'var(--fg-faint)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {context.eventYear && <span>📅 Veranstaltung: {context.eventYear}</span>}
                {context.placeHints?.length > 0 && <span>📍 Ortskontext: {context.placeHints.join(', ')}</span>}
                <span style={{ fontStyle: 'italic' }}>→ fließt in Score ein</span>
              </div>
            )}
            {/* API errors */}
            {normData?.gndError && <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 3 }}>⚠ GND: {normData.gndError}</div>}
            {normData?.viafError && <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 3 }}>⚠ VIAF: {normData.viafError}</div>}
            {normData?.wikidataError && <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 3 }}>⚠ Wikidata: {normData.wikidataError}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
            <button onClick={onSearch} disabled={isSearching} style={{
              padding: '6px 13px', borderRadius: 7, fontSize: 12, fontWeight: 500,
              border: '0.5px solid var(--border-md)',
              background: isSearching ? 'var(--bg-secondary)' : 'var(--bg)',
              color: 'var(--fg)', cursor: isSearching ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {isSearching
                ? <><span style={{ animation: 'spin .8s linear infinite', display: 'inline-block' }}>⟳</span> Suche …</>
                : results.length > 0 ? '↺ Erneut suchen' : '⌕ Suchen'
              }
            </button>
            {results.length > 0 && !selected && !isSearching && (
              <>
                <button onClick={async () => {
                  if (aiMatching) return;
                  setAiMatching(true);
                  try {
                    const idx = await aiNormdataMatch(entity, ocrText || '', results, llmSettings);
                    if (idx !== null && idx !== undefined && results[idx]) {
                      onSelect(results[idx]);
                      onClose();
                    }
                  } catch (err) {
                    if (onAiError) onAiError({ message: err.message, source: 'KI-Match (Normdaten)' });
                  } finally {
                    setAiMatching(false);
                  }
                }} style={{
                  padding: '6px 13px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                  border: '0.5px solid #185FA5',
                  background: aiMatching ? 'var(--bg-secondary)' : '#185FA511',
                  color: aiMatching ? 'var(--fg-muted)' : '#185FA5',
                  cursor: aiMatching ? 'wait' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {aiMatching ? '⟳ KI sucht …' : '🤖 KI-Match'}
                </button>
                <OptionalBadge />
              </>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--fg-muted)', padding: '2px 4px', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {(!normData || normData.status === 'idle' || normData.status === 'searching') && !results.length ? (
            <div style={{ textAlign: 'center', padding: '44px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 10, opacity: .25 }}>⟳</div>
              Durchsuche GND, VIAF und Wikidata …
            </div>
          ) : isSearching ? (
            <div style={{ textAlign: 'center', padding: '44px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 22, animation: 'spin .8s linear infinite', display: 'inline-block', marginBottom: 12 }}>⟳</div>
              <div style={{ fontWeight: 500 }}>Durchsuche Normdatenbanken …</div>
              <div style={{ fontSize: 11, marginTop: 6, color: 'var(--fg-faint)' }}>GND (lobid.org) · VIAF (viaf.org) · Wikidata</div>
              <div style={{ fontSize: 11, marginTop: 3, color: 'var(--fg-faint)' }}>Varianten werden ebenfalls geprüft</div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '44px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 10, opacity: .2 }}>∅</div>
              Keine Ergebnisse für „{entity.text}".<br />
              <span style={{ fontSize: 12, color: 'var(--fg-faint)' }}>Varianten wurden ebenfalls geprüft.</span>
            </div>
          ) : (
            results.map((r, i) => (
              <ResultCard
                key={`${r.source}:${r.id}:${i}`}
                result={r}
                selected={selected && selected.source === r.source && selected.id === r.id}
                context={context}
                onSelect={onSelect}
                isComposer={entity.isComposer}
                preferredJobs={preferredJobs}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '11px 18px', borderTop: '0.5px solid var(--border-faint)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            {selected
              ? <span style={{ color: '#1D9E75' }}>✓ {selected.name} · <SourceBadge source={selected.source} small /> · {selected.gndLink ? `GND ${selected.gndLink}` : selected.source === 'GND' ? `GND ${selected.id}` : selected.id}{selected.wikidataLink ? ` · ${selected.wikidataLink}` : ''}</span>
              : 'Noch kein Eintrag ausgewählt'
            }
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={() => { onSelect(null); onClose(); }} style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, border: '0.5px solid var(--border-md)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Kein Treffer
            </button>
            <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', background: 'var(--fg)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Fertig
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Entity row ───────────────────────────────────────────────────────────────

function EntityNormRow({ entity, normData, isSearching, onOpenPopup }) {
  const selected = normData?.selected;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      borderRadius: 9, border: '0.5px solid var(--border-faint)',
      background: 'var(--bg)', marginBottom: 7,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <EntityTag type={entity.type} label={entity.alias || entity.text} />
          {entity.isComposer && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 8,
              background: '#1D9E7522', color: '#1D9E75',
              border: '0.5px solid #1D9E7544',
            }} title="Komponist">♪ Komponist</span>
          )}
          {entity.text !== entity.alias && entity.alias && (
            <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>{entity.text}</span>
          )}
        </div>
        {selected && (
          <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#085041', fontWeight: 500 }}>✓ {selected.name}</span>
            <SourceBadge source={selected.source} small />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-faint)', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3 }}>
              {selected.source === 'GND' ? `GND ${selected.id}` : selected.id}
            </span>
            {selected.birth && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>* {selected.birth}</span>}
            {selected.death && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>† {selected.death}</span>}
          </div>
        )}
        {normData?.status === 'done' && !selected && (
          <div style={{ marginTop: 3, fontSize: 11, color: 'var(--fg-faint)' }}>
            {normData.results.length > 0
              ? `${normData.results.length} Kandidaten — bitte auswählen`
              : 'Keine Treffer gefunden'}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {isSearching && <span style={{ fontSize: 11, color: 'var(--fg-muted)', animation: 'pulse 1s infinite' }}>⟳ Suche …</span>}
        {!isSearching && normData?.status === 'done' && !selected && normData.results.length > 0 && <Badge color="amber">{normData.results.length} Kandidaten</Badge>}
        {selected && <Badge color="green">Zugeordnet</Badge>}
        {normData?.status === 'error' && <Badge color="red">API-Fehler</Badge>}
        <button onClick={onOpenPopup} disabled={isSearching} style={{
          padding: '6px 13px', borderRadius: 7, fontSize: 12, fontWeight: 500,
          border: '0.5px solid var(--border-md)',
          background: selected ? '#E1F5EE' : 'var(--bg-secondary)',
          color: selected ? '#085041' : 'var(--fg)',
          cursor: isSearching ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'all .15s',
        }}>
          {selected ? '✎ Ändern' : normData ? '↺ Suche öffnen' : '⌕ Suchen'}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StepNormdata({
  entities, matches, normResults, selectNorm, runNormSearch, normRunning,
  preferredJobs, ocrText, llmSettings, onAiError,
  advance, goBack,
}) {
  const [popupEntityId, setPopupEntityId] = useState(null);

  const context = useMemo(() => extractContext(entities), [entities]);

  const unmatched = entities.filter(e => {
    const m = matches[e.id];
    return m && (m.status === 'no_match' || m.selected === null);
  });

  const popupEntity = unmatched.find(e => e.id === popupEntityId);

  useEffect(() => {
    if (!popupEntityId || !popupEntity) return;
    const existing = normResults[popupEntityId];
    if (existing && (existing.results?.length > 0 || existing.status === 'done')) return;
    runNormSearch(popupEntity.id, popupEntity.alias || popupEntity.text, context);
  }, [popupEntityId]);

  function handleSearch() {
    if (!popupEntity) return;
    runNormSearch(popupEntity.id, popupEntity.alias || popupEntity.text, context);
  }

  function handleSelect(result) {
    if (!popupEntityId) return;
    selectNorm(popupEntityId, result);
  }

  const hasNormData = entities.some(e => normResults[e.id]?.selected);

  return (
    <>
      {popupEntityId && popupEntity && (
        <SearchPopup
          entity={popupEntity}
          normData={normResults[popupEntityId]}
          context={context}
          isSearching={!!normRunning[popupEntityId]}
          onSearch={handleSearch}
          onSelect={handleSelect}
          onClose={() => setPopupEntityId(null)}
          preferredJobs={preferredJobs}
          ocrText={ocrText}
          llmSettings={llmSettings}
          onAiError={onAiError}
        />
      )}

      <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border-faint)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 620 }}>
        <div style={{ padding: '11px 16px', borderBottom: '0.5px solid var(--border-faint)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Schritt 4 — Normdaten</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Badge color="amber">{unmatched.length} ohne Musixplora-Treffer</Badge>
            {hasNormData && <Badge color="green">Normdaten zugeordnet</Badge>}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* Context info banner */}
          {(context.eventYear || context.placeHints.length > 0) && (
            <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '0.5px solid var(--border-faint)', fontSize: 12, color: 'var(--fg-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 500, color: 'var(--fg)' }}>Suchkontext aus Entitäten:</span>
              {context.eventYear && <span>📅 Veranstaltungsjahr: <strong>{context.eventYear}</strong></span>}
              {context.placeHints.length > 0 && <span>📍 Orte: <strong>{context.placeHints.join(', ')}</strong></span>}
              <span style={{ fontStyle: 'italic', color: 'var(--fg-faint)' }}>→ beeinflusst Score-Sortierung</span>
            </div>
          )}

          <SectionLabel>Suche in Normdatenbanken (GND · VIAF · Wikidata)</SectionLabel>

          {unmatched.length === 0 ? (
            <div style={{ padding: '18px 14px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 9, marginBottom: 20 }}>
              ✓ Alle Entitäten haben Musixplora-Einträge.
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
                {unmatched.length} {unmatched.length === 1 ? 'Entität' : 'Entitäten'} ohne Musixplora-Treffer.
                Suche durchläuft GND, VIAF und Wikidata — inkl. Namensvarianten. Ergebnisse werden nach Kontext-Score sortiert.
              </p>
              {unmatched.map(ent => (
                <EntityNormRow
                  key={ent.id}
                  entity={ent}
                  normData={normResults[ent.id]}
                  isSearching={!!normRunning[ent.id]}
                  onOpenPopup={() => setPopupEntityId(ent.id)}
                />
              ))}
            </div>
          )}
        </div>

        <StepFooter
          left={<Btn onClick={goBack}>← Musixplora</Btn>}
          right={<Btn variant="primary" onClick={() => advance(3)}>Weiter zu Export →</Btn>}
        />
      </div>
    </>
  );
}
