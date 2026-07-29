import React, { useRef, useState, useEffect } from 'react';
import { Btn, Badge } from './ui';
import { OCR_LANGUAGES } from '../data/languages';

// ─── OCR progress steps ───────────────────────────────────────────────────────
const OCR_STAGES = [
  { id: 'load', label: 'Bild & OCR-Kern laden' },
  { id: 'init', label: 'OCR-Engine initialisieren' },
  { id: 'ocr',  label: 'Zeichenerkennung (OCR)' },
  { id: 'post', label: 'Ergebnis aufbereiten' },
];

// ─── Image pane with pan + zoom ───────────────────────────────────────────────
function ImagePane({ imagePreview, imageName, onReplace, ocrRunning, stageIdx, progress }) {
  const containerRef = useRef();
  const [scale, setScale]     = useState(1);
  const [offset, setOffset]   = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  function handleWheel(e) {
    e.preventDefault();
    setScale(s => Math.max(0.3, Math.min(5, s - e.deltaY * 0.001)));
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }

  function handleMouseMove(e) {
    if (!dragging || !dragStart.current) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }

  function handleMouseUp() { setDragging(false); }

  function resetView() { setScale(1); setOffset({ x: 0, y: 0 }); }
  function zoomIn()    { setScale(s => Math.min(5, +(s + 0.25).toFixed(2))); }
  function zoomOut()   { setScale(s => Math.max(0.3, +(s - 0.25).toFixed(2))); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Image toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
        borderBottom: '0.5px solid var(--border-faint)',
        background: 'var(--bg-secondary)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em', flex: 1 }}>
          Bild
        </span>
        <button onClick={zoomOut} title="Verkleinern" style={iconBtn}>−</button>
        <span style={{ fontSize: 11, color: 'var(--fg-muted)', minWidth: 36, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(scale * 100)}%
        </span>
        <button onClick={zoomIn} title="Vergrößern" style={iconBtn}>+</button>
        <button onClick={resetView} title="Ansicht zurücksetzen" style={{ ...iconBtn, fontSize: 12 }}>⊡</button>
        <div style={{ width: '0.5px', height: 16, background: 'var(--border-faint)', margin: '0 2px' }} />
        <button
          onClick={onReplace}
          style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: '0.5px solid var(--border-md)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ↺ Bild ändern
        </button>
      </div>

      {/* Image canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1, overflow: 'hidden', position: 'relative',
          cursor: dragging ? 'grabbing' : 'grab',
          background: 'repeating-conic-gradient(var(--bg-secondary) 0% 25%, var(--bg) 0% 50%) 0 0 / 16px 16px',
          userSelect: 'none',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <img
            src={imagePreview}
            alt="Konzertposter"
            draggable={false}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              maxWidth: '90%', maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: 2,
              boxShadow: '0 4px 24px rgba(0,0,0,.2)',
              transition: dragging ? 'none' : 'transform .05s',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* OCR progress overlay */}
        {ocrRunning && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,.55)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16, padding: 24,
          }}>
            {/* Scan line animation */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 0, pointerEvents: 'none' }}>
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, #60d0a0, transparent)',
                animation: 'scanline 1.4s linear infinite',
                opacity: .8,
              }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              {/* Progress circle */}
              <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 14px' }}>
                <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="4" />
                  <circle cx="36" cy="36" r="30" fill="none" stroke="#60d0a0" strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset .3s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums',
                }}>
                  {progress}%
                </div>
              </div>

              {/* Stage list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start', minWidth: 220 }}>
                {OCR_STAGES.map((stage, i) => {
                  const isDone    = i < stageIdx;
                  const isActive  = i === stageIdx;
                  const isInitDownload = isActive && stage.id === 'init' && progress > 0 && progress < 100;
                  const isOcrProgress  = isActive && stage.id === 'ocr' && progress > 0 && progress < 100;
                  return (
                    <div key={stage.id} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                      opacity: isDone ? .5 : isActive ? 1 : .3,
                      transition: 'opacity .3s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isDone ? '#1D9E75' : isActive ? '#60d0a0' : 'rgba(255,255,255,.2)',
                          fontSize: 9, fontWeight: 700, color: '#fff',
                          transition: 'background .3s',
                        }}>
                          {isDone ? '✓' : isActive ? '⟳' : ''}
                        </div>
                        <span style={{ fontSize: 12, color: '#fff', fontWeight: isActive ? 500 : 400 }}>
                          {stage.label}
                        </span>
                      </div>
                      {isInitDownload && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginLeft: 24 }}>
                          Sprachdaten {progress}%
                        </span>
                      )}
                      {isOcrProgress && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginLeft: 24 }}>
                          {progress}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filename strip */}
      <div style={{
        padding: '6px 14px', borderTop: '0.5px solid var(--border-faint)',
        background: 'var(--bg-secondary)', fontSize: 11, color: 'var(--fg-faint)',
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imageName || 'Unbekannte Datei'}</span>
        <span>Scroll zum Zoomen · Ziehen zum Verschieben</span>
      </div>
    </div>
  );
}

const iconBtn = {
  width: 26, height: 26, borderRadius: 5, border: '0.5px solid var(--border-faint)',
  background: 'var(--bg)', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--fg-muted)', padding: 0,
};

// ─── OCR text pane ────────────────────────────────────────────────────────────
function TextPane({ ocrText, setOcrText, ocrRunning, stepDone, onFixOcr, fixingOcr }) {
  const [lineCount, setLineCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setLineCount(ocrText ? ocrText.split('\n').length : 0);
    setCharCount(ocrText ? ocrText.length : 0);
  }, [ocrText]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        borderBottom: '0.5px solid var(--border-faint)',
        background: 'var(--bg-secondary)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em', flex: 1 }}>
          Erkannter Text
        </span>
        {stepDone[0] && !ocrRunning && (
          <span style={{ fontSize: 11, color: '#1D9E75' }}>✓ Erkannt</span>
        )}
        {ocrText && !ocrRunning && (
          <button onClick={onFixOcr} disabled={fixingOcr} style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 5,
            border: '0.5px solid var(--border-md)', background: '#185FA511',
            color: fixingOcr ? 'var(--fg-faint)' : '#185FA5',
            cursor: fixingOcr ? 'wait' : 'pointer', fontFamily: 'inherit',
          }}>
            {fixingOcr ? '⟳ KI bereinigt …' : 'Mit KI bereinigen'}
          </button>
        )}
        {ocrText && (
          <span style={{ fontSize: 11, color: 'var(--fg-faint)', fontVariantNumeric: 'tabular-nums' }}>
            {lineCount} Zeilen · {charCount} Zeichen
          </span>
        )}
      </div>

      {/* Text area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {ocrRunning ? (
          // Skeleton shimmer while running
          <div style={{ padding: '14px 16px', height: '100%' }}>
            {[...Array(14)].map((_, i) => (
              <div key={i} style={{
                height: 14, marginBottom: 10, borderRadius: 3,
                background: 'var(--bg-secondary)',
                width: `${55 + Math.sin(i * 1.7) * 35}%`,
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.07}s`,
              }} />
            ))}
          </div>
        ) : (
          <textarea
            value={ocrText}
            onChange={e => setOcrText(e.target.value)}
            placeholder="Noch kein Text erkannt. OCR starten oder Text manuell eingeben…"
            style={{
              width: '100%', height: '100%',
              fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.8,
              padding: '14px 16px',
              border: 'none', outline: 'none', resize: 'none',
              background: 'transparent', color: 'var(--fg)',
            }}
          />
        )}
      </div>

      {/* Status strip */}
      <div style={{
        padding: '6px 14px', borderTop: '0.5px solid var(--border-faint)',
        background: 'var(--bg-secondary)', fontSize: 11, color: 'var(--fg-faint)',
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        {ocrRunning
          ? <span style={{ color: '#60d0a0', animation: 'pulse 1s infinite' }}>⟳ OCR läuft …</span>
          : <span>Text ist bearbeitbar — direkt im Feld korrigieren</span>
        }
      </div>
    </div>
  );
}

// ─── Upload zone (shown when no image) ───────────────────────────────────────
function UploadZone({ onFile, inputRef }) {
  const [hover, setHover] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
    setHover(false);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onClick={() => inputRef.current.click()}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        border: `1.5px dashed ${hover ? 'var(--fg-muted)' : 'var(--border-md)'}`,
        borderRadius: 10, margin: 20, padding: 40,
        cursor: 'pointer', transition: 'all .15s',
        background: hover ? 'var(--bg)' : 'var(--bg-secondary)',
      }}
    >
      <div style={{ fontSize: 40, opacity: hover ? .7 : .3, transition: 'opacity .15s' }}>🎼</div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 4 }}>
          Konzertposter hier ablegen
        </p>
        <p style={{ fontSize: 12, color: 'var(--fg-faint)' }}>
          oder klicken zum Auswählen · JPG · PNG · TIFF · PDF
        </p>
      </div>
      <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
    </div>
  );
}

const ppLabel = {
  fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3,
  cursor: 'pointer', color: 'var(--fg-muted)', userSelect: 'none',
};
const ppLabelSmall = { fontSize: 11, color: 'var(--fg-muted)', marginRight: 2 };
const ppSelect = {
  padding: '2px 6px', borderRadius: 4, fontSize: 11,
  border: '0.5px solid var(--border-faint)',
  background: 'var(--bg)', color: 'var(--fg-muted)', fontFamily: 'inherit',
};

// ─── Main StepOCR ─────────────────────────────────────────────────────────────
import { callLLM } from '../services/llmService';
import {
  previewPreprocessing, applyPreprocessing,
  DEFAULT_PREPROCESS_OPTIONS
} from '../services/imagePreprocessing';

export default function StepOCR({
  imageFile, setImageFile, imagePreview, setImagePreview,
  preprocessedBlob, setPreprocessedBlob,
  ocrMode, setOcrMode, ocrText, setOcrText,
  ocrRunning, runOcr, ocrAbort, stageIdx, progress, stepDone, advance,
  downloadedLangs, llmSettings, onAiError,
}) {
  const inputRef = useRef();
  const [fixingOcr, setFixingOcr] = useState(false);
  const [preprocessOpen, setPreprocessOpen] = useState(false);
  const [preprocessOpts, setPreprocessOpts] = useState(DEFAULT_PREPROCESS_OPTIONS);
  const [preprocessPreview, setPreprocessPreview] = useState(null);
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  async function handleFixOcr() {
    if (!ocrText || fixingOcr) return;
    setFixingOcr(true);
    try {
      const imageData = llmSettings.ocrFixIncludeImage && (preprocessPreview || imagePreview)
        ? (preprocessPreview || imagePreview)
        : undefined;
      const cleaned = await callLLM({
        provider:     llmSettings.provider,
        apiKey:       llmSettings.currentKey,
        model:        llmSettings.model,
        systemPrompt: llmSettings.ocrFixPrompt,
        userMessage:  ocrText,
        baseUrl:      llmSettings.ollamaBaseUrl,
        imageData,
      });
      if (cleaned) setOcrText(cleaned);
    } catch (err) {
      if (onAiError) onAiError({ message: err.message, source: 'OCR-Bereinigung' });
    } finally {
      setFixingOcr(false);
    }
  }

  // ─── Preprocessing ────────────────────────────────────────────────────
  const hasActivePreprocessing = preprocessOpts.grayscale ||
    preprocessOpts.binarize !== 'none' || preprocessOpts.denoise ||
    preprocessOpts.contrast || preprocessOpts.sharpen || preprocessOpts.invert;

  async function regeneratePreview() {
    if (!imagePreview || !hasActivePreprocessing) {
      setPreprocessPreview(null);
      setShowEnhanced(false);
      return;
    }
    setGeneratingPreview(true);
    try {
      const { canvas } = await previewPreprocessing(imagePreview, preprocessOpts);
      setPreprocessPreview(canvas.toDataURL());
    } catch (err) {
      console.error('Preprocessing preview failed:', err);
    } finally {
      setGeneratingPreview(false);
    }
  }

  useEffect(() => {
    if (preprocessOpen && imagePreview) {
      regeneratePreview();
    }
  }, [preprocessOpen, imagePreview, preprocessOpts]);

  function updatePreprocess(changes) {
    setPreprocessOpts(prev => ({ ...prev, ...changes }));
  }

  function togglePreprocess() {
    const next = !preprocessOpen;
    setPreprocessOpen(next);
    if (next && hasActivePreprocessing && imagePreview) {
      regeneratePreview();
    }
    if (!next) {
      setShowEnhanced(false);
    }
  }

  async function handleOcrWithPreprocessing() {
    if (hasActivePreprocessing && imagePreview) {
      try {
        const blob = await applyPreprocessing(imagePreview, preprocessOpts);
        setPreprocessedBlob(blob);
        runOcr(blob);
      } catch (err) {
        console.error('Preprocessing failed, running OCR on original:', err);
        setPreprocessedBlob(null);
        runOcr();
      }
    } else {
      setPreprocessedBlob(null);
      runOcr();
    }
  }

  function handleFile(file) {
    if (!file) return;
    setPreprocessOpts(DEFAULT_PREPROCESS_OPTIONS);
    setPreprocessPreview(null);
    setShowEnhanced(false);
    setPreprocessedBlob(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border-faint)', borderRadius: 12, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '11px 16px', borderBottom: '0.5px solid var(--border-faint)',
        background: 'var(--bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Schritt 1 — Bildimport & OCR</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Preprocessing toggle */}
          {imagePreview && !ocrRunning && (
            <button
              onClick={togglePreprocess}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11,
                border: '0.5px solid var(--border-faint)',
                background: preprocessOpen ? 'var(--fg-muted)' : 'var(--bg)',
                color: preprocessOpen ? 'var(--bg)' : 'var(--fg-muted)',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all .15s',
              }}
              title="Bildvorverarbeitung"
            >
              {preprocessOpen ? '▾ Vorverarbeitung' : '▸ Vorverarbeitung'}
            </button>
          )}
          {/* Language select */}
          <select
            value={ocrMode}
            onChange={e => setOcrMode(e.target.value)}
            disabled={ocrRunning}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, border: '0.5px solid var(--border-faint)',
              background: 'var(--bg)', color: 'var(--fg)', cursor: ocrRunning ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontWeight: 400, opacity: ocrRunning ? .6 : 1,
            }}
          >
            {(() => {
              const downloaded = Array.isArray(downloadedLangs) ? downloadedLangs : [];
              const downloadedSet = new Set(downloaded);
              let first, second;

              if (downloadedSet.size > 0) {
                first = OCR_LANGUAGES.filter(l => downloadedSet.has(l.code));
                second = OCR_LANGUAGES.filter(l => !downloadedSet.has(l.code));
              } else {
                first = OCR_LANGUAGES.filter(l => l.default);
                second = OCR_LANGUAGES.filter(l => !l.default);
              }

              return (
                <>
                  {first.length > 0 && (
                    <optgroup label={downloadedSet.size > 0 ? 'Bereits geladen' : 'Empfohlen'}>
                      {first.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </optgroup>
                  )}
                  {second.length > 0 && (
                    <optgroup label="Weitere Sprachen">
                      {second.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </optgroup>
                  )}
                </>
              );
            })()}
          </select>

          {/* OCR button + Abort */}
          {imagePreview && !ocrRunning && (
            <button
              onClick={handleOcrWithPreprocessing}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: 'var(--fg)', color: 'var(--bg)',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all .15s',
              }}
            >
              {stepDone[0] ? '↺ OCR wiederholen' : '▶ OCR starten'}
            </button>
          )}
          {imagePreview && ocrRunning && (
            <button
              onClick={ocrAbort}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid #e74c3c', cursor: 'pointer',
                background: 'transparent', color: '#e74c3c',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all .15s',
              }}
            >
              ✕ OCR abbrechen
            </button>
          )}
        </div>
      </div>

      {/* Preprocessing panel */}
      {preprocessOpen && imagePreview && (
        <div style={{
          padding: '10px 16px', borderBottom: '0.5px solid var(--border-faint)',
          background: 'var(--bg)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {/* Grayscale */}
            <label style={ppLabel}>
              <input type="checkbox" checked={preprocessOpts.grayscale}
                onChange={e => updatePreprocess({ grayscale: e.target.checked })} />
              Graustufen
            </label>

            {/* Binarize */}
            <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <label style={ppLabelSmall}>Binarisierung</label>
              <select value={preprocessOpts.binarize}
                onChange={e => updatePreprocess({ binarize: e.target.value })}
                style={ppSelect}>
                <option value="none">Aus</option>
                <option value="otsu">Otsu</option>
                <option value="adaptive">Adaptiv</option>
              </select>
            </span>

            {/* Denoise */}
            <label style={ppLabel}>
              <input type="checkbox" checked={preprocessOpts.denoise}
                onChange={e => updatePreprocess({ denoise: e.target.checked })} />
              Entrauschen
            </label>

            {/* Contrast */}
            <label style={ppLabel}>
              <input type="checkbox" checked={preprocessOpts.contrast}
                onChange={e => updatePreprocess({ contrast: e.target.checked })} />
              Kontrast
            </label>

            {/* Sharpen */}
            <label style={ppLabel}>
              <input type="checkbox" checked={preprocessOpts.sharpen}
                onChange={e => updatePreprocess({ sharpen: e.target.checked })} />
              Schärfen
            </label>

            {/* Invert */}
            <label style={ppLabel}>
              <input type="checkbox" checked={preprocessOpts.invert}
                onChange={e => updatePreprocess({ invert: e.target.checked })} />
              Invertieren
            </label>

            {/* Preview toggle */}
            {preprocessPreview && (
              <button onClick={() => setShowEnhanced(v => !v)} style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11,
                border: '0.5px solid var(--border-md)', cursor: 'pointer',
                background: showEnhanced ? 'var(--fg-muted)' : 'transparent',
                color: showEnhanced ? 'var(--bg)' : 'var(--fg-muted)',
                fontFamily: 'inherit',
              }}>
                {showEnhanced ? 'Original' : 'Vorschau'}
              </button>
            )}
            {generatingPreview && (
              <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>⟳ Vorschau …</span>
            )}
          </div>
        </div>
      )}

      {/* Split pane */}
      <div style={{ display: 'grid', gridTemplateColumns: imagePreview ? '1fr 1fr' : '1fr', minHeight: 560 }}>

          {/* LEFT — image */}
        {imagePreview ? (
          <div style={{ borderRight: '0.5px solid var(--border-faint)', display: 'flex', flexDirection: 'column' }}>
            <ImagePane
              imagePreview={showEnhanced && preprocessPreview ? preprocessPreview : imagePreview}
              imageName={
                showEnhanced && preprocessPreview
                  ? (imageFile?.name || '') + ' (vorverarbeitet)'
                  : imageFile?.name
              }
              onReplace={() => {
                setImageFile(null); setImagePreview(null);
                setPreprocessOpts(DEFAULT_PREPROCESS_OPTIONS);
                setPreprocessPreview(null);
                setShowEnhanced(false);
                setPreprocessedBlob(null);
              }}
              ocrRunning={ocrRunning}
              stageIdx={stageIdx}
              progress={progress}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <UploadZone onFile={handleFile} inputRef={inputRef} />
          </div>
        )}

        {/* RIGHT — OCR text (only shown when image is loaded) */}
        {imagePreview && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <TextPane
              ocrText={ocrText}
              setOcrText={setOcrText}
              ocrRunning={ocrRunning}
              stepDone={stepDone}
              onFixOcr={handleFixOcr}
              fixingOcr={fixingOcr}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '11px 16px', borderTop: '0.5px solid var(--border-faint)',
        background: 'var(--bg-secondary)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {!imagePreview && 'Bild hochladen um fortzufahren'}
          {imagePreview && !stepDone[0] && !ocrRunning && (
            hasActivePreprocessing
              ? 'Vorverarbeitet — OCR starten oder Text manuell eingeben'
              : 'OCR starten oder Text manuell eingeben'
          )}
          {ocrRunning && <span style={{ color: '#60d0a0', animation: 'pulse 1s infinite' }}>OCR läuft — {progress}% abgeschlossen</span>}
          {stepDone[0] && !ocrRunning && '✓ Text erkannt — bitte prüfen und ggf. korrigieren'}
        </span>
        <Btn variant="primary" onClick={() => advance(0)} disabled={!imagePreview}>
          Weiter zu Entitäten →
        </Btn>
      </div>
    </div>
  );
}
