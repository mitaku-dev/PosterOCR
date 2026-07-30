import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardHeader, Btn, Badge, ScoreBadge, Divider, SectionLabel, EntityTag, StepFooter, OptionalBadge } from './ui';
import { TYPE_COLORS } from '../data/initialState';
import { aiMusixploraMatch } from '../services/aiMatchingService';

function extractContext(entities) {
  let eventYear = null;
  const placeHints = [];
  for (const ent of entities) {
    if (ent.type === 'time') {
      const m = (ent.text + ' ' + (ent.alias || '')).match(/\b(1[89]\d{2}|20[012]\d)\b/);
      if (m) { const y = parseInt(m[1], 10); if (!eventYear || y < eventYear) eventYear = y; }
    }
    if (ent.type === 'place') {
      const p = (ent.alias || ent.text).trim();
      if (p) placeHints.push(p);
    }
  }
  return { eventYear, placeHints };
}

const SCORE_WEIGHTS = [
  { label: 'Namensähnlichkeit', pct: 80, color: '#185FA5' },
  { label: 'Datumsnähe',       pct: 20, color: '#BA7517' },
];

export function DetailPreview({ detail }) {
  if (!detail) return null;
  const fields = Object.entries(detail).filter(([k, v]) => k !== 'name' && v != null && v !== '' && !(Array.isArray(v) && v.length === 0) && !(typeof v === 'object' && v !== null && Object.keys(v).length === 0));
  if (fields.length === 0) return <div style={{ fontSize: 11, color: 'var(--fg-faint)', fontStyle: 'italic' }}>Keine Detaildaten verfügbar</div>;

  const labels = {
    birth: 'Geburt', death: 'Tod', gender: 'Geschlecht',
    occupations: 'Tätigkeiten', nationality: 'Nationalität', places: 'Orte',
    externalIds: 'Externe IDs', alternatives: 'Alternativnamen',
    branches: 'Bereiche', dates: 'Zeitraum', topology: 'Topologie',
    date: 'Datum', art: 'Typ', nameVariants: 'Namensvarianten',
    aliasNames: 'Aliasnamen', mainJobs: 'Hauptberufe',
    otherJobs: 'Weitere Berufe', mainPlace: 'Hauptort',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--fg-muted)' }}>
      {fields.map(([key, val]) => {
        const label = labels[key] || key;
        let display = val;
        if (Array.isArray(val)) display = val.join(' · ');
        if (typeof val === 'object' && val !== null) display = Object.keys(val).map(k => `${k}: ${val[k]}`).join(' · ');
        return (
          <div key={key} style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontWeight: 500, color: 'var(--fg-faint)', textTransform: 'capitalize', flexShrink: 0, minWidth: 60 }}>{label}</span>
            <span style={{ lineHeight: 1.5 }}>{String(display)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreDetails({ breakdown, isComposer }) {
  if (!breakdown) return null;
  const items = isComposer
    ? [{ label: 'Name', value: breakdown.nameScore, max: 100 }]
    : [
        { label: 'Name', value: breakdown.nameScore, max: 100 },
        { label: 'Datums', value: breakdown.dateScore, max: 100 },
      ];
  return (
    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {items.map(item => (
        <span key={item.label} style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 6,
          background: item.value >= 70 ? '#E1F5EE' : item.value >= 40 ? '#FAEEDA' : '#FCEBEB',
          color: item.value >= 70 ? '#085041' : item.value >= 40 ? '#633806' : '#A32D2D',
        }}>
          {item.label}: {item.value}
        </span>
      ))}
      {isComposer && (
        <span style={{ fontSize: 10, color: '#1D9E75', fontStyle: 'italic', fontWeight: 500 }}>
          Komponist · 100% Name
        </span>
      )}
      {!isComposer && (
        <span style={{ fontSize: 10, color: 'var(--fg-faint)', fontStyle: 'italic' }}>
          {SCORE_WEIGHTS.map(w => `${w.label} ${w.pct}%`).join(' · ')}
        </span>
      )}
    </div>
  );
}

function SearchInfoBadge({ searchInfo }) {
  if (!searchInfo || searchInfo.length === 0) return null;
  const fullTerm = searchInfo.find(s => s.type === 'full');
  const fallbacks = searchInfo.filter(s => s.type === 'fallback');
  if (fallbacks.length === 0) return null;

  return (
    <div style={{
      margin: '6px 0', padding: '6px 10px', borderRadius: 8,
      background: '#FAEEDA', border: '0.5px solid #E0C48A',
      fontSize: 11, color: '#633806',
    }}>
      <div style={{ fontWeight: 500, marginBottom: 2 }}>🔍 Erweiterte Suche aktiv</div>
      <div>Volle Anfrage „{fullTerm?.term || '?'}" ergab keine Treffer.</div>
      <div style={{ marginTop: 2 }}>
        {fallbacks.map((f, i) => (
          <span key={i}>
            {i > 0 && ' · '}
            <strong>„{f.term}"</strong>{f.count > 0 && ` → ${f.count} Treffer`}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MatchCard({ result, selected, onClick, isComposer, context, preferredJobs }) {
  const [showHover, setShowHover] = useState(false);
  const cardRef = useRef(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const detail = result.detail;
  const breakdown = result.scoreBreakdown;

  const handleMouseEnter = useCallback(() => {
    if (!detail) return;
    const rect = cardRef.current.getBoundingClientRect();
    let left = rect.right + 8;
    const pw = 320;
    if (left + pw > window.innerWidth) left = rect.left - pw - 8;
    setPopupPos({ top: Math.max(4, rect.top), left: Math.max(4, left) });
    setShowHover(true);
  }, [detail]);

  const handleMouseLeave = useCallback(() => {
    setShowHover(false);
  }, []);

  const { eventYear, placeHints } = context || {};
  const birth = detail?.birth;
  const death = detail?.death;
  const lifespan = birth || death ? `${birth || '?'}–${death || '?'}` : null;

  const dateMatch = eventYear && birth
    ? (() => {
        const by = parseInt(birth, 10);
        if (isNaN(by)) return null;
        const age = eventYear - by;
        if (age >= 10 && age <= 99) return { label: `${age} J.`, ok: true };
        if (age < 0) return { label: 'ungeboren', ok: false };
        return { label: `${age} J.`, ok: false };
      })()
    : null;

  const matchedJobs = detail?.occupations?.length && preferredJobs?.length
    ? detail.occupations.filter(o => preferredJobs.some(pj => o.toLowerCase() === pj.toLowerCase()))
    : [];
  const hasPreferredJob = matchedJobs.length > 0;

  const matchedPlaces = detail?.places?.length && placeHints?.length
    ? detail.places.filter(p => placeHints.some(h => p.toLowerCase().includes(h.toLowerCase()) || h.toLowerCase().includes(p.toLowerCase())))
    : [];
  const hasPlaceMatch = matchedPlaces.length > 0;

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px',
        borderRadius: 8, cursor: 'pointer', transition: 'all .15s', marginBottom: 5,
        border: `0.5px solid ${selected ? '#378ADD' : 'var(--border-faint)'}`,
        background: selected ? '#E6F1FB' : 'var(--bg)',
      }}
      onMouseEnter={e => {
        if (!selected) e.currentTarget.style.borderColor = 'var(--border-md)';
        handleMouseEnter();
      }}
      onMouseLeave={e => {
        if (!selected) e.currentTarget.style.borderColor = 'var(--border-faint)';
        handleMouseLeave();
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{result.name}</span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 8,
            border: '0.5px solid var(--border-faint)',
            color: 'var(--fg-muted)', background: 'var(--bg-secondary)',
          }}>{result.type}</span>
          {isComposer && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 8,
              background: '#1D9E7522', color: '#1D9E75',
              border: '0.5px solid #1D9E7544',
            }} title="Komponist">♪ Komponist</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', flexWrap: 'wrap', gap: 4, rowGap: 2 }}>
          {result.meta && <span>{result.meta}</span>}
          {lifespan && (
            <span style={{
              fontVariantNumeric: 'tabular-nums', padding: '0 4px', borderRadius: 4,
              background: dateMatch?.ok ? '#1D9E7522' : dateMatch && !dateMatch.ok ? '#FCEBEB' : 'transparent',
              color: dateMatch?.ok ? '#085041' : dateMatch && !dateMatch.ok ? '#A32D2D' : 'inherit',
            }}>
              {lifespan}
            </span>
          )}
          {dateMatch && (
            <span style={{
              fontSize: 10, padding: '0 5px', borderRadius: 4,
              background: dateMatch.ok ? '#1D9E7522' : '#FCEBEB',
              color: dateMatch.ok ? '#085041' : '#A32D2D',
            }}>
              {dateMatch.ok ? '✓' : '✕'} {dateMatch.label}
            </span>
          )}
        </div>

        {/* Main jobs */}
        {detail?.mainJobs?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {detail.mainJobs.map((occ, i) => {
              const isMatch = preferredJobs?.some(pj => occ.toLowerCase() === pj.toLowerCase());
              return (
                <span key={`mj-${i}`} style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 6,
                  background: isMatch ? '#1D9E7522' : 'var(--bg-secondary)',
                  color: isMatch ? '#1D9E75' : 'var(--fg)',
                  border: `0.5px solid ${isMatch ? '#1D9E7544' : 'var(--border-faint)'}`,
                  fontWeight: isMatch ? 600 : 500,
                }}>
                  {occ}
                  {isMatch && ' ✓'}
                </span>
              );
            })}
          </div>
        )}

        {/* Other jobs (oj) - smaller */}
        {detail?.otherJobs?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
            {detail.otherJobs.map((occ, i) => (
              <span key={`oj-${i}`} style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 6,
                background: 'transparent', color: 'var(--fg-faint)',
                border: '0.5px solid var(--border-faint)',
              }}>
                {occ}
              </span>
            ))}
          </div>
        )}

        {/* Main place + matching places */}
        {((detail?.mainPlace?.length ?? 0) > 0 || hasPlaceMatch) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {(detail?.mainPlace ?? []).map((mp, i) => {
              const matchesHint = placeHints?.some(
                h => mp.toLowerCase().includes(h.toLowerCase()) || h.toLowerCase().includes(mp.toLowerCase())
              );
              return (
                <span key={`mp-${i}`} style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 6,
                  background: matchesHint ? '#185FA522' : 'var(--bg-secondary)',
                  color: matchesHint ? '#185FA5' : 'var(--fg-muted)',
                  border: '0.5px solid var(--border-faint)',
                  fontWeight: 500,
                }}>
                  📍 {mp}
                </span>
              );
            })}
            {matchedPlaces.filter(p => !(detail?.mainPlace ?? []).includes(p)).map((p, i) => (
              <span key={`cmp-${i}`} style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 6,
                background: '#185FA522', color: '#185FA5',
                border: '0.5px solid #185FA544', fontWeight: 500,
              }}>
                📍 {p}
              </span>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          {result.id}
          <a
            href={`https://musixplora.de/${result.urlType || 'musici'}/search/?mxp=${result.id}&selected=${result.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              marginLeft: 8, fontSize: 10, color: '#185FA5', textDecoration: 'none',
              fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            ↗ Musixplora
          </a>
        </div>
        {detail && <ScoreDetails breakdown={breakdown} isComposer={isComposer} />}
      </div>
      {result.score > 0 && <ScoreBadge score={result.score} />}
      {selected && (
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#378ADD',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 11, color: '#fff',
        }}>✓</div>
      )}

      {showHover && detail && (
        <div style={{
          position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 1000,
          background: 'var(--bg)', border: '0.5px solid var(--border-md)',
          borderRadius: 10, padding: 12, width: 300, maxWidth: 340,
          boxShadow: '0 8px 30px rgba(0,0,0,.18)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{result.name}</div>
          <DetailPreview detail={detail} />
        </div>
      )}
    </div>
  );
}

const SORT_OPTIONS = [
  { key: 'score', label: 'Score' },
  { key: 'name', label: 'Name' },
];

function EntitySection({ entity, matchData, onSelect, onSetStatus, onFallbackSearch, context, preferredJobs, ocrText, llmSettings, onAiError }) {
  const [expanded, setExpanded] = useState(true);
  const [sortBy, setSortBy] = useState('score');
  const [showAll, setShowAll] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const [aiMatching, setAiMatching] = useState(false);
  const sortedResults = useMemo(() => {
    const r = [...matchData.results];
    if (sortBy === 'name') r.sort((a, b) => a.name.localeCompare(b.name));
    else r.sort((a, b) => (b.score || 0) - (a.score || 0));
    return r;
  }, [matchData.results, sortBy]);

  const hasMore = sortedResults.length > 10;
  const visibleResults = hasMore && !showAll ? sortedResults.slice(0, 10) : sortedResults;

  const searchInfo = matchData.searchInfo;
  const hasFallback = searchInfo && searchInfo.some(s => s.type === 'fallback');
  const isPerson = entity.type === 'person';

  const hasSelection = matchData.selected !== null;
  const selectedIdx = matchData.selected;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}
      >
        <EntityTag type={entity.type} label={entity.alias || entity.text} />
        {matchData.status === 'matched' && <Badge color="green">{matchData.results.length} Kandidaten</Badge>}
        {matchData.status === 'no_match' && <Badge color="red">kein Treffer</Badge>}
        {matchData.status === 'skip' && <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>— übersprungen</span>}
        {hasSelection && matchData.results[selectedIdx] && (
          <span style={{ fontSize: 11, color: '#085041', marginLeft: 'auto' }}>
            ✓ {matchData.results[selectedIdx].id}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--fg-faint)', marginLeft: matchData.status === 'skip' ? 'auto' : 0 }}>
          {expanded ? '▴' : '▾'}
        </span>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 4 }}>
          {hasFallback && <SearchInfoBadge searchInfo={searchInfo} />}

          {matchData.status === 'matched' && (
            <>
              {hasSelection && (
                <>
                  <MatchCard
                    key={sortedResults[selectedIdx].id}
                    result={sortedResults[selectedIdx]}
                    selected={true}
                    onClick={() => {}}
                    isComposer={entity.isComposer}
                    context={context}
                    preferredJobs={preferredJobs}
                  />
                  {!showOthers && (
                    <div
                      onClick={e => { e.stopPropagation(); setShowOthers(true); }}
                      style={{
                        padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                        border: '0.5px dashed var(--border-md)', fontSize: 11,
                        color: 'var(--fg-muted)', marginBottom: 5, textAlign: 'center',
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      ▾ Alle {sortedResults.length} Ergebnisse anzeigen
                    </div>
                  )}
                  {showOthers && sortedResults.map((r, ri) =>
                    ri === selectedIdx ? null : (
                      <MatchCard
                        key={r.id}
                        result={r}
                        selected={false}
                        onClick={() => { setShowOthers(false); onSelect(ri); }}
                        isComposer={entity.isComposer}
                        context={context}
                        preferredJobs={preferredJobs}
                      />
                    )
                  )}
                  {showOthers && (
                    <>
                      <div
                        onClick={() => { setShowOthers(false); }}
                        style={{
                          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                          border: '0.5px dashed var(--border-md)', fontSize: 11,
                          color: 'var(--fg-muted)', marginBottom: 5, textAlign: 'center',
                          transition: 'all .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        ✕ Nur Auswahl anzeigen
                      </div>
                      <div
                        onClick={() => onSetStatus('no_match')}
                        style={{
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                          border: '0.5px dashed var(--border-md)', fontSize: 12,
                          color: 'var(--fg-muted)', marginBottom: 5, transition: 'all .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        Kein passender Eintrag — weiter zu Normdaten
                      </div>
                      {isPerson && (
                        <div
                          onClick={onFallbackSearch}
                          style={{
                            padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                            border: '0.5px dashed var(--border-md)', fontSize: 12,
                            color: '#633806', marginBottom: 5, transition: 'all .15s',
                            background: '#FAEEDA',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F5E6C8'}
                          onMouseLeave={e => e.currentTarget.style.background = '#FAEEDA'}
                        >
                          🔍 Nur nach Nachnamen suchen
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              {!hasSelection && (
                <>
                  {sortedResults.length > 1 && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6, fontSize: 11 }}>
                      <span style={{ color: 'var(--fg-faint)', marginRight: 4 }}>Sortieren:</span>
                      {SORT_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          onClick={e => { e.stopPropagation(); setSortBy(opt.key); }}
                          style={{
                            padding: '2px 8px', borderRadius: 6,
                            border: sortBy === opt.key ? '0.5px solid var(--border-md)' : 'none',
                            background: sortBy === opt.key ? 'var(--bg-secondary)' : 'transparent',
                            color: sortBy === opt.key ? 'var(--fg)' : 'var(--fg-faint)',
                            cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                          }}
                        >
                          {opt.label} {sortBy === opt.key && (opt.key === 'name' ? 'A-Z' : '↓')}
                        </button>
                      ))}
                    </div>
                  )}
                  {sortedResults.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <div
                        onClick={async () => {
                          if (aiMatching) return;
                          setAiMatching(true);
                          try {
                            const idx = await aiMusixploraMatch(entity, ocrText || '', sortedResults, llmSettings);
                            if (idx !== null && idx !== undefined && sortedResults[idx]) {
                              onSelect(idx);
                            }
                          } catch (err) {
                            if (onAiError) onAiError({ message: err.message, source: 'KI-Match (Musixplora)' });
                          } finally {
                            setAiMatching(false);
                          }
                        }}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8, cursor: aiMatching ? 'wait' : 'pointer',
                          border: '0.5px dashed #185FA5', fontSize: 12,
                          color: aiMatching ? 'var(--fg-muted)' : '#185FA5',
                          transition: 'all .15s',
                          background: aiMatching ? 'var(--bg-secondary)' : '#185FA511',
                        }}
                      >
                        {aiMatching ? '⟳ KI sucht besten Treffer …' : '🤖 KI-Match — besten Treffer automatisch wählen'}
                      </div>
                      <OptionalBadge />
                    </div>
                  )}
                  {visibleResults.map((r, ri) => (
                    <MatchCard
                      key={r.id}
                      result={r}
                      selected={false}
                      onClick={() => onSelect(ri)}
                      isComposer={entity.isComposer}
                      context={context}
                      preferredJobs={preferredJobs}
                    />
                  ))}
                  {hasMore && (
                    <div
                      onClick={e => { e.stopPropagation(); setShowAll(s => !s); }}
                      style={{
                        padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                        border: '0.5px dashed var(--border-md)', fontSize: 11,
                        color: 'var(--fg-muted)', marginBottom: 5, textAlign: 'center',
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {showAll
                        ? `✕ Nur Top-10 von ${sortedResults.length} anzeigen`
                        : `▾ Alle ${sortedResults.length} Ergebnisse anzeigen`}
                    </div>
                  )}
                  <div
                    onClick={() => onSetStatus('no_match')}
                    style={{
                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      border: '0.5px dashed var(--border-md)', fontSize: 12,
                      color: 'var(--fg-muted)', marginBottom: 5, transition: 'all .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Kein passender Eintrag — weiter zu Normdaten
                  </div>
                  {isPerson && (
                    <div
                      onClick={onFallbackSearch}
                      style={{
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                        border: '0.5px dashed var(--border-md)', fontSize: 12,
                        color: '#633806', marginBottom: 5, transition: 'all .15s',
                        background: '#FAEEDA',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F5E6C8'}
                      onMouseLeave={e => e.currentTarget.style.background = '#FAEEDA'}
                    >
                      🔍 Nur nach Nachnamen suchen
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {matchData.status === 'no_match' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Kein Musixplora-Treffer gefunden.</span>
              <Btn size="sm" onClick={() => onSetStatus('matched')}>Erneut suchen</Btn>
            </div>
          )}

          {matchData.status === 'skip' && (
            <Btn size="sm" onClick={() => onSetStatus('matched')}>Doch suchen</Btn>
          )}
        </div>
      )}
    </div>
  );
}

export default function StepMusixplora({
  entities, matches, selectMatch, setMatchStatus,
  aliases, setAliases, searchRunning, searchProgress, runMusixploraSearch, runFallbackSearch,
  stepDone, advance, goBack,
  preferredJobs, ocrText, llmSettings, onAiError,
}) {
  const matchedCount = Object.values(matches).filter(m => m.status === 'matched' && m.selected !== null).length;
  const noMatchCount = Object.values(matches).filter(m => m.status === 'no_match').length;
  const context = useMemo(() => extractContext(entities), [entities]);

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 620 }}>
      <CardHeader
        left="Schritt 3 — Musixplora-Suche"
        right={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Badge color="green">{matchedCount} Treffer</Badge>
            <Badge color="red">{noMatchCount} kein Treffer</Badge>
            <Btn size="sm" onClick={() => runMusixploraSearch()} disabled={searchRunning}>
              {searchRunning ? '⟳ Suche …' : 'Alles suchen'}
            </Btn>
          </div>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

        {/* Search progress bar */}
        {searchRunning && searchProgress.total > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              height: 6, borderRadius: 4, background: 'var(--bg-secondary)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 4, background: '#378ADD',
                width: `${Math.round((searchProgress.done / searchProgress.total) * 100)}%`,
                transition: 'width .3s ease',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, textAlign: 'center' }}>
              Suche … {searchProgress.done} / {searchProgress.total} Entitäten
            </div>
          </div>
        )}

        {/* Scoring explanation */}
        <div style={{
          marginBottom: 14, padding: '8px 12px', borderRadius: 8,
          background: 'var(--bg-secondary)', border: '0.5px solid var(--border-faint)',
          fontSize: 11, color: 'var(--fg-muted)',
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 500, color: 'var(--fg)' }}>Score-Gewichtung:</span>
          {SCORE_WEIGHTS.map(w => (
            <span key={w.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: w.color, display: 'inline-block' }} />
              {w.label} <strong>{w.pct}%</strong>
            </span>
          ))}
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: '#1D9E7522', color: '#1D9E75' }}>
            ♪ Komponist: 100% Name
          </span>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: '#FAEEDA', color: '#633806' }}>
            Berufsbonus: +10 bei Treffer
          </span>
          <span style={{ fontStyle: 'italic', color: 'var(--fg-faint)' }}>
            Konfiguration in ⚙ Einstellungen
          </span>
        </div>

        <Divider />

        {/* Per-entity results */}
        <SectionLabel>Suchergebnisse pro Entität</SectionLabel>
        <div style={{ overflow: 'auto', paddingRight: 2 }}>
          {entities.map((ent, i) => {
            const md = matches[ent.id];
            if (!md) return null;
            return (
              <React.Fragment key={ent.id}>
                <EntitySection
                  entity={ent}
                  matchData={md}
                  onSelect={ri => selectMatch(ent.id, ri)}
                  onSetStatus={s => setMatchStatus(ent.id, s)}
                  onFallbackSearch={() => runFallbackSearch(ent.id)}
                  context={context}
                  preferredJobs={preferredJobs}
                  ocrText={ocrText}
                  llmSettings={llmSettings}
                  onAiError={onAiError}
                />
                {i < entities.length - 1 && <Divider margin="8px 0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <StepFooter
        left={<Btn onClick={goBack}>← Entitäten</Btn>}
        right={<Btn variant="primary" onClick={() => advance(2)}>Weiter zu Normdaten →</Btn>}
      />
    </Card>
  );
}

