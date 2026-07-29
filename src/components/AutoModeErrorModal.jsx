import React, { useState } from 'react';

const LLM_PROVIDERS = [
  { id: 'claude',  label: 'Claude',       icon: '◆' },
  { id: 'openai',  label: 'OpenAI',       icon: '⬡' },
  { id: 'gemini',  label: 'Gemini',       icon: '✦' },
  { id: 'mistral', label: 'Mistral',      icon: '≋' },
  { id: 'ollama',  label: 'Ollama (lokal)', icon: '⊛' },
];

export default function AutoModeErrorModal({ error, llmSettings, onRetry, onAbort }) {
  const [showKey, setShowKey] = useState({});
  const { provider, model, apiKeys, ollamaBaseUrl, providerInfo,
    updateProvider, updateModel, updateApiKey, updateOllamaBaseUrl } = llmSettings;

  if (!error) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.38)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: 20,
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 14, maxWidth: 460, width: '100%',
        border: '0.5px solid var(--border-md)', boxShadow: '0 8px 40px rgba(0,0,0,.25)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '0.5px solid var(--border-faint)',
          background: '#e74c3c08', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>✕</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e74c3c' }}>
            LLM-Fehler — Kontingent überschritten
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 18px' }}>

          {/* Error message */}
          <div style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 11,
            background: '#e74c3c08', border: '0.5px solid #e74c3c20',
            color: '#c0392b', marginBottom: 14, fontFamily: 'var(--font-mono)',
            wordBreak: 'break-word',
          }}>
            {error.message}
          </div>

          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 12px 0' }}>
            Bitte wähle einen anderen Anbieter, hinterlege einen gültigen API-Key oder starte Ollama lokal. Klicke dann auf <strong>Weiter</strong>.
          </p>

          {/* Provider grid */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>Anbieter</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
            {LLM_PROVIDERS.map(p => (
              <button key={p.id} onClick={() => updateProvider(p.id)} style={{
                padding: '5px 10px', borderRadius: 7, fontSize: 11,
                border: provider === p.id ? '0.5px solid #185FA5' : '0.5px solid var(--border-faint)',
                background: provider === p.id ? '#185FA511' : 'transparent',
                color: provider === p.id ? '#185FA5' : 'var(--fg-muted)',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: provider === p.id ? 600 : 400,
              }}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>

          {/* Model */}
          {providerInfo?.models?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>Modell</div>
              <select value={model} onChange={e => updateModel(e.target.value)} style={{
                width: '100%', padding: '5px 8px', borderRadius: 6, fontSize: 11,
                border: '0.5px solid var(--border-md)', background: 'var(--bg)', color: 'var(--fg)',
                fontFamily: 'inherit', outline: 'none',
              }}>
                {providerInfo.models.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* API Key */}
          {!providerInfo?.noKey && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>API-Key</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type={showKey[provider] ? 'text' : 'password'}
                  value={apiKeys[provider] ?? ''}
                  onChange={e => updateApiKey(provider, e.target.value)}
                  placeholder={providerInfo?.keyPlaceholder ?? '…'}
                  style={{
                    flex: 1, padding: '5px 8px', borderRadius: 6, fontSize: 11,
                    border: '0.5px solid var(--border-md)', background: 'var(--bg)',
                    color: 'var(--fg)', fontFamily: 'var(--font-mono)', outline: 'none',
                  }}
                />
                <button onClick={() => setShowKey(prev => ({ ...prev, [provider]: !prev[provider] }))} style={{
                  padding: '5px 8px', borderRadius: 6, fontSize: 11,
                  border: '0.5px solid var(--border-md)', background: 'transparent',
                  color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {showKey[provider] ? '👁' : '👁‍🗨'}
                </button>
              </div>
            </div>
          )}

          {/* Ollama URL */}
          {provider === 'ollama' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>Basis-URL</div>
              <input
                value={ollamaBaseUrl}
                onChange={e => updateOllamaBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                style={{
                  width: '100%', padding: '5px 8px', borderRadius: 6, fontSize: 11,
                  border: '0.5px solid var(--border-md)', background: 'var(--bg)',
                  color: 'var(--fg)', fontFamily: 'var(--font-mono)', outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px', borderTop: '0.5px solid var(--border-faint)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onAbort} style={{
            padding: '6px 14px', borderRadius: 7, fontSize: 12,
            border: '0.5px solid var(--border-md)', background: 'transparent',
            color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Abbrechen
          </button>
          <button onClick={onRetry} style={{
            padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: 'none', background: '#185FA5', color: '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
}
