import { useCallback, useEffect, useState } from 'react';

// Loads data and exposes loading / error / reload.
export function useLoad(loader) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    loader().then((data) => setState({ loading: false, error: null, data }))
      .catch((e) => setState({ loading: false, error: e.message, data: null }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  return { ...state, reload: load };
}

// Every screen that loads data shows a loading, an error and an empty state.
export function Async({ state, empty, children }) {
  if (state.loading && !state.data) return <p className="muted">Loading…</p>;
  if (state.error) return <p className="error">Error: {state.error} <button onClick={state.reload}>Retry</button></p>;
  if (Array.isArray(state.data) && !state.data.length && empty) return <p className="muted">{empty}</p>;
  return children(state.data);
}
