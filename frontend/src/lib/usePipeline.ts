import { useCallback, useEffect, useState } from 'react';
import { fetchPipeline } from './api';
import type { PipelinePayload } from './types';

interface State {
  data: PipelinePayload | null;
  loading: boolean;
  error: string | null;
}

/** Loads the dataset once and exposes a manual refresh. */
export function usePipeline() {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  const load = useCallback((signal?: AbortSignal) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchPipeline(signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setState({
          data: null, loading: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  return { ...state, refresh: () => load() };
}
