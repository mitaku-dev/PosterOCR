import React, { useState } from 'react';
import { Btn } from './ui';

const LLM_PROVIDERS = [
  { id: 'claude',  label: 'Claude',       icon: '◆' },
  { id: 'openai',  label: 'OpenAI',       icon: '⬡' },
  { id: 'gemini',  label: 'Gemini',       icon: '✦' },
  { id: 'mistral', label: 'Mistral',      icon: '≋' },
  { id: 'ollama',  label: 'Ollama (lokal)', icon: '⊛' },
];

export default function SettingsPanel({
  aliases, setAliases,
  preferredJobs, setPreferredJobs,
  llmSettings,
  theme,
  onClose,
}) {
  const [tab, setTab] = useState('llm');
  const { provider, model, apiKeys, ollamaBaseUrl, systemPrompt, ocrFixPrompt, ocrFixIncludeImage,
    providerInfo, currentKeys,
    updateProvider, updateModel, addApiKey, removeApiKey, updateOllamaBaseUrl,
    updateSystemPrompt, resetSystemPrompt,
    updateOcrFixPrompt, resetOcrFixPrompt, updateOcrFixIncludeImage } = llmSettings;
  const [showKey, setShowKey] = useState({});
  const [newKeyInput, setNewKeyInput] = useState('');
  const [promptTab, setPromptTab] = useState('entities');
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.38)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 14, width: '100%', maxWidth: 560,
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        border: '0.5px solid var(--border-md)',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '0.5px solid var(--border-faint)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>⚙ Einstellungen</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--fg-muted)', padding: '2px 4px', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid var(--border-faint)', padding: '0 14px' }}>
          {[
            { id: 'aliases', label: 'Schreibvarianten' },
            { id: 'jobs',    label: 'Berufe' },
            { id: 'llm',     label: 'LLM' },
            { id: 'design',  label: 'Design' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '9px 14px', fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
              border: 'none', borderBottom: tab === t.id ? '2px solid #185FA5' : '2px solid transparent',
              background: 'transparent', color: tab === t.id ? '#185FA5' : 'var(--fg-muted)',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {tab === 'aliases' && (
            <>
              <SectionLabel>Schreibvariantenregeln</SectionLabel>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Diese Ersetzungen werden auf Suchbegriffe angewendet, bevor sie an Musixplora gesendet werden.
                Nützlich für Umlaute oder häufige OCR-Fehler.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {aliases.map((a, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 9px', borderRadius: 20, fontSize: 12,
                    background: 'var(--bg-secondary)', border: '0.5px solid var(--border-faint)',
                    color: 'var(--fg)',
                  }}>
                    {a.from} → {a.to}
                    <span
                      onClick={() => setAliases(prev => prev.filter((_, j) => j !== i))}
                      style={{ opacity: .5, cursor: 'pointer', fontSize: 11 }}
                    >×</span>
                  </span>
                ))}
              </div>
              <AddRowInput
                leftPlaceholder="Original"
                rightPlaceholder="Ersetzung"
                onAdd={(l, r) => { if (l && r) setAliases(prev => [...prev, { from: l, to: r }]); }}
              />
            </>
          )}

          {tab === 'jobs' && (
            <>
              <SectionLabel>Bevorzugte Berufe (Score-Bonus)</SectionLabel>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Wenn ein Musixplora- oder Normdaten-Treffer einen dieser Berufe enthält, erhält er +10 Score-Punkte
                (nur bei Nicht-Komponisten). Relevant für Dirigenten, Solisten, Musiker etc.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {preferredJobs.map((job, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 9px', borderRadius: 20, fontSize: 12,
                    background: '#E1F5EE', border: '0.5px solid #5DCAA5',
                    color: '#085041',
                  }}>
                    {job}
                    <span
                      onClick={() => setPreferredJobs(prev => prev.filter((_, j) => j !== i))}
                      style={{ opacity: .5, cursor: 'pointer', fontSize: 11, color: '#A32D2D' }}
                    >×</span>
                  </span>
                ))}
              </div>
              <AddSingleInput
                placeholder="Beruf hinzufügen …"
                onAdd={v => { if (v && !preferredJobs.includes(v)) setPreferredJobs(prev => [...prev, v]); }}
              />
            </>
          )}

          {tab === 'design' && (
            <>
              <SectionLabel>Erscheinungsbild</SectionLabel>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { id: 'light', label: 'Hell', icon: '☀' },
                  { id: 'dark', label: 'Dunkel', icon: '☾' },
                  { id: 'system', label: 'System', icon: '⚙' },
                ].map(t => (
                  <button key={t.id} onClick={() => theme.setMode(t.id)} style={{
                    flex: 1, padding: '12px 8px', borderRadius: 8, fontSize: 12,
                    fontWeight: theme.mode === t.id ? 600 : 400,
                    border: theme.mode === t.id ? '0.5px solid #185FA5' : '0.5px solid var(--border-faint)',
                    background: theme.mode === t.id ? '#185FA511' : 'transparent',
                    color: theme.mode === t.id ? '#185FA5' : 'var(--fg-muted)',
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all .15s',
                  }}>
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                {theme.mode === 'system'
                  ? 'Folgt dem System-Farbschema (Hell/Dunkel).'
                  : theme.mode === 'dark'
                    ? 'Dunkles Farbschema — manuell gewählt.'
                    : 'Helles Farbschema — manuell gewählt.'}
              </p>
            </>
          )}

          {tab === 'llm' && (
            <>
              {/* Provider */}
              <SectionLabel>Anbieter</SectionLabel>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                {LLM_PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => updateProvider(p.id)} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12,
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
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Modell</div>
                  <select value={model} onChange={e => updateModel(e.target.value)} style={{
                    width: '100%', padding: '6px 8px', borderRadius: 6, fontSize: 12,
                    border: '0.5px solid var(--border-md)', background: 'var(--bg)', color: 'var(--fg)',
                    fontFamily: 'inherit', outline: 'none',
                  }}>
                    {providerInfo.models.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* API Keys (multiple per provider) */}
              {!providerInfo?.noKey && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
                    API-Keys (mehrere möglich — bei Rate-Limit wird automatisch der nächste verwendet)
                  </div>

                  {/* Existing keys */}
                  {currentKeys.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                      {currentKeys.map((key, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 8px', borderRadius: 6,
                          background: 'var(--bg-secondary)', border: '0.5px solid var(--border-faint)',
                        }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: '50%',
                            background: i === 0 ? '#185FA5' : 'var(--border-md)',
                            color: '#fff', fontSize: 10, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>{i + 1}</span>
                          <span style={{
                            flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)',
                            color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {showKey[`${provider}-${i}`] ? key : '•'.repeat(Math.min(key.length, 40))}
                          </span>
                          <button
                            onClick={() => setShowKey(prev => ({ ...prev, [`${provider}-${i}`]: !prev[`${provider}-${i}`] }))}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: 11, color: 'var(--fg-faint)', fontFamily: 'inherit',
                              padding: '2px 4px',
                            }}
                          >
                            {showKey[`${provider}-${i}`] ? '🙈' : '👁'}
                          </button>
                          <button
                            onClick={() => removeApiKey(provider, i)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: 13, color: '#A32D2D', padding: '2px 4px', lineHeight: 1,
                            }}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new key input */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="text"
                      value={newKeyInput}
                      onChange={e => setNewKeyInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newKeyInput.trim()) {
                          addApiKey(provider, newKeyInput.trim());
                          setNewKeyInput('');
                        }
                      }}
                      placeholder={providerInfo?.keyPlaceholder ?? 'Neuen API-Key eingeben …'}
                      style={{
                        flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 12,
                        border: '0.5px solid var(--border-md)', background: 'var(--bg)',
                        color: 'var(--fg)', fontFamily: 'var(--font-mono)', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newKeyInput.trim()) {
                          addApiKey(provider, newKeyInput.trim());
                          setNewKeyInput('');
                        }
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: 'none', background: '#185FA5', color: '#fff',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >+</button>
                  </div>

                  {/* Overview of all configured providers */}
                  {Object.entries(apiKeys).filter(([, keys]) => Array.isArray(keys) && keys.some(k => k)).length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)',
                        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6,
                      }}>
                        Konfigurierte Anbieter
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(apiKeys).filter(([, keys]) => Array.isArray(keys) && keys.some(k => k)).map(([pid, keys]) => {
                          const p = LLM_PROVIDERS.find(x => x.id === pid);
                          if (!p) return null;
                          return (
                            <span key={pid} style={{
                              fontSize: 11, padding: '3px 9px', borderRadius: 20,
                              background: provider === pid ? '#185FA511' : 'var(--bg-secondary)',
                              color: provider === pid ? '#185FA5' : 'var(--fg-muted)',
                              border: provider === pid ? '0.5px solid #185FA544' : '0.5px solid var(--border-faint)',
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                            }}>
                              {p.icon} {p.label}
                              <span style={{
                                fontSize: 10, fontWeight: 600,
                                background: provider === pid ? '#185FA5' : 'var(--border-md)',
                                color: '#fff', borderRadius: '50%',
                                width: 16, height: 16, display: 'inline-flex',
                                alignItems: 'center', justifyContent: 'center',
                              }}>{keys.filter(Boolean).length}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ollama URL */}
              {provider === 'ollama' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Basis-URL</div>
                  <input
                    value={ollamaBaseUrl}
                    onChange={e => updateOllamaBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    style={{
                      width: '100%', padding: '6px 8px', borderRadius: 6, fontSize: 12,
                      border: '0.5px solid var(--border-md)', background: 'var(--bg)',
                      color: 'var(--fg)', fontFamily: 'var(--font-mono)', outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* Prompts */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 6 }}>
                <button onClick={() => setPromptTab('entities')} style={{
                  padding: '5px 12px', fontSize: 11, borderRadius: '6px 0 0 6px',
                  border: '0.5px solid var(--border-md)',
                  background: promptTab === 'entities' ? '#185FA522' : 'transparent',
                  color: promptTab === 'entities' ? '#185FA5' : 'var(--fg-faint)',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: promptTab === 'entities' ? 600 : 400,
                }}>Entitäten-Prompt</button>
                <button onClick={() => setPromptTab('ocr')} style={{
                  padding: '5px 12px', fontSize: 11, borderRadius: '0 6px 6px 0',
                  border: '0.5px solid var(--border-md)', borderLeft: 'none',
                  background: promptTab === 'ocr' ? '#185FA522' : 'transparent',
                  color: promptTab === 'ocr' ? '#185FA5' : 'var(--fg-faint)',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: promptTab === 'ocr' ? 600 : 400,
                }}>OCR-Fix-Prompt</button>
              </div>

              {promptTab === 'entities' ? (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)' }}>System-Prompt (Entitätenerkennung)</div>
                    <button onClick={resetSystemPrompt} style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 4,
                      border: '0.5px solid var(--border-faint)', background: 'transparent',
                      color: 'var(--fg-faint)', cursor: 'pointer', fontFamily: 'inherit',
                    }}>Zurücksetzen</button>
                  </div>
                  <textarea
                    value={systemPrompt}
                    onChange={e => updateSystemPrompt(e.target.value)}
                    rows={8}
                    style={{
                      width: '100%', padding: '8px', borderRadius: 6, fontSize: 11, lineHeight: 1.5,
                      border: '0.5px solid var(--border-md)', background: 'var(--bg)',
                      color: 'var(--fg)', fontFamily: 'var(--font-mono)', outline: 'none', resize: 'vertical',
                    }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)' }}>System-Prompt (OCR-Bereinigung)</div>
                    <button onClick={resetOcrFixPrompt} style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 4,
                      border: '0.5px solid var(--border-faint)', background: 'transparent',
                      color: 'var(--fg-faint)', cursor: 'pointer', fontFamily: 'inherit',
                    }}>Zurücksetzen</button>
                  </div>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer',
                    marginBottom: 6, userSelect: 'none',
                  }}>
                    <input type="checkbox" checked={ocrFixIncludeImage}
                      onChange={e => updateOcrFixIncludeImage(e.target.checked)} />
                    Bild im Prompt mitsenden (unterstützt Bildanalyse)
                  </label>
                  <textarea
                    value={ocrFixPrompt}
                    onChange={e => updateOcrFixPrompt(e.target.value)}
                    rows={8}
                    style={{
                      width: '100%', padding: '8px', borderRadius: 6, fontSize: 11, lineHeight: 1.5,
                      border: '0.5px solid var(--border-md)', background: 'var(--bg)',
                      color: 'var(--fg)', fontFamily: 'var(--font-mono)', outline: 'none', resize: 'vertical',
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '11px 18px', borderTop: '0.5px solid var(--border-faint)',
          background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{
            padding: '7px 20px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: 'none', background: 'var(--fg)', color: 'var(--bg)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, color: 'var(--fg)',
      marginBottom: 6, letterSpacing: '.01em',
    }}>{children}</div>
  );
}

function AddRowInput({ leftPlaceholder, rightPlaceholder, onAdd }) {
  const [l, setL] = useState('');
  const [r, setR] = useState('');
  const iStyle = {
    fontSize: 12, padding: '5px 8px', borderRadius: 6,
    border: '0.5px solid var(--border-md)', background: 'var(--bg)',
    color: 'var(--fg)', fontFamily: 'inherit', outline: 'none',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input value={l} onChange={e => setL(e.target.value)} placeholder={leftPlaceholder} style={{ ...iStyle, flex: 1 }} />
      <span style={{ color: 'var(--fg-faint)', flexShrink: 0 }}>→</span>
      <input value={r} onChange={e => setR(e.target.value)} placeholder={rightPlaceholder} style={{ ...iStyle, width: 130 }} />
      <Btn size="sm" onClick={() => { onAdd(l, r); setL(''); setR(''); }}>+</Btn>
    </div>
  );
}

function AddSingleInput({ placeholder, onAdd }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        value={val} onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }}
        style={{
          fontSize: 12, padding: '5px 8px', borderRadius: 6,
          border: '0.5px solid var(--border-md)', background: 'var(--bg)',
          color: 'var(--fg)', fontFamily: 'inherit', outline: 'none', flex: 1,
        }}
      />
      <Btn size="sm" onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }}>+</Btn>
    </div>
  );
}
