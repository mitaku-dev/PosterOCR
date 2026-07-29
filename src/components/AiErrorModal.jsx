import React, { useState } from 'react';

export default function AiErrorModal({ error, onClose }) {
  const [showRaw, setShowRaw] = useState(false);

  if (!error) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.38)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: 20,
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 14, maxWidth: 480, width: '100%',
        border: '0.5px solid var(--border-md)', boxShadow: '0 8px 40px rgba(0,0,0,.25)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '0.5px solid var(--border-faint)',
          background: '#e74c3c08', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>✕</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e74c3c' }}>
            {error.source ? `${error.source} — Fehler` : 'KI-Fehler'}
          </span>
        </div>

        <div style={{ padding: '14px 18px' }}>
          <div style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 11,
            background: '#e74c3c08', border: '0.5px solid #e74c3c20',
            color: '#c0392b', fontFamily: 'var(--font-mono)',
            wordBreak: 'break-word', whiteSpace: 'pre-wrap',
          }}>
            {error.message}
          </div>

          {error.rawResponse && (
            <div style={{ marginTop: 10 }}>
              <button onClick={() => setShowRaw(r => !r)} style={{
                background: 'none', border: 'none', color: '#185FA5',
                cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                textDecoration: 'underline', padding: 0,
              }}>
                {showRaw ? 'Rohantwort ausblenden' : 'Rohantwort anzeigen'}
              </button>
              {showRaw && (
                <pre style={{
                  marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  maxHeight: 200, overflow: 'auto', background: 'var(--bg-page)',
                  padding: 8, borderRadius: 6, border: '0.5px solid var(--border-faint)',
                }}>
                  {error.rawResponse}
                </pre>
              )}
            </div>
          )}
        </div>

        <div style={{
          padding: '10px 18px', borderTop: '0.5px solid var(--border-faint)',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{
            padding: '6px 20px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: 'none', background: '#185FA5', color: '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
