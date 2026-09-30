import bootstrapPy from "../py/ytdlp_bootstrap.py?raw";
import type { StatusHandler } from "../types";

let pyPromise: Promise<PyodideInterface> | null = null;

/** Loads Pyodide + yt-dlp once; retries on the next call if loading failed. */
export function initPyodide(onStatus: StatusHandler = () => {}): Promise<PyodideInterface> {
  if (!pyPromise) {
    pyPromise = (async () => {
      onStatus("Loading Pyodide…");
      const pyodide = await window.loadPyodide();
      await pyodide.loadPackage(["micropip", "pyodide-http"]);
      const micropip = pyodide.pyimport("micropip");
      onStatus("Installing yt-dlp…");
      await micropip.install(["yt-dlp", "yt-dlp-ejs"]);
      await pyodide.runPythonAsync(bootstrapPy);
      return pyodide;
    })().catch((e) => {
      pyPromise = null;
      throw e;
    });
  }
  return pyPromise;
}

/** Normalises user input; the Python side appends `?url=...` itself. */
export function normalizeProxy(proxy: string): string {
  let s = proxy.trim();
  if (!/^https?:\/\//.test(s)) s = "http://" + s;
  return s.split("?")[0];
}

export function setProxy(proxy: string): void {
  globalThis.YTDLP_CORS_PROXY = normalizeProxy(proxy);
}
