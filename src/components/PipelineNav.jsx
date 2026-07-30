import React from 'react';

const STEPS = [
  { label: 'OCR',        icon: '◉', sub: 'Bild & Text' },
  { label: 'Entitäten',  icon: '⊞', sub: 'Erkennung' },
  { label: 'Musixplora', icon: '⊗', sub: 'Datenbank' },
  { label: 'Normdaten',  icon: '⊘', sub: 'Normdaten' },
  { label: 'Export',     icon: '⇩', sub: 'Export' },
];

export default function PipelineNav({ step, stepDone, onSelect }) {
  return (
    <nav style={{
      display: 'flex', borderRadius: 12, overflow: 'hidden',
      border: '0.5px solid var(--border-faint)',
      background: 'var(--bg-secondary)', marginBottom: 20,
    }}>
      {STEPS.map((s, i) => {
        const active = step === i;
        const done   = stepDone[i];
        const clickable = done || i === step || (i > 0 && stepDone[i - 1]);

        return (
          <button
            key={i}
            onClick={() => clickable && onSelect(i)}
            style={{
              flex: 1, padding: '10px 8px',
              fontSize: 12, fontWeight: active ? 600 : 400,
              color: done ? '#1D9E75' : active ? 'var(--fg)' : 'var(--fg-muted)',
              background: active ? 'var(--bg)' : 'transparent',
              border: 'none',
              borderRight: i < 4 ? '0.5px solid var(--border-faint)' : 'none',
              cursor: clickable ? 'pointer' : 'default',
              transition: 'all .15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              position: 'relative', fontFamily: 'inherit', opacity: clickable ? 1 : .5,
            }}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: '50%',
              background: done ? '#1D9E75' : active ? 'var(--fg)' : 'var(--border-md)',
              color: done || active ? '#fff' : 'var(--fg-muted)',
              fontSize: 11, fontWeight: 700, marginBottom: 2,
              transition: 'all .2s',
            }}>
              {done ? '✓' : i + 1}
            </span>
            <span>{s.label}</span>
            <span style={{ fontSize: 10, opacity: .5 }}>{s.sub}</span>
          </button>
        );
      })}
    </nav>
  );
}
