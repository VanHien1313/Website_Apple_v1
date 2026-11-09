import { useCallback, useEffect, useState } from 'react';

/** Supply a stable loader. Aborted or superseded requests cannot publish results. */
export function useAsyncResource<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{
    loader: typeof loader; data?: T; loading: boolean; error: Error | null;
  }>({ loader, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loader, loading: true, error: null });
    Promise.resolve().then(() => loader(controller.signal)).then(
      (data) => {
        if (!controller.signal.aborted) setState({ loader, data, loading: false, error: null });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ loader, loading: false, error: error instanceof Error ? error : new Error('Không tải được dữ liệu') });
      },
    );
    return () => controller.abort();
  }, [loader, attempt]);
  const current = state.loader === loader ? state : { data: undefined, loading: true, error: null };
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...current, retry };
}
