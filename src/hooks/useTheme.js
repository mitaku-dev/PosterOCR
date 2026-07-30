import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'posterocr-theme';

function getInitial() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === 'light' || s === 'dark') return s;
  } catch {}
  return 'system';
}

function resolve(mode) {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export default function useTheme() {
  const [mode, setMode] = useState(getInitial);

  const apply = useCallback((m) => {
    document.documentElement.setAttribute('data-theme', resolve(m));
  }, []);

  useEffect(() => {
    apply(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode, apply]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => apply('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, apply]);

  return { mode, setMode };
}
