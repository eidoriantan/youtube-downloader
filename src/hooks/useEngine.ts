import { useEffect, useSyncExternalStore } from "react";
import { getLoadState, startLoading, subscribe } from "../lib/loader";

/** Starts preloading on mount and exposes progress. Safe under StrictMode. */
export function useEngine() {
  const state = useSyncExternalStore(subscribe, getLoadState);
  useEffect(() => {
    startLoading().catch(() => {});
  }, []);
  return { ...state, retry: () => startLoading().catch(() => {}) };
}
