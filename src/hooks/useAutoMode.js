import { useState, useEffect, useCallback, useRef } from 'react';
import { runAutoMode, abortRunner, getRunner } from '../services/autoModeService';

export function useAutoMode(sessionId, pipelineState, llmSettings) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [llmError, setLlmError] = useState(null);
  const pipeRef = useRef(pipelineState);

  useEffect(() => { pipeRef.current = pipelineState; }, [pipelineState]);

  useEffect(() => {
    if (!sessionId) return;
    const tid = setInterval(() => {
      const runner = getRunner(sessionId);
      if (runner) {
        const alive = runner.running && !runner.aborted;
        setRunning(alive);
        const labels = ['OCR', 'Entitäten', 'Musixplora', 'Normdaten', 'Fertig'];
        setStep(labels[runner.stepIdx] || '');
        setProgress(runner.stepIdx >= 4 ? 100 : (runner.stepIdx * 25 + (runner.subPct || 0) * 0.25));
        if (runner.error) setError(runner.error);
        if (runner.llmError && !runner.waitingForUser) setLlmError(null);
        if (runner.waitingForUser && runner.llmError) setLlmError(runner.llmError);
      }
    }, 600);
    return () => clearInterval(tid);
  }, [sessionId]);

  const start = useCallback(async () => {
    if (!sessionId) return;
    const sessions = JSON.parse(localStorage.getItem('poster_pipeline_sessions') || '[]');
    const session = sessions.find(s => s.id === sessionId);
    if (!session?.data) return;

    setRunning(true); setProgress(0); setStep('OCR'); setError(null); setDone(false); setLlmError(null);

    const updateSession = (patch) => {
      const all = JSON.parse(localStorage.getItem('poster_pipeline_sessions') || '[]');
      const idx = all.findIndex(s => s.id === sessionId);
      if (idx === -1) return;

      // Capture current React state so nothing gets lost
      const currentState = pipeRef.current.serializePipeline();

      // Apply top-level patch fields (autoModeProgress, autoModeStep, etc.)
      Object.assign(all[idx], patch);

      // Merge data: existing + current React state + explicit patch.data
      if (all[idx].data) {
        all[idx].data = { ...all[idx].data, ...currentState, ...(patch.data || {}) };
      } else if (patch.data) {
        all[idx].data = { ...currentState, ...patch.data };
      }

      // Auto-compute stepDone from data.step
      if (all[idx].data?.step !== undefined) {
        const newStep = all[idx].data.step;
        const sd = [false, false, false, false, false];
        for (let i = 0; i < newStep; i++) sd[i] = true;
        all[idx].data.stepDone = sd;
      }

      localStorage.setItem('poster_pipeline_sessions', JSON.stringify(all));
      if (all[idx]?.data) pipeRef.current.restorePipeline(all[idx].data);
    };

    try {
      await runAutoMode({
        sessionId,
        updateSession,
        llmSettings,
        pipeline: pipeRef.current,
        imagePreview: session.data.imagePreview,
      });

      setRunning(false); setDone(true); setProgress(100); setStep('Fertig');
      updateSession({ autoModeDone: true, autoModeProgress: 100, autoModeStep: 'Fertig' });
    } catch (err) {
      setRunning(false); setError(err.message);
      updateSession({ autoModeError: err.message });
    }
  }, [sessionId, llmSettings]);

  const abort = useCallback(() => {
    if (sessionId) abortRunner(sessionId);
    setRunning(false); setLlmError(null);
  }, [sessionId]);

  const retry = useCallback(() => {
    if (!sessionId) return;
    const runner = getRunner(sessionId);
    if (runner?.resolveRetry) { runner.resolveRetry(); runner.resolveRetry = null; }
    setLlmError(null);
  }, [sessionId]);

  return { progress, step, running, error, done, llmError, start, abort, retry };
}
