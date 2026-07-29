import { useState, useCallback } from 'react';

const STORAGE_KEY = 'poster_pipeline_sessions';
const ACTIVE_KEY = 'poster_pipeline_active_session';

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function useSessions(pipelineState) {
  const [sessions, setSessions] = useState(loadSessions);
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const createSession = useCallback((name) => {
    const id = Date.now().toString(36);
    const session = {
      id,
      name: name || `Session ${sessions.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...sessions, session];
    setSessions(updated);
    setActiveId(id);
    persistSessions(updated);
    localStorage.setItem(ACTIVE_KEY, id);
    pipelineState.resetToDefaults();
  }, [sessions, pipelineState]);

  const saveCurrentSession = useCallback(() => {
    if (!activeId) return;
    const data = pipelineState.serializePipeline();
    const updated = sessions.map(s =>
      s.id === activeId ? { ...s, data, updatedAt: new Date().toISOString() } : s
    );
    setSessions(updated);
    persistSessions(updated);
  }, [activeId, sessions, pipelineState]);

  const loadSession = useCallback((id) => {
    if (id === activeId) return;
    const session = sessions.find(s => s.id === id);
    if (!session || !session.data) return;

    // Save current session before switching
    if (activeId) {
      const currentData = pipelineState.serializePipeline();
      let updated = sessions.map(s =>
        s.id === activeId ? { ...s, data: currentData, updatedAt: new Date().toISOString() } : s
      );
      updated = updated.map(s =>
        s.id === id ? { ...s, lastOpened: new Date().toISOString() } : s
      );
      setSessions(updated);
      persistSessions(updated);
    }

    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
    pipelineState.restorePipeline(session.data);
  }, [activeId, sessions, pipelineState]);

  const deleteSession = useCallback((id) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    persistSessions(updated);
    if (activeId === id) {
      setActiveId(null);
      localStorage.removeItem(ACTIVE_KEY);
      pipelineState.resetToDefaults();
    }
  }, [sessions, activeId, pipelineState]);

  const renameSession = useCallback((id, name) => {
    const updated = sessions.map(s =>
      s.id === id ? { ...s, name } : s
    );
    setSessions(updated);
    persistSessions(updated);
  }, [sessions]);

  return {
    sessions, activeId,
    sidebarOpen, setSidebarOpen,
    createSession, saveCurrentSession, loadSession, deleteSession, renameSession,
  };
}
