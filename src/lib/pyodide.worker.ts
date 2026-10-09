/**
 * Runs Pyodide and yt-dlp off the main thread. Loading Pyodide and yt-dlp's
 * synchronous XHR downloads would otherwise freeze the page.
 */
import bootstrapPy from "../py/ytdlp_bootstrap.py?raw";
import listPy from "../py/list_formats.py?raw";
import downloadPy from "../py/download.py?raw";
import type { DownloadedFile, LoadStepId, LoadStepState, PyCall, PyRequest, PyResponse } from "../types";

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs";
const DL_DIR = "/mnt/dl";

let currentProxy = "";
let pyInstance: PyodideInterface | null = null;
let pyPromise: Promise<PyodideInterface> | null = null;
// yt-dlp reads its inputs from Python globals, so calls must not overlap.
let queue: Promise<unknown> = Promise.resolve();

const send = (msg: PyResponse, transfer: Transferable[] = []) => postMessage(msg, { transfer });
const report = (step: LoadStepId, state: LoadStepState) => send({ type: "step", step, state });
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Pushes the current proxy into every place the Python side can read it. */
function publishProxy(pyodide: PyodideInterface | null): void {
  globalThis.YTDLP_CORS_PROXY = currentProxy || undefined; // readable as `js.YTDLP_CORS_PROXY`
  pyodide?.globals.set("CORS_PROXY", currentProxy); //          readable as `CORS_PROXY` in Python
}

/** Loads Pyodide, micropip, pyodide-http and yt-dlp, reporting each step. */
function initPyodide(): Promise<PyodideInterface> {
  pyPromise ??= (async () => {
    let current: LoadStepId = "runtime";
    const begin = (id: LoadStepId) => {
      current = id;
      report(id, "active");
    };
    try {
      begin("runtime");
      const { loadPyodide } = (await import(/* @vite-ignore */ PYODIDE_URL)) as PyodideModule;
      const pyodide = await loadPyodide();
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
  })();
  return pyPromise;
}

async function listFormats(url: string): Promise<string> {
  const pyodide = await initPyodide();
  pyodide.globals.set("TARGET_URL", url);
  return (await pyodide.runPythonAsync(listPy)) as string;
}

async function download(url: string, formatIds: string[]): Promise<DownloadedFile[]> {
  const pyodide = await initPyodide();
  pyodide.globals.set("TARGET_URL", url);
  pyodide.globals.set("FORMAT_IDS", pyodide.toPy(formatIds));
  await pyodide.runPythonAsync(downloadPy);

  return pyodide.FS.readdir(DL_DIR)
    .filter((n) => n !== "." && n !== "..")
    .map((name) => {
      const data = pyodide.FS.readFile(`${DL_DIR}/${name}`);
      pyodide.FS.unlink(`${DL_DIR}/${name}`);
      return { name, data };
    });
}

async function handleCall(req: PyCall & { id: number }): Promise<void> {
  try {
    if (req.type === "listFormats") {
      send({ type: "result", id: req.id, value: await listFormats(req.url) });
    } else {
      const files = await download(req.url, req.formatIds);
      // Transfer the bytes instead of copying them; downloads can be large.
      send({ type: "result", id: req.id, value: files }, files.map((f) => f.data.buffer as ArrayBuffer));
    }
  } catch (e) {
    send({ type: "error", id: req.id, message: message(e) });
  }
}

onmessage = (e: MessageEvent<PyRequest>) => {
  const req = e.data;
  switch (req.type) {
    case "proxy":
      currentProxy = req.proxy;
      publishProxy(pyInstance);
      break;
    case "init":
      initPyodide().then(
        () => send({ type: "ready" }),
        (err) => send({ type: "initError", message: message(err) }),
      );
      break;
    default:
      queue = queue.then(() => handleCall(req));
  }
};
