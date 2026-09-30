/// <reference types="vite/client" />
// vite/client already types `import x from "./file.py?raw"` as a string.

/** Minimal surface of the Pyodide API used by this app. */
interface PyodideFS {
  readdir(path: string): string[];
  readFile(path: string): Uint8Array;
  unlink(path: string): void;
}

interface PyodideGlobals {
  set(name: string, value: unknown): void;
  get(name: string): unknown;
}

interface PyodideInterface {
  loadPackage(names: string | string[]): Promise<void>;
  pyimport(name: "micropip"): { install(pkgs: string | string[]): Promise<void> };
  pyimport(name: string): unknown;
  runPythonAsync(code: string): Promise<unknown>;
  toPy(value: unknown): unknown;
  globals: PyodideGlobals;
  FS: PyodideFS;
}

interface Window {
  /** Injected by the Pyodide <script> tag in index.html. */
  loadPyodide(options?: Record<string, unknown>): Promise<PyodideInterface>;
}

/** Read by the yt-dlp bootstrap script to route requests through the CORS proxy. */
declare var YTDLP_CORS_PROXY: string | undefined;
