import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPyodide, type PyodideAPI } from "pyodide";

const STUBS_DIR = fileURLToPath(new URL("./pystubs", import.meta.url));
const STUBS_MOUNT = "/stubs";

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (name.endsWith(".py")) yield path;
  }
}

/** Copies the stub packages in `pystubs/` into Pyodide's filesystem and puts them first on sys.path. */
export function installStubs(py: PyodideAPI): void {
  for (const file of walk(STUBS_DIR)) {
    const target = `${STUBS_MOUNT}/${relative(STUBS_DIR, file).split("\\").join("/")}`;
    py.FS.mkdirTree(target.slice(0, target.lastIndexOf("/")));
    py.FS.writeFile(target, readFileSync(file, "utf8"));
  }
  py.runPython(`import sys\nif "${STUBS_MOUNT}" not in sys.path: sys.path.insert(0, "${STUBS_MOUNT}")`);
}

/** Real Pyodide (from node_modules, no network) with yt-dlp and friends stubbed out. */
export async function loadTestPyodide(): Promise<PyodideAPI> {
  const py = await loadPyodide();
  installStubs(py);
  return py;
}

/** Runs Python that ends in an expression and returns it decoded from JSON. */
export async function pyJson<T = unknown>(py: PyodideAPI, code: string): Promise<T> {
  const lines = code.trim().split("\n");
  const last = lines.pop();
  return JSON.parse(await py.runPythonAsync(`import json\n${lines.join("\n")}\njson.dumps(${last})`)) as T;
}
