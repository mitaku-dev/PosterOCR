import React, { useState } from 'react';

import { getRunner } from '../services/autoModeService';

export default function SessionSidebar({
  open, onClose,
  sessions, activeId,
  onCreate, onSave, onLoad, onDelete, onRename,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  function startRename(s) {
    setEditingId(s.id);
    setEditName(s.name);
  }

  function submitRename(id) {
    if (editName.trim()) onRename(id, editName.trim());
    setEditingId(null);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function entityCount(s) {
    if (!s.data?.entities) return 0;
    return s.data.entities.length;
  }

  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 899 }} onClick={onClose} />}

      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 240,
        background: 'var(--bg)', borderRight: '0.5px solid var(--border-faint)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s ease',
        zIndex: 900,
        fontFamily: 'var(--font-sans)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 14px 12px',
          borderBottom: '0.5px solid var(--border-faint)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Sessions</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, color: 'var(--fg-faint)', padding: '2px 6px', fontFamily: 'inherit',
          }}>✕</button>
        </div>

        {/* New Session */}
        <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border-faint)' }}>
          <button onClick={onCreate} style={{
            width: '100%', padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 500,
            border: '0.5px dashed var(--border-md)', background: 'transparent',
            color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            + Neue Session
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {sessions.length === 0 && (
            <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 11, color: 'var(--fg-faint)', fontStyle: 'italic' }}>
              Noch keine Sessions
            </div>
          )}
          {[...sessions].reverse().map(s => {
            const isActive = s.id === activeId;
            return (
              <div key={s.id} style={{
                padding: '8px 14px', cursor: 'pointer',
                background: isActive ? 'var(--bg-secondary)' : 'transparent',
                borderLeft: isActive ? '2px solid #185FA5' : '2px solid transparent',
              }}
                onClick={() => { if (!isActive) onLoad(s.id); }}
              >
                {editingId === s.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => submitRename(s.id)}
                    onKeyDown={e => { if (e.key === 'Enter') submitRename(s.id); if (e.key === 'Escape') setEditingId(null); }}
                    style={{
                      width: '100%', fontSize: 12, padding: '2px 4px',
                      border: '0.5px solid var(--border-md)', borderRadius: 4,
                      background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <div
                    style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}
                    onDoubleClick={() => startRename(s)}
                  >
                    {s.name}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--fg-faint)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span>{entityCount(s)} Entitäten</span>
                  <span>{formatDate(s.updatedAt || s.createdAt)}</span>
                  {(() => {
                    const runner = getRunner(s.id);
                    if (runner && runner.running && !runner.aborted) {
                      return <span style={{ color: '#185FA5', fontWeight: 600 }}>⟳</span>;
                    }
                    if (s.autoModeDone) return <span style={{ color: '#1D9E75' }}>✓</span>;
                    if (s.autoModeError) return <span style={{ color: '#e74c3c' }}>✕</span>;
                    return null;
                  })()}
                </div>
                {isActive && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <button onClick={(e) => { e.stopPropagation(); onSave(); }} style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      border: '0.5px solid var(--border-md)', background: '#185FA511',
                      color: '#185FA5', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      Speichern
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      border: '0.5px solid var(--border-md)', background: 'transparent',
                      color: '#A32D2D', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 14px', borderTop: '0.5px solid var(--border-faint)',
          fontSize: 10, color: 'var(--fg-faint)', textAlign: 'center',
        }}>
          {sessions.length} Session{sessions.length !== 1 ? 'en' : ''}
        </div>
      </div>
    </>
  );
}
