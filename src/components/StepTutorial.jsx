import React from 'react';
import { TUTORIALS, TUTORIAL_STEP_LABELS } from '../data/tutorials';

const STEP_DOTS = ['OCR', 'Entitäten', 'Musixplora', 'Normdaten', 'Export'];

export default function StepTutorial({ step, onDismiss }) {
  const tutorial = TUTORIALS[step];
  if (!tutorial) return null;

  return (
    <div style={{
      marginBottom: 14,
      borderRadius: 12,
      border: '0.5px solid #185FA544',
      background: 'linear-gradient(135deg, #E6F1FB 0%, #ffffff 100%)',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(24,95,165,.10)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '0.5px solid #185FA522',
      }}>
        <span style={{ fontSize: 22 }}>{tutorial.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#185FA5' }}>
            {tutorial.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 1 }}>
            {tutorial.summary}
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: 'rgba(24,95,165,.10)', border: 'none',
            borderRadius: 8, cursor: 'pointer', padding: '6px 14px',
            fontSize: 12, fontWeight: 600, color: '#185FA5',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
            transition: 'all .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(24,95,165,.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(24,95,165,.10)'}
        >
          Verstanden
        </button>
      </div>

      {/* Sections */}
      <div style={{ padding: '10px 16px 12px' }}>
        {tutorial.sections.map((section, i) => (
          <div key={i} style={{ marginBottom: i < tutorial.sections.length - 1 ? 10 : 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--fg)',
              marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                width: 4, height: 4, borderRadius: '50%',
                background: '#185FA5', flexShrink: 0,
              }} />
              {section.heading}
            </div>
            <div style={{
              fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6,
              whiteSpace: 'pre-line', paddingLeft: 9,
            }}>
              {section.text}
            </div>
          </div>
        ))}
      </div>

      {/* Step progress dots */}
      <div style={{
        padding: '8px 16px',
        borderTop: '0.5px solid #185FA522',
        background: 'rgba(24,95,165,.04)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 10, color: 'var(--fg-faint)', marginRight: 4 }}>
          Schritt {step + 1} von {TUTORIALS.length}
        </span>
        {STEP_DOTS.map((label, i) => (
          <span
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === step ? '#185FA5' : 'var(--border-faint)',
              transition: 'all .2s',
            }}
            title={label}
          />
        ))}
      </div>
    </div>
  );
}
