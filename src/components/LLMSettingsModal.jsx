import React, { useState, useEffect, useRef } from 'react';
import { PROVIDERS, DEFAULT_SYSTEM_PROMPT } from '../services/llmService';

function ProviderCard({ provider: p, selected, configured, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
        border: `0.5px solid ${selected ? p.color : 'var(--border-faint)'}`,
        background: selected ? `${p.color}14` : 'var(--bg)',
        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 9,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border-md)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border-faint)'; }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, color: p.color }}>{p.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: selected ? p.color : 'var(--fg)' }}>{p.name}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 1 }}>
          {p.noKey ? 'Lokal · kein API-Key' : configured ? '✓ API-Key gesetzt' : 'API-Key erforderlich'}
        </div>
      </div>
      {configured && (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />
      )}
      {selected && (
        <span style={{ width: 16, height: 16, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>
        </span>
      )}
    </div>
  );
}

export default function LLMSettingsModal({ settings, onClose }) {
  const {
    provider, model, apiKeys, ollamaBaseUrl, systemPrompt,
    updateProvider, updateModel, updateApiKey,
    updateOllamaBaseUrl, updateSystemPrompt, resetSystemPrompt,
    providerInfo,
  } = settings;

  const [tab, setTab] = useState('provider'); // 'provider' | 'prompt'
  const [showKey, setShowKey] = useState({});
  const [promptDirty, setPromptDirty] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const promptRef = useRef();
  const modalRef  = useRef();

  // Close on outside click
  useEffect(() => {
    function onDown(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  function savePrompt() {
    updateSystemPrompt(localPrompt);
    setPromptDirty(false);
  }

  const tabStyle = (t) => ({
    padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
    border: 'none', background: 'transparent', fontFamily: 'inherit',
    color: tab === t ? 'var(--fg)' : 'var(--fg-muted)',
    borderBottom: tab === t ? '2px solid var(--fg)' : '2px solid transparent',
    transition: 'all .15s',
  });

  const iStyle = {
    width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 7,
    border: '0.5px solid var(--border-md)',
    background: 'var(--bg-secondary)', color: 'var(--fg)',
    fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 20,
    }}>
      <div
        ref={modalRef}
        style={{
          background: 'var(--bg)', borderRadius: 14, width: '100%', maxWidth: 620,
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          border: '0.5px solid var(--border-md)',
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>LLM-Einstellungen</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              Anbieter konfigurieren & Prompt anpassen
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--fg-muted)', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border-faint)', margin: '0 18px', paddingTop: 10 }}>
          <button style={tabStyle('provider')} onClick={() => setTab('provider')}>⚙ Anbieter & Modell</button>
          <button style={tabStyle('prompt')} onClick={() => setTab('prompt')}>
            ✎ System-Prompt {promptDirty ? <span style={{ color: '#EF9F27', marginLeft: 4 }}>●</span> : ''}
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

          {tab === 'provider' && (
            <>
              {/* Provider grid */}
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                LLM-Anbieter
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
                {Object.values(PROVIDERS).map(p => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    selected={provider === p.id}
                    configured={p.noKey ? true : !!(apiKeys[p.id])}
                    onClick={() => updateProvider(p.id)}
                  />
                ))}
              </div>

              {/* Model selector */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 7 }}>
                  Modell
                </label>
                <select
                  value={model}
                  onChange={e => updateModel(e.target.value)}
                  style={{ ...iStyle, cursor: 'pointer' }}
                >
                  {providerInfo?.models.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* API Key / Ollama URL */}
              {providerInfo?.noKey ? (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 7 }}>
                    Ollama Base URL
                  </label>
                  <input
                    value={ollamaBaseUrl}
                    onChange={e => updateOllamaBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    style={iStyle}
                  />
                  <p style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 6 }}>
                    Ollama muss lokal laufen. Starte mit: <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3 }}>ollama serve</code>
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      API-Key — {providerInfo?.name}
                    </label>
                    <a
                      href={providerInfo?.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: providerInfo?.color, textDecoration: 'none' }}
                    >
                      Key erstellen ↗
                    </a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showKey[provider] ? 'text' : 'password'}
                      value={apiKeys[provider] ?? ''}
                      onChange={e => updateApiKey(provider, e.target.value)}
                      placeholder={providerInfo?.keyPlaceholder}
                      style={{ ...iStyle, paddingRight: 44, fontFamily: apiKeys[provider] ? 'var(--font-mono)' : 'inherit', fontSize: 12 }}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      onClick={() => setShowKey(prev => ({ ...prev, [provider]: !prev[provider] }))}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                        color: 'var(--fg-faint)', fontFamily: 'inherit',
                      }}
                    >
                      {showKey[provider] ? '🙈' : '👁'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 6 }}>
                    Der Key wird nur lokal im Browser gespeichert (localStorage) und nie übertragen.
                  </p>

                  {/* All configured keys overview */}
                  {Object.entries(apiKeys).filter(([, v]) => v).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>
                        Konfigurierte Anbieter
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(apiKeys).filter(([, v]) => v).map(([pid]) => {
                          const p = PROVIDERS[pid];
                          if (!p) return null;
                          return (
                            <span key={pid} style={{
                              fontSize: 11, padding: '3px 9px', borderRadius: 20,
                              background: `${p.color}1A`, color: p.color,
                              border: `0.5px solid ${p.color}44`,
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                            }}>
                              {p.icon} {p.name}
                              <button
                                onClick={() => updateApiKey(pid, '')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.color, fontSize: 13, padding: 0, opacity: .6, lineHeight: 1 }}
                              >×</button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'prompt' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    System-Prompt
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 2 }}>
                    Wird an das LLM als Systemanweisung gesendet. Änderungen gelten für alle Anbieter.
                  </div>
                </div>
                <button
                  onClick={() => { setLocalPrompt(DEFAULT_SYSTEM_PROMPT); setPromptDirty(true); }}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--border-md)', background: 'var(--bg-secondary)', color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  ↺ Zurücksetzen
                </button>
              </div>

              <textarea
                ref={promptRef}
                value={localPrompt}
                onChange={e => { setLocalPrompt(e.target.value); setPromptDirty(true); }}
                rows={18}
                style={{
                  width: '100%', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7,
                  padding: '10px 12px', borderRadius: 8,
                  border: promptDirty ? '0.5px solid #EF9F27' : '0.5px solid var(--border-md)',
                  background: 'var(--bg-secondary)', color: 'var(--fg)',
                  resize: 'vertical', outline: 'none',
                }}
              />

              {/* Available placeholders */}
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 7, background: 'var(--bg-secondary)', border: '0.5px solid var(--border-faint)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 6 }}>Verfügbare Variablen im User-Prompt:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {['{ocrText}', '{contextMappings}'].map(v => (
                    <code key={v} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'var(--bg)', border: '0.5px solid var(--border-faint)', color: '#185FA5', fontFamily: 'var(--font-mono)' }}>{v}</code>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '0.5px solid var(--border-faint)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            {tab === 'provider'
              ? <span>Aktiv: <strong style={{ color: providerInfo?.color }}>{providerInfo?.icon} {providerInfo?.name}</strong> · {model}</span>
              : promptDirty
              ? <span style={{ color: '#EF9F27' }}>● Ungespeicherte Änderungen</span>
              : <span style={{ color: '#1D9E75' }}>✓ Gespeichert</span>
            }
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {tab === 'prompt' && promptDirty && (
              <button onClick={savePrompt}
                style={{ padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', background: '#1D9E75', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                Speichern
              </button>
            )}
            <button onClick={onClose}
              style={{ padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', background: 'var(--fg)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Fertig
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
