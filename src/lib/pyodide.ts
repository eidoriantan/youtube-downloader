import type { DownloadedFile, PyCall, PyRequest, PyResponse, StepReporter } from "../types";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

let worker: Worker | null = null;
let pyPromise: Promise<void> | null = null;
let currentProxy = "";
let nextId = 0;
const pending = new Map<number, Pending>();

/** Normalises user input; the Python side appends `?url=...` itself. */
export function normalizeProxy(proxy: string): string {
  let s = proxy.trim();
  if (!s) return "";
  if (!/^https?:\/\//.test(s)) s = "http://" + s;
  return s.split("?")[0];
}

const post = (req: PyRequest) => worker?.postMessage(req);

/**
 * Updates the proxy everywhere. Safe to call at any time, before or after
 * Pyodide has loaded, and as often as the input changes.
 */
export function syncProxy(proxy: string): void {
  currentProxy = normalizeProxy(proxy);
  post({ type: "proxy", proxy: currentProxy });
}

/** Drops a broken worker and fails everything that was waiting on it. */
function reset(error: Error): void {
  worker?.terminate();
  worker = null;
  pyPromise = null;
  pending.forEach((p) => p.reject(error));
  pending.clear();
}

/**
 * Starts the Pyodide worker, which loads micropip, pyodide-http and yt-dlp
 * once. Safe to call many times; retries on the next call if a previous
 * attempt failed.
 */
export function initPyodide(report: StepReporter = () => {}): Promise<void> {
  if (!pyPromise) {
    pyPromise = new Promise<void>((resolve, reject) => {
      const w = new Worker(new URL("./pyodide.worker.ts", import.meta.url), { type: "module" });
      worker = w;
      w.onmessage = (e: MessageEvent<PyResponse>) => {
        const msg = e.data;
        switch (msg.type) {
          case "step":
            report(msg.step, msg.state);
            break;
          case "ready":
            resolve();
            break;
          case "initError":
            reject(new Error(msg.message));
            break;
          case "result":
          case "error": {
            const p = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.type === "result") p?.resolve(msg.value);
            else p?.reject(new Error(msg.message));
          }
        }
      };
      w.onerror = (e) => {
        const error = new Error(e.message || "The Python worker crashed.");
        reject(error);
        reset(error);
      };
      post({ type: "proxy", proxy: currentProxy });
      post({ type: "init" });
    }).catch((e: Error) => {
      reset(e);
      throw e;
    });
  }
  return pyPromise;
}

async function call<T>(req: PyCall): Promise<T> {
  await initPyodide();
  const id = ++nextId;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
    post({ ...req, id });
  });
}

/** Returns the JSON produced by `list_formats.py`. */
export const runListFormats = (url: string) => call<string>({ type: "listFormats", url });

/** Downloads each format to its own file; see `download.py` for naming. */
export const runDownload = (url: string, formatIds: string[]) =>
  call<DownloadedFile[]>({ type: "download", url, formatIds });
