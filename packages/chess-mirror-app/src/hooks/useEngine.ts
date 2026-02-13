import { useState, useEffect, useRef, useCallback } from 'react';

export function useEngine() {
  const workerRef = useRef<Worker | null>(null);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL('../engine/engine.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e) => {
      const { type, data } = e.data;
      if (type === 'ready') setIsReady(true);
      if (type === 'bestmove') setBestMove(data.move);
    };

    worker.postMessage({ type: 'init' });
    workerRef.current = worker;

    return () => worker.terminate();
  }, []);

  const search = useCallback((fen: string) => {
    if (workerRef.current && isReady) {
      setBestMove(null); // Reset while thinking
      workerRef.current.postMessage({ type: 'search', data: fen });
    }
  }, [isReady]);

  return { bestMove, search, isReady };
}
