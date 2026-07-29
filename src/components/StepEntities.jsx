import React, { useState, useRef, useEffect } from 'react';
import { Btn, Badge, Collapsible } from './ui';
import { ENTITY_TYPES, TYPE_LABELS, TYPE_COLORS } from '../data/initialState';

// ─── Segment builder ───────────────────────────────────────────────────────────
function buildSegments(text, entities) {
  if (!text) return [{ text: '', entity: null }];
  const sorted = [...entities].sort((a, b) => b.text.length - a.text.length);
  const tagged = new Array(text.length).fill(null);
  for (const ent of sorted) {
    if (!ent.text) continue;
    let pos = 0;
    while (pos < text.length) {
      const idx = text.indexOf(ent.text, pos);
      if (idx === -1) break;
      let conflict = false;
      for (let i = idx; i < idx + ent.text.length; i++) if (tagged[i] !== null) { conflict = true; break; }
      if (!conflict) for (let i = idx; i < idx + ent.text.length; i++) tagged[i] = ent.id;
      pos = idx + ent.text.length;
    }
  }
  const segs = [];
  let i = 0;
  while (i < text.length) {
    const eid = tagged[i];
    if (eid === null) {
      let j = i + 1;
      while (j < text.length && tagged[j] === null) j++;
      segs.push({ text: text.slice(i, j), entity: null }); i = j;
    } else {
      let j = i + 1;
      while (j < text.length && tagged[j] === eid) j++;
      segs.push({ text: text.slice(i, j), entity: entities.find(e => e.id === eid) }); i = j;
    }
  }
  return segs.length ? segs : [{ text, entity: null }];
}

// ─── Highlighted text panel ───────────────────────────────────────────────────
function HighlightedText({ text, setText, entities, addEntity, activeEntityId, setActiveEntityId }) {
  const [selection, setSelection] = useState(null);
  const [addType, setAddType]     = useState('person');
  const [editMode, setEditMode]   = useState(false);
  const containerRef = useRef();
  const segments = buildSegments(text, entities);

  function handleMouseUp() {
    if (editMode) return;
    const sel = window.getSelection();
    const selected = sel?.toString().trim();
    if (!selected || selected.length < 2) { setSelection(null); return; }
    const range = sel.getRangeAt(0);
    const rect  = range.getBoundingClientRect();
    const cRect = containerRef.current.getBoundingClientRect();
    setSelection({ text: selected, x: rect.left - cRect.left + rect.width / 2, y: rect.top - cRect.top - 6 });
  }

  function handleAdd() {
    if (!selection) return;
    addEntity(selection.text, addType);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  useEffect(() => {
    function onDown(e) {
      if (selection && !e.target.closest('.sel-popup')) { setSelection(null); window.getSelection()?.removeAllRanges(); }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [selection]);

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '0.5px solid var(--border-faint)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>OCR-Text</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {!editMode && <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>Markieren → Entität hinzufügen</span>}
          <button onClick={() => { setEditMode(e => !e); setSelection(null); }}
            style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: '0.5px solid var(--border-md)', background: editMode ? 'var(--fg)' : 'transparent', color: editMode ? 'var(--bg)' : 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
            {editMode ? '✓ Fertig' : '✎ Bearbeiten'}
          </button>
        </div>
      </div>

      {/* Text */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', position: 'relative' }} onMouseUp={handleMouseUp}>
        {editMode ? (
          <textarea value={text} onChange={e => setText(e.target.value)}
            style={{ width: '100%', height: '100%', minHeight: 340, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.8, border: 'none', outline: 'none', resize: 'none', background: 'transparent', color: 'var(--fg)' }} />
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text' }}>
            {segments.map((seg, i) => {
              if (!seg.entity) return <span key={i}>{seg.text}</span>;
              const c = TYPE_COLORS[seg.entity.type] || TYPE_COLORS.other;
              const isActive = activeEntityId === seg.entity.id;
              return (
                <mark key={i} onClick={() => setActiveEntityId(id => id === seg.entity.id ? null : seg.entity.id)}
                  title={`${TYPE_LABELS[seg.entity.type]}${seg.entity.alias ? ' → ' + seg.entity.alias : ''}`}
                  style={{ background: c.bg, color: c.text, borderBottom: `2px solid ${c.border}`, borderRadius: 3, padding: '1px 2px', cursor: 'pointer', outline: isActive ? `2px solid ${c.text}` : 'none', outlineOffset: 1, transition: 'outline .1s', fontFamily: 'inherit' }}>
                  {seg.text}
                </mark>
              );
            })}
          </div>
        )}

        {/* Selection popup */}
        {selection && !editMode && (
          <div className="sel-popup" style={{ position: 'absolute', left: Math.max(8, selection.x - 130), top: Math.max(0, selection.y - 88), background: 'var(--bg)', border: '0.5px solid var(--border-md)', borderRadius: 10, padding: '10px 12px', boxShadow: '0 4px 20px rgba(0,0,0,.15)', zIndex: 100, minWidth: 260 }}>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 6 }}>Als Entität hinzufügen:</div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, padding: '4px 7px', background: 'var(--bg-secondary)', borderRadius: 5, wordBreak: 'break-word' }}>
              „{selection.text.length > 45 ? selection.text.slice(0, 45) + '…' : selection.text}"
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select value={addType} onChange={e => setAddType(e.target.value)}
                style={{ flex: 1, fontSize: 12, padding: '5px 7px', borderRadius: 6, border: '0.5px solid var(--border-md)', background: 'var(--bg-secondary)', color: 'var(--fg)', fontFamily: 'inherit', outline: 'none' }}>
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
              <button onClick={handleAdd}
                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', background: 'var(--fg)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                + Hinzufügen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ padding: '7px 14px', borderTop: '0.5px solid var(--border-faint)', background: 'var(--bg-secondary)', display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
        {ENTITY_TYPES.filter(t => entities.some(e => e.type === t)).map(t => {
          const c = TYPE_COLORS[t];
          return (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: c.bg, border: `1.5px solid ${c.border}`, display: 'inline-block' }} />
              {TYPE_LABELS[t]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Entity row ───────────────────────────────────────────────────────────────
function EntityRow({ entity, onUpdate, onRemove, active, onActivate }) {
  const c = TYPE_COLORS[entity.type] || TYPE_COLORS.other;
  const rowRef = useRef();
  useEffect(() => { if (active && rowRef.current) rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [active]);

  return (
    <div ref={rowRef} onClick={onActivate}
      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', borderRadius: 8, marginBottom: 5, cursor: 'pointer', border: active ? `0.5px solid ${c.text}` : '0.5px solid var(--border-faint)', background: active ? c.bg : 'var(--bg)', transition: 'all .15s' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border-md)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border-faint)'; }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.text, flexShrink: 0 }} />
      <span contentEditable suppressContentEditableWarning
        onBlur={e => onUpdate({ text: e.currentTarget.textContent })}
        onClick={e => e.stopPropagation()}
        style={{ flex: 1, fontSize: 13, fontWeight: 500, outline: 'none', borderBottom: '0.5px dashed transparent', cursor: 'text', minWidth: 0, color: active ? c.text : 'var(--fg)' }}
        onFocus={e => e.currentTarget.style.borderBottomColor = c.text}
        onBlurCapture={e => e.currentTarget.style.borderBottomColor = 'transparent'}
      >{entity.text}</span>
      {entity.alias && <span style={{ fontSize: 10, color: c.text, fontStyle: 'italic', flexShrink: 0, opacity: .75 }}>→ {entity.alias}</span>}
      {entity.type === 'person' && (
        <span
          onClick={e => { e.stopPropagation(); onUpdate({ isComposer: !entity.isComposer }); }}
          title={entity.isComposer ? 'Als Komponist markiert — klicken zum Entfernen' : 'Als Komponist markieren'}
          style={{
            fontSize: 11, padding: '2px 7px', borderRadius: 6, cursor: 'pointer', userSelect: 'none',
            background: entity.isComposer ? '#1D9E7522' : 'transparent',
            color: entity.isComposer ? '#1D9E75' : 'var(--fg-faint)',
            border: `0.5px solid ${entity.isComposer ? '#1D9E7544' : 'transparent'}`,
            flexShrink: 0, transition: 'all .15s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = entity.isComposer ? '#1D9E7533' : 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-faint)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = entity.isComposer ? '#1D9E7522' : 'transparent'; e.currentTarget.style.borderColor = entity.isComposer ? '#1D9E7544' : 'transparent'; }}
        >
          ♪ {entity.isComposer ? 'Komponist' : 'Komponist?'}
        </span>
      )}
      <select value={entity.type} onChange={e => { e.stopPropagation(); onUpdate({ type: e.target.value }); }} onClick={e => e.stopPropagation()}
        style={{ fontSize: 11, padding: '2px 4px', borderRadius: 5, width: 108, border: `0.5px solid ${active ? c.border : 'var(--border-md)'}`, background: active ? c.bg : 'var(--bg-secondary)', color: active ? c.text : 'var(--fg)', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', flexShrink: 0 }}>
        {ENTITY_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
      </select>
      <button onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A32D2D', fontSize: 14, padding: '0 2px', opacity: .45, flexShrink: 0, lineHeight: 1 }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = .45}>×</button>
    </div>
  );
}

// ─── Alias editor ─────────────────────────────────────────────────────────────
function AliasEditor({ rows, setRows }) {
  const [nf, setNf] = useState('');
  const [nt, setNt] = useState('');
  const iS = { fontSize: 12, padding: '4px 7px', borderRadius: 5, border: '0.5px solid var(--border-md)', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'inherit', outline: 'none' };
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <input value={r.from} onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, from: e.target.value } : x))} style={{ ...iS, flex: 1 }} />
          <span style={{ color: 'var(--fg-faint)', fontSize: 11 }}>→</span>
          <input value={r.to} onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, to: e.target.value } : x))} style={{ ...iS, width: 130 }} />
          <button onClick={() => setRows(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#A32D2D', cursor: 'pointer', fontSize: 14, opacity: .55 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <input value={nf} onChange={e => setNf(e.target.value)} placeholder="Original" style={{ ...iS, flex: 1 }} />
        <span style={{ color: 'var(--fg-faint)', fontSize: 11 }}>→</span>
        <input value={nt} onChange={e => setNt(e.target.value)} placeholder="Alias" style={{ ...iS, width: 130 }} />
        <button onClick={() => { if (nf && nt) { setRows(p => [...p, { from: nf, to: nt }]); setNf(''); setNt(''); } }}
          style={{ fontSize: 12, padding: '3px 9px', borderRadius: 5, border: '0.5px solid var(--border-md)', background: 'var(--bg-secondary)', color: 'var(--fg)', cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
      </div>
    </div>
  );
}

// ─── LLM status banner ────────────────────────────────────────────────────────
function LLMStatusBar({ llmSettings, entityRunning, entityError, entityRawResponse, onDetect, onOpenSettings }) {
  const { providerInfo, model, isConfigured } = llmSettings;
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border-faint)', background: 'var(--bg-secondary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Provider indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 20, border: '0.5px solid var(--border-faint)', background: 'var(--bg)', flexShrink: 0 }}>
          <span style={{ color: providerInfo?.color, fontSize: 14 }}>{providerInfo?.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{providerInfo?.name}</span>
          <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>· {model}</span>
          {isConfigured
            ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />
            : <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF9F27', flexShrink: 0 }} />
          }
        </div>

        {/* Detect button */}
        <button
          onClick={() => isConfigured && onDetect()}
          disabled={entityRunning || !isConfigured}
          style={{
            padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: 'none', cursor: entityRunning || !isConfigured ? 'not-allowed' : 'pointer',
            background: entityRunning ? 'var(--bg-secondary)' : isConfigured ? 'var(--fg)' : '#EF9F2733',
            color: entityRunning ? 'var(--fg-muted)' : isConfigured ? 'var(--bg)' : '#EF9F27',
            fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
            opacity: entityRunning ? .7 : 1, transition: 'all .15s',
          }}
        >
          {entityRunning
            ? <><span style={{ animation: 'spin .8s linear infinite', display: 'inline-block' }}>⟳</span> Erkenne Entitäten …</>
            : '⊞ Auto-Erkennung starten'
          }
        </button>

        {/* Settings button */}
        <button onClick={onOpenSettings}
          style={{ padding: '5px 11px', borderRadius: 7, fontSize: 12, border: '0.5px solid var(--border-md)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
          ⚙ LLM-Einstellungen
        </button>
      </div>

      {/* Not configured warning */}
      {!isConfigured && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#EF9F27', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>⚠</span> Kein API-Key für {providerInfo?.name} gesetzt.
          <button onClick={onOpenSettings} style={{ background: 'none', border: 'none', color: '#EF9F27', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}>
            Jetzt konfigurieren →
          </button>
        </div>
      )}

      {/* Error display */}
      {entityError && (
        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: '#FCEBEB', border: '0.5px solid #F09595', fontSize: 12, color: '#A32D2D', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ flexShrink: 0 }}>✕</span>
          <div>
            <strong>Fehler:</strong> {entityError}
            {entityRawResponse && (
              <>
                {' '}
                <button onClick={() => setShowRaw(r => !r)}
                  style={{ background: 'none', border: 'none', color: '#A32D2D', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}>
                  {showRaw ? 'Rohantwort ausblenden' : 'Rohantwort anzeigen'}
                </button>
                {showRaw && (
                  <pre style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 120, overflow: 'auto', background: '#fff', padding: 6, borderRadius: 4 }}>
                    {entityRawResponse}
                  </pre>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Success flash */}
      {!entityRunning && !entityError && entityRawResponse && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#1D9E75', display: 'flex', alignItems: 'center', gap: 5 }}>
          ✓ Entitäten erfolgreich erkannt — bitte prüfen und ggf. korrigieren
        </div>
      )}
    </div>
  );
}

// ─── Main StepEntities ────────────────────────────────────────────────────────
export default function StepEntities({
  entities, updateEntity, removeEntity, addEntity,
  contextMappings, setContextMappings,
  entityRunning, entityError, entityRawResponse, runEntityDetection,
  llmSettings,
  stepDone, advance, goBack,
  ocrText, setOcrText,
  onOpenSettings, onAiError,
}) {
  const [activeId, setActiveId]         = useState(null);
  const [newName, setNewName]           = useState('');
  const [newType, setNewType]           = useState('person');

  useEffect(() => {
    if (entityError && onAiError) {
      onAiError({ message: entityError, rawResponse: entityRawResponse, source: 'Entitätenerkennung' });
    }
  }, [entityError, entityRawResponse]);

  const counts = ENTITY_TYPES.reduce((acc, t) => { acc[t] = entities.filter(e => e.type === t).length; return acc; }, {});

  return (
    <>
      <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border-faint)', borderRadius: 12, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '11px 16px', borderBottom: '0.5px solid var(--border-faint)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Schritt 2 — Entitätenerkennung</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge color="blue">{entities.length} Entitäten</Badge>
            {Object.entries(counts).filter(([, v]) => v > 0).map(([t, v]) => {
              const c = TYPE_COLORS[t];
              return <span key={t} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: c.bg, color: c.text, fontWeight: 500 }}>{TYPE_LABELS[t].split(/[\s/]/)[0]} {v}</span>;
            })}
          </div>
        </div>

        {/* Split pane */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 580 }}>

          {/* LEFT — highlighted OCR text */}
          <div style={{ borderRight: '0.5px solid var(--border-faint)', display: 'flex', flexDirection: 'column' }}>
            <HighlightedText text={ocrText} setText={setOcrText} entities={entities} addEntity={addEntity} activeEntityId={activeId} setActiveEntityId={setActiveId} />
          </div>

          {/* RIGHT — LLM bar + entity list */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* LLM status + detect button */}
            <LLMStatusBar
              llmSettings={llmSettings}
              entityRunning={entityRunning}
              entityError={entityError}
              entityRawResponse={entityRawResponse}
              onDetect={() => runEntityDetection(llmSettings)}
              onOpenSettings={onOpenSettings}
            />

            {/* Alias/context rules */}
            <div style={{ padding: '9px 14px', borderBottom: '0.5px solid var(--border-faint)', background: 'var(--bg-secondary)' }}>
              <Collapsible label="Kontext & Alias-Regeln" badge={`${contextMappings.length} aktiv`}>
                <div style={{ paddingTop: 6 }}>
                  <AliasEditor rows={contextMappings} setRows={setContextMappings} />
                </div>
              </Collapsible>
            </div>

            {/* Scrollable entity list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                Erkannte Entitäten
              </div>

              {entities.length === 0 && !entityRunning && (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--fg-faint)', fontSize: 12 }}>
                  Noch keine Entitäten — Auto-Erkennung starten oder manuell hinzufügen
                </div>
              )}

              {entityRunning && (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>
                  <div style={{ fontSize: 20, animation: 'spin .8s linear infinite', display: 'inline-block', marginBottom: 8 }}>⟳</div>
                  <div>LLM analysiert den Text …</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 4 }}>{llmSettings.providerInfo?.name} · {llmSettings.model}</div>
                </div>
              )}

              {!entityRunning && entities.map(e => (
                <EntityRow key={e.id} entity={e} active={activeId === e.id}
                  onActivate={() => setActiveId(id => id === e.id ? null : e.id)}
                  onUpdate={ch => updateEntity(e.id, ch)}
                  onRemove={() => { removeEntity(e.id); if (activeId === e.id) setActiveId(null); }}
                />
              ))}

              {/* Manual add */}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--border-faint)' }}>
                <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginBottom: 5 }}>Manuell hinzufügen:</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newName) { addEntity(newName, newType); setNewName(''); } }}
                    placeholder="Name …"
                    style={{ flex: 1, fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border-md)', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'inherit', outline: 'none' }} />
                  <select value={newType} onChange={e => setNewType(e.target.value)}
                    style={{ fontSize: 11, padding: '5px 4px', borderRadius: 6, width: 108, border: '0.5px solid var(--border-md)', background: 'var(--bg-secondary)', color: 'var(--fg)', fontFamily: 'inherit', outline: 'none' }}>
                    {ENTITY_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                  <button onClick={() => { if (newName) { addEntity(newName, newType); setNewName(''); } }}
                    style={{ padding: '5px 11px', borderRadius: 6, fontSize: 13, border: '0.5px solid var(--border-md)', background: 'var(--bg-secondary)', color: 'var(--fg)', cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '11px 14px', borderTop: '0.5px solid var(--border-faint)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Btn onClick={goBack}>← OCR</Btn>
              <Btn variant="primary" onClick={() => advance(1)}>Weiter zu Musixplora →</Btn>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
