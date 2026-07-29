import React, { useMemo, useState } from 'react';
import { Card, CardHeader, Btn, Badge, Divider, SectionLabel, EntityTag } from './ui';
import { TYPE_COLORS } from '../data/initialState';

const SOURCE_CFG = {
  GND:      { bg: '#E6F1FB', color: '#185FA5' },
  VIAF:     { bg: '#E1F5EE', color: '#085041' },
  Wikidata: { bg: '#EEEDFE', color: '#3C3489' },
};

function SourceBadge({ source, small }) {
  const c = SOURCE_CFG[source] || { bg: '#F1EFE8', color: '#444441' };
  return (
    <span style={{ fontSize: small ? 10 : 11, padding: small ? '1px 5px' : '2px 7px', borderRadius: 10, fontWeight: 600, background: c.bg, color: c.color }}>
      {source}
    </span>
  );
}

export default function StepReview({
  entities, matches, normResults,
  ocrText, ocrMode, imageFile,
  goBack,
}) {
  const matchedNorm = useMemo(() =>
    entities.filter(e => normResults[e.id]?.selected).length,
  [entities, normResults]);

  const mxMatched = useMemo(() =>
    Object.values(matches).filter(m => m.status === 'matched' && m.selected !== null).length,
  [matches]);

  const mxNoMatch = useMemo(() =>
    Object.values(matches).filter(m => m.status === 'no_match').length,
  [matches]);

  const [exportFormat, setExportFormat] = useState('json');

  const jsonOutput = useMemo(() => ({
    '@type': 'Konzertprogramm',
    ocr_mode: ocrMode,
    source_image: imageFile?.name || '',
    ocr_text: ocrText,
    entities: entities.map(e => {
      const mx  = matches[e.id];
      const nrm = normResults[e.id];
      const sel = nrm?.selected;
      return {
        text:          e.text,
        type:          e.type,
        alias:         e.alias || null,
        musixplora_id: mx?.selected != null && mx.results?.[mx.selected] ? mx.results[mx.selected].id : null,
        musixplora_name: mx?.selected != null && mx.results?.[mx.selected] ? mx.results[mx.selected].name : null,
        norm_id:       sel ? (sel.source === 'GND' ? `GND_${sel.id}` : sel.id) : null,
        norm_source:   sel?.source ?? null,
        norm_name:     sel?.name ?? null,
        norm_birth:    sel?.birth ?? null,
        norm_death:    sel?.death ?? null,
      };
    }),
  }), [entities, matches, normResults, ocrMode, imageFile, ocrText]);

  function downloadJson() {
    const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'konzert_entities.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadMusXplora() {
    const blob = new Blob([musxploraOutput], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'konzert_musxplora.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  const musxploraOutput = useMemo(() => {
    const blocks = [];
    entities.forEach(e => {
      if (e.type !== 'person') return;
      const mx = matches[e.id];
      const nrm = normResults[e.id];
      const selMx = mx?.selected != null && mx.results?.[mx.selected] ? mx.results[mx.selected] : null;
      const selNrm = nrm?.selected;

      const fullName = e.alias || e.text;
      let surname = '', givenName = '';
      if (fullName.includes(',')) {
        const parts = fullName.split(',').map(s => s.trim());
        surname = parts[0];
        givenName = parts[1] || '';
      } else {
        const parts = fullName.trim().split(/\s+/);
        surname = parts.pop() || '';
        givenName = parts.join(' ');
      }

      const birth = selNrm?.birth || selMx?.detail?.birth || '';
      const death = selNrm?.death || selMx?.detail?.death || '';
      const birthPlace = selNrm?.birthPlace || '';
      const deathPlace = selNrm?.deathPlace || '';
      const gender = selNrm?.gender || selMx?.detail?.gender || '';
      const mainPlace = selMx?.detail?.mainPlace?.join(', ') || '';
      const places = selMx?.detail?.places?.join(', ') || '';
      const occupations = selNrm?.occupations?.join(', ') || selMx?.detail?.occupations?.join(', ') || '';
      const mainJobs = selMx?.detail?.mainJobs?.join(', ') || '';
      const mxId = selMx?.id || '';

      const concordances = [];
      if (selNrm) {
        if (selNrm.source === 'GND' && selNrm.id) concordances.push(`GND: ${selNrm.id}`);
        if (selNrm.viafId) concordances.push(`VIAF: ${selNrm.viafId}`);
        if (selNrm.wikidataLink) concordances.push(`Wikidata: ${selNrm.wikidataLink}`);
      }
      if (selMx?.detail?.externalIds) {
        const ext = selMx.detail.externalIds;
        if (ext.GND && !concordances.some(c => c.startsWith('GND:'))) concordances.push(`GND: ${ext.GND}`);
        if (ext.VIAF && !concordances.some(c => c.startsWith('VIAF:'))) concordances.push(`VIAF: ${ext.VIAF}`);
      }

      const today = new Date().toISOString().split('T')[0];

      const block = [
        `11# ${surname}`,
        `12# ${givenName}`,
        `13# ${birth}`,
        `14# ${death}`,
        `15# ${birthPlace}`,
        `16# ${deathPlace}`,
        '17# ',
        '18# ',
        '23# ',
        `24# ${gender}`,
        `30# ${mainPlace}`,
        `31# ${places}`,
        '33# ',
        `34# ${occupations}`,
        `35# ${mainJobs}`,
        '36# ',
        '39# ',
        `40# ${today}`,
        `41# ${mxId}`,
        '43# ',
        `45# ${concordances.join('; ')}`,
        '89# ',
      ];
      blocks.push(block.join('\n'));
    });
    return blocks.join('\n\n');
  }, [entities, matches, normResults]);

  return (
    <Card>
      <CardHeader
        left="Schritt 5 — Export"
        right={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Badge color="green">{mxMatched} Musixplora</Badge>
            <Badge color="red">{mxNoMatch} kein Treffer</Badge>
            {matchedNorm > 0 && <Badge color="purple">{matchedNorm} Normdaten</Badge>}
          </div>
        }
      />

      <div style={{ padding: 20 }}>
        {/* Summary */}
        <SectionLabel>Pipeline-Übersicht</SectionLabel>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <SummaryBox label="OCR" value={ocrText ? `${ocrText.slice(0, 60)}…` : '—'} color="#185FA5" />
          <SummaryBox label="Entitäten" value={`${entities.length} erkannt`} color="#633806" />
          <SummaryBox label="Musixplora" value={`${mxMatched} zugeordnet, ${mxNoMatch} ohne Treffer`} color="#085041" />
          <SummaryBox label="Normdaten" value={matchedNorm > 0 ? `${matchedNorm} zugeordnet` : 'keine'} color="#3C3489" />
        </div>

        <Divider />

        {/* Per-entity review table */}
        <SectionLabel>Entitäten im Detail</SectionLabel>
        <div style={{ marginBottom: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border-faint)' }}>
                <Th>Entität</Th>
                <Th>Typ</Th>
                <Th>Musixplora</Th>
                <Th>Normdaten</Th>
              </tr>
            </thead>
            <tbody>
              {entities.map(e => {
                const mx  = matches[e.id];
                const selMx = mx?.selected != null && mx.results?.[mx.selected] ? mx.results[mx.selected] : null;
                const nrm = normResults[e.id];
                const selNrm = nrm?.selected;
                return (
                  <tr key={e.id} style={{ borderBottom: '0.5px solid var(--border-faint)' }}>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>{e.alias || e.text}</span>
                        {e.isComposer && (
                          <span style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 6,
                            background: '#1D9E7522', color: '#1D9E75',
                            border: '0.5px solid #1D9E7544',
                          }}>♪</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <EntityTag type={e.type} label={{ person: 'Person', group: 'Institut', place: 'Ort', event: 'Ereignis', time: 'Zeit', other: 'Sache' }[e.type] || e.type} />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      {selMx
                        ? <span style={{ color: '#085041' }}>✓ {selMx.name} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-faint)' }}>{selMx.id}</span></span>
                        : mx?.status === 'no_match'
                          ? <span style={{ color: '#A32D2D' }}>kein Treffer</span>
                          : <span style={{ color: 'var(--fg-faint)' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      {selNrm
                        ? <span style={{ color: '#3C3489' }}>
                            ✓ {selNrm.name}
                            <span style={{ marginLeft: 4 }}><SourceBadge source={selNrm.source} small /></span>
                          </span>
                        : nrm?.status === 'done' && !selNrm
                          ? <span style={{ color: 'var(--fg-faint)' }}>{nrm.results.length} Kandidaten</span>
                          : <span style={{ color: 'var(--fg-faint)' }}>—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Divider />

        {/* Export output */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <SectionLabel>Export</SectionLabel>
            <TabBtn active={exportFormat === 'json'} onClick={() => setExportFormat('json')}>JSON</TabBtn>
            <TabBtn active={exportFormat === 'musxplora'} onClick={() => setExportFormat('musxplora')}>musXplora</TabBtn>
          </div>
          <button onClick={exportFormat === 'json' ? downloadJson : downloadMusXplora} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '0.5px solid var(--border-md)', background: 'var(--bg-secondary)', color: 'var(--fg)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            ↓ {exportFormat === 'json' ? 'JSON' : 'musXplora'} exportieren
          </button>
        </div>
        {exportFormat === 'json' ? (
          <JsonViewer data={jsonOutput} />
        ) : (
          <div>
            {musxploraOutput ? (
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-secondary)', border: '0.5px solid var(--border-faint)', borderRadius: 8, padding: 14, overflow: 'auto', maxHeight: 320, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {musxploraOutput}
              </pre>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-faint)', fontStyle: 'italic' }}>
                Keine Person-Entitäten für musXplora-Export vorhanden.
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--border-faint)' }}>
          <Btn onClick={goBack}>← Normdaten</Btn>
          <Btn variant="primary" onClick={exportFormat === 'json' ? downloadJson : downloadMusXplora}>
            ↓ {exportFormat === 'json' ? 'JSON' : 'musXplora'} exportieren
          </Btn>
        </div>
      </div>
    </Card>
  );
}

function SummaryBox({ label, value, color }) {
  return (
    <div style={{
      flex: '1 0 160px', padding: '10px 14px', borderRadius: 9,
      border: `0.5px solid ${color}33`, background: `${color}08`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{value}</div>
    </div>
  );
}

function Th({ children }) {
  return <th style={{ padding: '6px 6px', fontSize: 10, fontWeight: 600, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'left', whiteSpace: 'nowrap' }}>{children}</th>;
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 11, padding: '4px 10px', borderRadius: 6,
      border: '0.5px solid var(--border-md)',
      background: active ? '#185FA522' : 'transparent',
      color: active ? '#185FA5' : 'var(--fg-faint)',
      cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 600 : 400,
    }}>
      {children}
    </button>
  );
}

function JsonViewer({ data }) {
  function colorize(obj, indent = 0) {
    const pad  = '  '.repeat(indent);
    const pad1 = '  '.repeat(indent + 1);
    if (Array.isArray(obj)) {
      if (!obj.length) return <span>{'[]'}</span>;
      return <>{`[\n`}{obj.map((v, i) => <span key={i}>{pad1}{colorize(v, indent+1)}{i<obj.length-1?',':''}{`\n`}</span>)}{pad}{`]`}</>;
    }
    if (obj === null) return <span style={{ color: '#993556' }}>null</span>;
    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      return <>{`{\n`}{entries.map(([k,v],i) => <span key={k}>{pad1}<span style={{color:'#185FA5'}}>"{k}"</span>{`: `}{colorize(v,indent+1)}{i<entries.length-1?',':''}{`\n`}</span>)}{pad}{`}`}</>;
    }
    if (typeof obj === 'string') return <span style={{ color: '#3B6D11' }}>"{obj}"</span>;
    if (typeof obj === 'number') return <span style={{ color: '#BA7517' }}>{obj}</span>;
    return <span>{String(obj)}</span>;
  }
  return (
    <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-secondary)', border: '0.5px solid var(--border-faint)', borderRadius: 8, padding: 14, overflow: 'auto', maxHeight: 320, lineHeight: 1.7, margin: 0 }}>
      {colorize(data)}
    </pre>
  );
}
