import React from 'react';

const STEPS = [
  { label: 'OCR',        icon: '◉', sub: 'Schritt 1' },
  { label: 'Entitäten',  icon: '⊞', sub: 'Schritt 2' },
  { label: 'Musixplora', icon: '⊗', sub: 'Schritt 3' },
  { label: 'Normdaten',  icon: '⊘', sub: 'Schritt 4' },
  { label: 'Export',     icon: '⇩', sub: 'Schritt 5' },
];

export default function PipelineNav({ step, stepDone, onSelect }) {
  return (
    <div style={{
      display: 'flex', borderRadius: 12, overflow: 'hidden',
      border: '0.5px solid var(--border-faint)',
      background: 'var(--bg-secondary)',
      marginBottom: 20,
    }}>
      {STEPS.map((s, i) => {
        const active = step === i;
        const done   = stepDone[i];
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            style={{
              flex: 1, padding: '10px 8px',
              fontSize: 12, fontWeight: active ? 600 : 400,
              color: done ? '#1D9E75' : active ? 'var(--fg)' : 'var(--fg-muted)',
              background: active ? 'var(--bg)' : 'transparent',
              border: 'none',
              borderRight: i < 4 ? '0.5px solid var(--border-faint)' : 'none',
              cursor: 'pointer', transition: 'all .15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              position: 'relative', fontFamily: 'inherit',
            }}
          >
            {done && (
              <span style={{
                position: 'absolute', top: 6, right: 8,
                width: 6, height: 6, borderRadius: '50%', background: '#1D9E75',
              }} />
            )}
            <span>{s.icon} {s.label}</span>
            <span style={{ fontSize: 10, opacity: .5 }}>{s.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
