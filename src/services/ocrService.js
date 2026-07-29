import { createWorker } from 'tesseract.js';

const INIT_TIMEOUT_MS = 120_000;

function withTimeout(promiseFn, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Zeitüberschreitung nach ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promiseFn(), timeout]).finally(() => clearTimeout(timer));
}

export function createOcrJob(imageFile, language, onProgress) {
  let worker = null;

  const promise = (async () => {
    worker = await withTimeout(
      () => createWorker(language, 1, {
        logger: (m) => {
          let stage;
          if (m.status === 'loading tesseract core')           stage = 'load';
          else if (m.status === 'loading language traineddata') stage = 'init';
          else if (m.status === 'initializing tesseract')      stage = 'init';
          else if (m.status === 'initializing api')            stage = 'init';
          else if (m.status === 'recognizing')                 stage = 'ocr';
          if (stage) onProgress({ stage, pct: Math.round((m.progress || 0) * 100) });
        },
      }),
      INIT_TIMEOUT_MS,
    );

    onProgress({ stage: 'ocr', pct: 0 });
    const { data: { text } } = await worker.recognize(imageFile);
    onProgress({ stage: 'post', pct: 100 });

    await worker.terminate();
    return text;
  })()
    .finally(() => {
      if (worker) worker.terminate();
    });

  return {
    promise,
    abort: () => {
      if (worker) worker.terminate();
    },
  };
}
