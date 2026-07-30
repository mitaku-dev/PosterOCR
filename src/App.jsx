import React, { useState, useEffect, useRef } from 'react';
import PipelineNav from './components/PipelineNav';
import StepOCR from './components/StepOCR';
import StepEntities from './components/StepEntities';
import StepMusixplora from './components/StepMusixplora';
import StepNormdata from './components/StepNormdata';
import StepReview from './components/StepReview';
import SettingsPanel from './components/SettingsPanel';
import FirstSetupModal from './components/FirstSetupModal';
import AutoModeErrorModal from './components/AutoModeErrorModal';
import AiErrorModal from './components/AiErrorModal';
import EntitySearchModal from './components/EntitySearchModal';
import SessionSidebar from './components/SessionSidebar';
import { usePipelineState } from './hooks/usePipelineState';
import { useLLMSettings } from './hooks/useLLMSettings';
import { useSessions } from './hooks/useSessions';
import { useAutoMode } from './hooks/useAutoMode';
import useTheme from './hooks/useTheme';

export default function App() {
  const state       = usePipelineState();
  const llmSettings = useLLMSettings();
  const sessions    = useSessions(state);
  const autoMode    = useAutoMode(sessions.activeId, state, llmSettings);
  const theme       = useTheme();
  const isWide = state.step === 0 || state.step === 1;
  const [showSettings, setShowSettings] = useState(false);
  const [showEntitySearch, setShowEntitySearch] = useState(false);
  const [showFirstSetup, setShowFirstSetup] = useState(!llmSettings.hasAnyKeys);
  const [aiError, setAiError] = useState(null);
  const autoErrorShown = useRef(null);

  useEffect(() => {
    if (autoMode.error && autoMode.error !== autoErrorShown.current && !autoMode.running) {
      autoErrorShown.current = autoMode.error;
      setAiError({ message: autoMode.error, source: 'Auto-Modus' });
    }
  }, [autoMode.error, autoMode.running]);

  const steps = [
    <StepOCR key="ocr"
      imageFile={state.imageFile} setImageFile={state.setImageFile}
      imagePreview={state.imagePreview} setImagePreview={state.setImagePreview}
      preprocessedBlob={state.preprocessedBlob} setPreprocessedBlob={state.setPreprocessedBlob}
      ocrMode={state.ocrMode} setOcrMode={state.setOcrMode}
      ocrText={state.ocrText} setOcrText={state.setOcrText}
      ocrRunning={state.ocrRunning} runOcr={state.runOcr} ocrAbort={state.ocrAbort}
      stageIdx={state.stageIdx} progress={state.progress}
      stepDone={state.stepDone} advance={state.advance}
      downloadedLangs={state.downloadedLangs}
      llmSettings={llmSettings}
      onAiError={setAiError}
    />,
    <StepEntities key="entities"
      entities={state.entities} updateEntity={state.updateEntity}
      removeEntity={state.removeEntity} addEntity={state.addEntity}
      contextMappings={state.contextMappings} setContextMappings={state.setContextMappings}
      entityRunning={state.entityRunning}
      entityError={state.entityError}
      entityRawResponse={state.entityRawResponse}
      runEntityDetection={state.runEntityDetection}
      llmSettings={llmSettings}
      stepDone={state.stepDone} advance={state.advance}
      goBack={() => state.setStep(0)}
      ocrText={state.ocrText} setOcrText={state.setOcrText}
      onOpenSettings={() => setShowSettings(true)}
      onAiError={setAiError}
    />,
    <StepMusixplora key="musixplora"
      entities={state.entities} matches={state.matches}
      selectMatch={state.selectMatch} setMatchStatus={state.setMatchStatus}
      aliases={state.aliases} setAliases={state.setAliases}
      searchRunning={state.searchRunning} searchProgress={state.searchProgress} runMusixploraSearch={state.runMusixploraSearch}
      runFallbackSearch={state.runFallbackSearch}
      preferredJobs={state.preferredJobs}
      stepDone={state.stepDone} advance={state.advance} goBack={() => state.setStep(1)}
      ocrText={state.ocrText} llmSettings={llmSettings} onAiError={setAiError}
    />,
    <StepNormdata key="normdata"
      entities={state.entities} matches={state.matches}
      normResults={state.normResults} selectNorm={state.selectNorm}
      runNormSearch={state.runNormSearch} normRunning={state.normRunning}
      preferredJobs={state.preferredJobs}
      advance={state.advance} goBack={() => state.setStep(2)}
      ocrText={state.ocrText} llmSettings={llmSettings} onAiError={setAiError}
    />,
    <StepReview key="review"
      entities={state.entities} matches={state.matches}
      normResults={state.normResults}
      ocrText={state.ocrText} ocrMode={state.ocrMode} imageFile={state.imageFile}
      goBack={() => state.setStep(3)}
    />,
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: 'var(--font-sans)', display: 'flex' }}>
      <SessionSidebar
        open={sessions.sidebarOpen}
        onClose={() => sessions.setSidebarOpen(false)}
        sessions={sessions.sessions}
        activeId={sessions.activeId}
        onCreate={() => sessions.createSession()}
        onSave={sessions.saveCurrentSession}
        onLoad={sessions.loadSession}
        onDelete={sessions.deleteSession}
        onRename={sessions.renameSession}
      />

      {showFirstSetup && (
        <FirstSetupModal
          llmSettings={llmSettings}
          onDone={() => setShowFirstSetup(false)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          aliases={state.aliases} setAliases={state.setAliases}
          preferredJobs={state.preferredJobs} setPreferredJobs={state.setPreferredJobs}
          llmSettings={llmSettings}
          theme={theme}
          onClose={() => setShowSettings(false)}
        />
      )}

      {autoMode.llmError && (
        <AutoModeErrorModal
          error={autoMode.llmError}
          llmSettings={llmSettings}
          onRetry={autoMode.retry}
          onAbort={autoMode.abort}
        />
      )}

      {aiError && (
        <AiErrorModal error={aiError} onClose={() => setAiError(null)} />
      )}

      {showEntitySearch && (
        <EntitySearchModal onClose={() => setShowEntitySearch(false)} />
      )}

      <div style={{ flex: 1, padding: '28px 24px', overflow: 'auto', minWidth: 0 }}>
        <div style={{ maxWidth: isWide ? 1160 : 820, margin: '0 auto', transition: 'max-width .3s ease' }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <button
                onClick={() => sessions.setSidebarOpen(prev => !prev)}
                style={{
                  padding: '3px 7px', borderRadius: 6, fontSize: 13,
                  border: '0.5px solid var(--border-faint)', background: 'var(--bg-secondary)',
                  color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit',
                  lineHeight: 1, display: 'flex', alignItems: 'center',
                }}
                title="Sessions"
              >
                ☰
              </button>
              <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--fg)', margin: 0 }}>Konzertposter → JSON</h1>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--fg-muted)', border: '0.5px solid var(--border-faint)' }}>Musixplora Pipeline</span>

              {/* Auto mode button */}
              <button
                onClick={() => {
                  if (autoMode.running) { autoMode.abort(); return; }
                  sessions.saveCurrentSession();
                  autoMode.start();
                }}
                disabled={!sessions.activeId}
                style={{
                  marginLeft: 'auto', padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: autoMode.running ? '1px solid #e74c3c' : 'none',
                  background: autoMode.running ? 'transparent' : '#185FA5',
                  color: autoMode.running ? '#e74c3c' : '#fff',
                  cursor: sessions.activeId ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5,
                  opacity: sessions.activeId ? 1 : .4,
                }}
              >
                {autoMode.running ? '✕ Auto-Modus beenden' : '▶ Auto-Modus'}
              </button>

              <button
                onClick={() => setShowEntitySearch(true)}
                style={{
                  padding: '5px 11px', borderRadius: 7, fontSize: 12,
                  border: '0.5px solid var(--border-md)', background: 'transparent',
                  color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
              >
                ⌕ Suche
              </button>
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  padding: '5px 11px', borderRadius: 7, fontSize: 12,
                  border: '0.5px solid var(--border-md)', background: 'transparent',
                  color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
              >
                ⚙ Einstellungen
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>OCR · Entitätenerkennung · Datenbankabgleich · Normdaten-Export</p>

            {/* Auto mode progress bar */}
            {autoMode.running && (
              <div style={{ marginTop: 10 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#185FA5' }}>
                    Auto-Modus läuft
                  </span>
                  {autoMode.step && (
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                      — {autoMode.step}
                    </span>
                  )}
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, color: 'var(--fg-muted)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {autoMode.progress}%
                  </span>
                  <button onClick={autoMode.abort} style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 4,
                    border: '0.5px solid var(--border-faint)', background: 'transparent',
                    color: '#e74c3c', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Abbrechen
                  </button>
                </div>
                <div style={{
                  height: 4, borderRadius: 4, background: 'var(--bg-secondary)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    background: 'linear-gradient(90deg, #185FA5, #60d0a0)',
                    width: `${autoMode.progress}%`,
                    transition: 'width .5s ease',
                  }} />
                </div>
              </div>
            )}

            {/* Auto mode done message */}
            {autoMode.done && !autoMode.running && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 500 }}>
                  ✓ Auto-Modus abgeschlossen — alle Schritte durchlaufen
                </span>
              </div>
            )}

            {/* Auto mode error indicator (popup shown via aiError) */}
            {autoMode.error && !autoMode.running && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setAiError({ message: autoMode.error, source: 'Auto-Modus' })}
                  style={{ fontSize: 12, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>
                  ✕ Auto-Modus fehlgeschlagen — Details anzeigen
                </button>
              </div>
            )}
          </div>
          <PipelineNav step={state.step} stepDone={state.stepDone} onSelect={state.setStep} />
          {steps[state.step]}
        </div>
      </div>
    </div>
  );
}
