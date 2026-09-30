import bootstrapPy from "../py/ytdlp_bootstrap.py?raw";
import type { LoadStepId, StepReporter } from "../types";

let pyPromise: Promise<PyodideInterface> | null = null;
let pyInstance: PyodideInterface | null = null;
let currentProxy = "";

/** Normalises user input; the Python side appends `?url=...` itself. */
export function normalizeProxy(proxy: string): string {
  let s = proxy.trim();
  if (!s) return "";
  if (!/^https?:\/\//.test(s)) s = "http://" + s;
  return s.split("?")[0];
}

/** Pushes the current proxy into every place the Python side can read it. */
function publishProxy(pyodide: PyodideInterface | null): void {
  globalThis.YTDLP_CORS_PROXY = currentProxy || undefined; // readable as `js.YTDLP_CORS_PROXY`
  pyodide?.globals.set("CORS_PROXY", currentProxy); //          readable as `CORS_PROXY` in Python
}

/**
 * Updates the proxy everywhere. Safe to call at any time, before or after
 * Pyodide has loaded, and as often as the input changes.
 */
export function syncProxy(proxy: string): void {
  currentProxy = normalizeProxy(proxy);
  publishProxy(pyInstance);
}

/** The Pyodide <script> in index.html may still be loading; wait for it. */
async function waitForPyodideScript(timeoutMs = 20_000): Promise<void> {
  const start = Date.now();
  while (typeof window.loadPyodide !== "function") {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Pyodide script did not load. Check the <script> tag in index.html and your network.");
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * Loads Pyodide, micropip, pyodide-http and yt-dlp once. Safe to call many
 * times; retries on the next call if a previous attempt failed.
 */
export function initPyodide(report: StepReporter = () => {}): Promise<PyodideInterface> {
  if (!pyPromise) {
    pyPromise = (async () => {
      let current: LoadStepId = "runtime";
      const begin = (id: LoadStepId) => {
        current = id;
        report(id, "active");
      };
      try {
        begin("runtime");
        await waitForPyodideScript();
        const pyodide = await window.loadPyodide();
        report("runtime", "done");

        begin("packages");
        await pyodide.loadPackage(["micropip", "pyodide-http"]);
        report("packages", "done");

        begin("ytdlp");
        const micropip = pyodide.pyimport("micropip");
        await micropip.install(["yt-dlp", "yt-dlp-ejs"]);
        publishProxy(pyodide); // before the bootstrap runs, in case it reads the proxy
        await pyodide.runPythonAsync(bootstrapPy);
        pyInstance = pyodide;
        report("ytdlp", "done");
        return pyodide;
      } catch (e) {
        report(current, "error");
        throw e;
      }
    })().catch((e) => {
      pyPromise = null;
      throw e;
    });
  }
  return pyPromise;
}
