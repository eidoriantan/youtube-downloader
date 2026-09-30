import { getFFmpeg } from "./ffmpeg";
import { initPyodide } from "./pyodide";
import { friendlyError } from "./errors";
import type { LoadState, LoadStep, LoadStepId, LoadStepState } from "../types";

const LABELS: Record<LoadStepId, string> = {
  runtime: "Python runtime",
  packages: "Package installer",
  ytdlp: "yt-dlp",
  ffmpeg: "ffmpeg for merging",
};

const freshSteps = (): LoadStep[] =>
  (Object.keys(LABELS) as LoadStepId[]).map((id) => ({ id, label: LABELS[id], state: "pending" }));

let state: LoadState = { steps: freshSteps(), ready: false, error: null };
const listeners = new Set<() => void>();
let promise: Promise<void> | null = null;

function set(next: LoadState) {
  state = next; // always a new object so useSyncExternalStore sees the change
  listeners.forEach((l) => l());
}

const report = (id: LoadStepId, s: LoadStepState) =>
  set({ ...state, steps: state.steps.map((step) => (step.id === id ? { ...step, state: s } : step)) });

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
export const getLoadState = (): LoadState => state;

/**
 * Loads everything the app needs up front: Pyodide, pip packages, yt-dlp and
 * ffmpeg.wasm. Idempotent; calling again after a failure retries.
 * ffmpeg is only needed to merge streams, so its failure is not fatal here;
 * it is retried when a merge is actually requested.
 */
export function startLoading(): Promise<void> {
  if (!promise) {
    set({ steps: freshSteps(), ready: false, error: null });
    const python = initPyodide(report);
    const ffmpeg = getFFmpeg(report).catch(() => {});
    promise = Promise.all([python, ffmpeg])
      .then(() => set({ ...state, ready: true }))
      .catch((e) => {
        promise = null;
        set({ ...state, error: friendlyError(e) });
        throw e;
      });
  }
  return promise;
}
