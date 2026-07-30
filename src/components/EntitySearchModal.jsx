import React, { useState } from 'react';
import { ENTITY_TYPES, TYPE_LABELS, TYPE_COLORS, INITIAL_PREFERRED_JOBS, INITIAL_ALIASES } from '../data/initialState';
import { searchAndEnrichOne } from '../services/musixploraService';
import { searchNormdaten } from '../services/normSearch';
import { MatchCard } from './StepMusixplora';
import { ResultCard } from './StepNormdata';

export default function EntitySearchModal({ onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('person');
  const [mxResults, setMxResults] = useState(null);
  const [ndResults, setNdResults] = useState(null);
  const [mxSearching, setMxSearching] = useState(false);
  const [ndSearching, setNdSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('musixplora');
  const [error, setError] = useState(null);

  function isSearching() {
    return mxSearching || ndSearching;
  }

  async function searchMusixplora() {
    if (!name.trim() || mxSearching) return;
    setMxSearching(true);
    setMxResults(null);
    setError(null);
    setActiveTab('musixplora');
    try {
      const entity = { id: Date.now(), text: name.trim(), type, alias: '', isComposer: false };
      const result = await searchAndEnrichOne(entity, INITIAL_ALIASES, [entity], INITIAL_PREFERRED_JOBS);
      setMxResults(result);
    } catch (err) {
      setError(err.message || 'Musixplora-Suche fehlgeschlagen');
    } finally {
      setMxSearching(false);
    }
  }

  async function searchNormdata() {
    if (!name.trim() || ndSearching) return;
    setNdSearching(true);
    setNdResults(null);
    setError(null);
    setActiveTab('normdata');
    try {
      const result = await searchNormdaten(name.trim(), {}, false, INITIAL_PREFERRED_JOBS);
      setNdResults(result);
    } catch (err) {
      setError(err.message || 'Normdaten-Suche fehlgeschlagen');
    } finally {
      setNdSearching(false);
    }
  }

  async function searchBoth() {
    if (!name.trim() || isSearching()) return;
    setMxSearching(true);
    setNdSearching(true);
    setMxResults(null);
    setNdResults(null);
    setError(null);
    setActiveTab('musixplora');

    const entity = { id: Date.now(), text: name.trim(), type, alias: '', isComposer: false };

    await Promise.all([
      (async () => {
        try {
          const result = await searchAndEnrichOne(entity, INITIAL_ALIASES, [entity], INITIAL_PREFERRED_JOBS);
          setMxResults(result);
        } catch (err) {
          if (!error) setError(err.message || 'Musixplora-Suche fehlgeschlagen');
        } finally {
          setMxSearching(false);
        }
      })(),
      (async () => {
        try {
          const result = await searchNormdaten(name.trim(), {}, false, INITIAL_PREFERRED_JOBS);
          setNdResults(result);
        } catch (err) {
          if (!error) setError(err.message || 'Normdaten-Suche fehlgeschlagen');
        } finally {
          setNdSearching(false);
        }
      })(),
    ]);
  }

  const mxCount = mxResults?.results?.length || 0;
  const ndCount = ndResults?.results?.length || 0;
  const c = TYPE_COLORS[type] || TYPE_COLORS.other;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.38)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 14, width: '100%', maxWidth: 740,
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        border: '0.5px solid var(--border-md)',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '13px 18px', borderBottom: '0.5px solid var(--border-faint)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Schnellsuche</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--fg-muted)', padding: '2px 4px', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Search input area */}
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border-faint)' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name der Entität, z. B. Willy Stark"
              onKeyDown={e => e.key === 'Enter' && searchBoth()}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                border: '0.5px solid var(--border-md)', background: 'var(--bg-secondary)',
                color: 'var(--fg)', fontFamily: 'inherit', outline: 'none',
              }}
            />
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              style={{
                padding: '8px 10px', borderRadius: 8, fontSize: 13,
                border: '0.5px solid var(--border-md)', background: 'var(--bg-secondary)',
                color: 'var(--fg)', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
              }}
            >
              {ENTITY_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={searchMusixplora} disabled={!name.trim() || mxSearching} style={{
              flex: 1, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: (!name.trim() || mxSearching) ? 'not-allowed' : 'pointer',
              background: mxSearching ? 'var(--bg-secondary)' : '#185FA5',
              color: mxSearching ? 'var(--fg-muted)' : '#fff',
              fontFamily: 'inherit', opacity: !name.trim() ? .5 : 1,
            }}>
              {mxSearching ? '⟳ Suche …' : 'Musixplora'}
            </button>
            <button onClick={searchNormdata} disabled={!name.trim() || ndSearching} style={{
              flex: 1, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: (!name.trim() || ndSearching) ? 'not-allowed' : 'pointer',
              background: ndSearching ? 'var(--bg-secondary)' : '#1D9E75',
              color: ndSearching ? 'var(--fg-muted)' : '#fff',
              fontFamily: 'inherit', opacity: !name.trim() ? .5 : 1,
            }}>
              {ndSearching ? '⟳ Suche …' : 'Normdaten'}
            </button>
            <button onClick={searchBoth} disabled={!name.trim() || isSearching()} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: '0.5px solid var(--border-md)', cursor: (!name.trim() || isSearching()) ? 'not-allowed' : 'pointer',
              background: 'transparent', color: 'var(--fg)', fontFamily: 'inherit',
              opacity: !name.trim() ? .5 : 1, whiteSpace: 'nowrap',
            }}>
              Beide
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#A32D2D', padding: '6px 10px', borderRadius: 6, background: '#FCEBEB' }}>
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 18px 14px' }}>
          {/* Tab bar */}
          {(mxResults || ndResults) && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, borderBottom: '0.5px solid var(--border-faint)', paddingBottom: 6 }}>
              <button onClick={() => setActiveTab('musixplora')} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: activeTab === 'musixplora' ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === 'musixplora' ? 'var(--fg)' : 'var(--fg-muted)',
              }}>
                Musixplora{mxResults ? ` (${mxCount})` : ''}
              </button>
              <button onClick={() => setActiveTab('normdata')} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: activeTab === 'normdata' ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === 'normdata' ? 'var(--fg)' : 'var(--fg-muted)',
              }}>
                Normdaten{ndResults ? ` (${ndCount})` : ''}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!mxResults && !ndResults && !isSearching() && (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: .2 }}>⌕</div>
              Name eingeben und Suche starten
            </div>
          )}

          {/* Loading */}
          {isSearching() && !mxResults && !ndResults && (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 22, animation: 'spin .8s linear infinite', display: 'inline-block', marginBottom: 12 }}>⟳</div>
              <div>Suche läuft …</div>
            </div>
          )}

          {/* Musixplora tab */}
          {activeTab === 'musixplora' && mxResults && (
            <div>
              {mxCount === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--fg-muted)', fontSize: 12 }}>
                  Keine Musixplora-Treffer für „{name.trim()}"
                </div>
              ) : (
                mxResults.results.map((r, i) => (
                  <MatchCard
                    key={r.id || i}
                    result={r}
                    selected={false}
                    onClick={() => {}}
                    isComposer={false}
                    context={{}}
                    preferredJobs={INITIAL_PREFERRED_JOBS}
                  />
                ))
              )}
              {mxSearching && (
                <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--fg-muted)', fontSize: 12 }}>
                  ⟳ Durchsuche Musixplora …
                </div>
              )}
            </div>
          )}

          {/* Normdata tab */}
          {activeTab === 'normdata' && ndResults && (
            <div>
              {ndCount === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--fg-muted)', fontSize: 12 }}>
                  Keine Normdaten-Treffer für „{name.trim()}"
                </div>
              ) : (
                ndResults.results.map((r, i) => (
                  <ResultCard
                    key={`${r.source}:${r.id}:${i}`}
                    result={r}
                    selected={false}
                    context={{}}
                    onSelect={() => {}}
                    isComposer={false}
                    preferredJobs={INITIAL_PREFERRED_JOBS}
                  />
                ))
              )}
              {ndSearching && (
                <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--fg-muted)', fontSize: 12 }}>
                  ⟳ Durchsuche Normdatenbanken …
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px', borderTop: '0.5px solid var(--border-faint)',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: 'var(--fg)', color: 'var(--bg)',
          }}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
