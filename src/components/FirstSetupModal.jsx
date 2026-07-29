import React, { useState } from 'react';
import { PROVIDERS } from '../services/llmService';

const PROVIDER_LIST = Object.values(PROVIDERS).filter(p => !p.noKey);

export default function FirstSetupModal({ llmSettings, onDone }) {
  const { apiKeys, addApiKey, removeApiKey } = llmSettings;
  const [selectedProvider, setSelectedProvider] = useState(PROVIDER_LIST[0]?.id ?? 'claude');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState({});

  const currentProvider = PROVIDERS[selectedProvider];
  const providerKeys = apiKeys[selectedProvider] ?? [];

  function handleAddKey() {
    if (keyInput.trim()) {
      addApiKey(selectedProvider, keyInput.trim());
      setKeyInput('');
    }
  }

  const hasAnyKey = Object.entries(apiKeys).some(([, keys]) =>
    Array.isArray(keys) ? keys.some(k => !!k) : !!keys
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 16, width: '100%', maxWidth: 580,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        border: '0.5px solid var(--border-md)',
        boxShadow: '0 24px 80px rgba(0,0,0,.3)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #185FA5, #60d0a0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, marginBottom: 14, color: '#fff',
          }}>⚡</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--fg)' }}>
            Willkommen bei PosterOCR
          </h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.5 }}>
            Diese App nutzt KI zur Erkennung von Entitäten aus Konzertpostern.
            Um loszulegen, benötigst du einen API-Key von einem der folgenden Anbieter.
          </p>
        </div>

        {/* Provider selection */}
        <div style={{ padding: '20px 24px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            1. Wähle einen Anbieter
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PROVIDER_LIST.map(p => {
              const keys = apiKeys[p.id] ?? [];
              const configured = Array.isArray(keys) ? keys.some(k => !!k) : !!keys;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${selectedProvider === p.id ? p.color : 'var(--border-faint)'}`,
                    background: selectedProvider === p.id ? `${p.color}12` : 'transparent',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 18, color: p.color }}>{p.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: selectedProvider === p.id ? p.color : 'var(--fg)' }}>
                      {p.name}
                    </span>
                    {configured && <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', borderRadius: 10, background: '#E1F5EE', color: '#085041' }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 2 }}>
                    {p.models.length} Modelle
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key input */}
        <div style={{ padding: '0 24px 14px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              2. API-Key hinzufügen
            </div>
            <a
              href={currentProvider?.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: currentProvider?.color, textDecoration: 'none', fontWeight: 500 }}
            >
              Key erstellen ↗
            </a>
          </div>

          {/* Existing keys for this provider */}
          {providerKeys.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              {providerKeys.map((key, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', borderRadius: 8,
                  background: 'var(--bg-secondary)', border: '0.5px solid var(--border-faint)',
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: i === 0 ? currentProvider?.color : 'var(--border-md)',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{
                    flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)',
                    color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {showKey[`setup-${i}`] ? key : '•'.repeat(Math.min(key.length, 40))}
                  </span>
                  <button
                    onClick={() => setShowKey(prev => ({ ...prev, [`setup-${i}`]: !prev[`setup-${i}`] }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--fg-faint)', padding: '2px 4px', fontFamily: 'inherit' }}
                  >
                    {showKey[`setup-${i}`] ? '🙈' : '👁'}
                  </button>
                  <button
                    onClick={() => removeApiKey(selectedProvider, i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#A32D2D', padding: '2px 4px', lineHeight: 1 }}
                  >×</button>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'var(--fg-faint)', paddingLeft: 2 }}>
                Key 1 wird primär verwendet, weitere Keys dienen als Fallback bei Rate-Limits.
              </div>
            </div>
          )}

          {/* Add key input */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddKey(); }}
              placeholder={currentProvider?.keyPlaceholder ?? 'API-Key eingeben …'}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 13,
                border: '0.5px solid var(--border-md)', background: 'var(--bg-secondary)',
                color: 'var(--fg)', fontFamily: 'var(--font-mono)', outline: 'none',
              }}
            />
            <button
              onClick={handleAddKey}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: 'none', background: currentProvider?.color || '#185FA5',
                color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Hinzufügen</button>
          </div>

          {providerKeys.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--fg-faint)', margin: '8px 0 0', lineHeight: 1.5 }}>
              Du kannst mehrere API-Keys pro Anbieter hinzufügen. Bei einem Rate-Limit wird automatisch
              der nächste Key verwendet.
            </p>
          )}

          {/* Explanation callout */}
          <div style={{
            marginTop: 14, padding: '12px 14px', borderRadius: 10,
            background: '#FAEEDA44', border: '0.5px solid #EF9F2744',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#633806', marginBottom: 4 }}>💡 Wie komme ich an einen API-Key?</div>
            <div style={{ fontSize: 11, color: '#633806', lineHeight: 1.6 }}>
              <strong>Claude (Anthropic):</strong> Auf <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#185FA5' }}>console.anthropic.com</a> registrieren und einen API-Key erstellen. Startguthaben erhältst du nach einmaligem Aufladen.<br />
              <strong>OpenAI:</strong> Auf <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: '#185FA5' }}>platform.openai.com</a> anmelden und unter "API Keys" einen neuen Key generieren.<br />
              <strong>Gemini (Google):</strong> Kostenlosen Key auf <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#185FA5' }}>aistudio.google.com</a> erstellen.<br />
              <strong>Mistral:</strong> Auf <a href="https://console.mistral.ai/api-keys/" target="_blank" rel="noopener noreferrer" style={{ color: '#185FA5' }}>console.mistral.ai</a> registrieren und Key erstellen.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '0.5px solid var(--border-faint)',
          background: 'var(--bg-secondary)', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderRadius: '0 0 16px 16px',
        }}>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            {hasAnyKey
              ? <span style={{ color: '#1D9E75' }}>✓ Mindestens ein API-Key konfiguriert</span>
              : <span>Du kannst später unter ⚙ Einstellungen weitere Keys hinzufügen</span>
            }
          </div>
          <button
            onClick={onDone}
            style={{
              padding: '9px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: 'none', background: hasAnyKey ? 'var(--fg)' : 'var(--border-md)',
              color: hasAnyKey ? 'var(--bg)' : 'var(--fg-faint)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Los geht's
          </button>
        </div>
      </div>
    </div>
  );
}
