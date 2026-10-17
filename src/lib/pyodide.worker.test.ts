import { loadPyodide, type PyodideAPI } from "pyodide";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installStubs } from "../test/python";
import type { PyRequest, PyResponse } from "../types";

/**
 * Runs the real worker module on real Pyodide (from node_modules) with the real
 * Python sources. Only the network is cut out: the CDN import, loadPackage and
 * micropip are replaced, and yt-dlp is the stub from src/test/pystubs.
 */
const env = vi.hoisted(() => ({
  py: null as PyodideAPI | null,
  loadPackage: null as unknown as ReturnType<typeof import("vitest").vi.fn>,
  install: null as unknown as ReturnType<typeof import("vitest").vi.fn>,
  loadError: null as Error | null,
}));

vi.mock("https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs", () => ({
  loadPyodide: async () => {
    if (env.loadError) throw env.loadError;
    const py = await loadPyodide();
    installStubs(py);
    env.py = py;
    const realImport = py.pyimport.bind(py);
    return Object.assign(Object.create(py), {
      loadPackage: env.loadPackage,
      pyimport: (name: string) => (name === "micropip" ? { install: env.install } : realImport(name)),
    });
  },
}));

/** Each worker gets its own XMLHttpRequest, just as each real worker has its own global scope. */
const makeXHR = () =>
  class FakeXHR {
    opened: unknown[] = [];
    open(...args: unknown[]) {
      this.opened = args;
    }
    setRequestHeader() {}
  };
let FakeXHR: ReturnType<typeof makeXHR>;

let sent: { msg: PyResponse; transfer: Transferable[] }[];

/** Imports a fresh copy of the worker, wired to a fake postMessage. */
async function startWorker() {
  vi.resetModules();
  sent = [];
  FakeXHR = makeXHR();
  globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
  vi.stubGlobal("postMessage", (msg: PyResponse, opts: { transfer: Transferable[] }) => sent.push({ msg, transfer: opts.transfer }));
  vi.stubGlobal("onmessage", null);
  await import("./pyodide.worker");
}

const post = (req: PyRequest) => (globalThis.onmessage as (e: { data: PyRequest }) => void)({ data: req });
const messages = () => sent.map((s) => s.msg);
const waitFor = (pred: (m: PyResponse) => boolean) =>
  vi.waitFor(() => {
    const m = messages().find(pred);
    if (!m) throw new Error("not yet");
    return m;
  }, { timeout: 20_000, interval: 5 });

async function ready() {
  post({ type: "init" });
  await waitFor((m) => m.type === "ready");
}

/** Configures the stub yt-dlp inside the worker's Pyodide. */
const setupYtDlp = (code: string) => env.py!.runPython(`import yt_dlp\nyt_dlp.reset()\n${code}`);

beforeEach(async () => {
  env.loadPackage = vi.fn(async () => {});
  env.install = vi.fn(async () => {});
  env.loadError = null;
  await startWorker();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("init", () => {
  it("loads Pyodide, packages and yt-dlp, reporting each step, then says ready", async () => {
    await ready();
    expect(messages()).toEqual([
      { type: "step", step: "runtime", state: "active" },
      { type: "step", step: "runtime", state: "done" },
      { type: "step", step: "packages", state: "active" },
      { type: "step", step: "packages", state: "done" },
      { type: "step", step: "ytdlp", state: "active" },
      { type: "step", step: "ytdlp", state: "done" },
      { type: "ready" },
    ]);
    expect(env.loadPackage).toHaveBeenCalledWith(["micropip", "pyodide-http"]);
    expect(env.install).toHaveBeenCalledWith(["yt-dlp", "yt-dlp-ejs"]);
    // The bootstrap ran: requests now go through the proxy.
    expect(env.py!.runPython("import pyodide_http; pyodide_http.PATCHED")).toBe(true);
  });

  it("loads only once however many times init is sent", async () => {
    post({ type: "init" });
    await ready();
    await waitFor((m) => messages().filter((x) => x.type === "ready").length === 2 && m.type === "ready");
    expect(env.loadPackage).toHaveBeenCalledTimes(1);
  });

  it("marks the failing step and reports initError", async () => {
    env.install.mockRejectedValue(new Error("Can't find a pure Python 3 wheel for 'yt-dlp'"));
    post({ type: "init" });
    const err = await waitFor((m) => m.type === "initError");
    expect(err).toEqual({ type: "initError", message: "Can't find a pure Python 3 wheel for 'yt-dlp'" });
    expect(messages()).toContainEqual({ type: "step", step: "ytdlp", state: "error" });
    expect(messages()).not.toContainEqual({ type: "step", step: "ytdlp", state: "done" });
  });

  it("reports a runtime failure", async () => {
    env.loadError = new Error("wasm failed");
    post({ type: "init" });
    await waitFor((m) => m.type === "initError");
    expect(messages()).toContainEqual({ type: "step", step: "runtime", state: "error" });
  });
});

describe("proxy", () => {
  it("applies a proxy sent before init, once the bootstrap has run", async () => {
    post({ type: "proxy", proxy: "http://localhost:8787" });
    await ready();
    // The bootstrap resets CORS_PROXY to its default; the page re-sends the proxy
    // before every call (engine.ts calls syncProxy), which is what makes it stick.
    post({ type: "proxy", proxy: "http://localhost:8787" });
    const xhr = new FakeXHR();
    (xhr.open as (...a: unknown[]) => void)("GET", "https://www.youtube.com/");
    expect(xhr.opened[1]).toBe("http://localhost:8787?url=https%3A%2F%2Fwww.youtube.com%2F");
    expect(globalThis.YTDLP_CORS_PROXY).toBe("http://localhost:8787");
  });

  it("switches proxy at any time and clears the JS global when emptied", async () => {
    await ready();
    post({ type: "proxy", proxy: "https://a.example/" });
    expect(env.py!.globals.get("CORS_PROXY")).toBe("https://a.example/");
    post({ type: "proxy", proxy: "" });
    expect(env.py!.globals.get("CORS_PROXY")).toBe("");
    expect(globalThis.YTDLP_CORS_PROXY).toBeUndefined();
  });
});

describe("listFormats", () => {
  it("runs list_formats.py for the URL and replies with its JSON", async () => {
    await ready();
    setupYtDlp(`yt_dlp.INFO = {"id": "jNQXAC9IVRw", "title": "Me at the zoo", "formats": [{"format_id": "18", "ext": "mp4", "vcodec": "avc1", "acodec": "mp4a"}]}`);
    post({ type: "listFormats", url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", id: 1 });
    const res = await waitFor((m) => m.type === "result" && m.id === 1);
    expect(JSON.parse((res as { value: string }).value)).toMatchObject({
      id: "jNQXAC9IVRw", title: "Me at the zoo", formats: [{ format_id: "18" }],
    });
  });

  it("initialises on demand when a call arrives first", async () => {
    post({ type: "listFormats", url: "u", id: 7 });
    await waitFor((m) => m.type === "result" || m.type === "error");
    expect(messages()).toContainEqual({ type: "step", step: "ytdlp", state: "done" });
  });

  it("replies with an error carrying the Python exception", async () => {
    await ready();
    setupYtDlp(`yt_dlp.ERROR = yt_dlp.utils.DownloadError("ERROR: [youtube] x: Video unavailable")`);
    post({ type: "listFormats", url: "u", id: 2 });
    const res = await waitFor((m) => m.type === "error" && m.id === 2);
    expect((res as { message: string }).message).toMatch(/DownloadError: ERROR: \[youtube\] x: Video unavailable/);
  });
});

describe("download", () => {
  beforeEach(async () => {
    await ready();
    setupYtDlp(`
yt_dlp.INFO = {"id": "jNQXAC9IVRw"}
yt_dlp.FILES["137"] = ("mp4", b"VIDEO")
yt_dlp.FILES["140"] = ("m4a", b"AUDIO")`);
  });

  it("returns each downloaded file, transfers the bytes and empties the folder", async () => {
    post({ type: "download", url: "u", formatIds: ["137", "140"], id: 3 });
    await waitFor((m) => m.type === "result" && m.id === 3);
    const { msg, transfer } = sent.find((s) => s.msg.type === "result")!;
    const files = (msg as { value: { name: string; data: Uint8Array }[] }).value;

    expect(files.map((f) => [f.name, new TextDecoder().decode(f.data)]).sort()).toEqual([
      ["jNQXAC9IVRw.f137.mp4", "VIDEO"],
      ["jNQXAC9IVRw.f140.m4a", "AUDIO"],
    ]);
    expect(transfer).toHaveLength(2);
    expect(transfer).toEqual(expect.arrayContaining(files.map((f) => f.data.buffer)));
    expect(env.py!.FS.readdir("/mnt/dl")).toEqual([".", ".."]);
  });

  it("forwards progress for the call, always including the finished event", async () => {
    env.py!.runPython(`yt_dlp.PROGRESS.extend([{"downloaded_bytes": 1, "total_bytes": 5}, {"downloaded_bytes": 2, "total_bytes": 5}])`);
    post({ type: "download", url: "u", formatIds: ["137"], id: 4 });
    await waitFor((m) => m.type === "result" && m.id === 4);
    const progress = messages().filter((m) => m.type === "progress");
    // Back-to-back updates are throttled, but the first and the final one are always sent.
    expect(progress[0]).toEqual({ type: "progress", id: 4, index: 0, downloaded: 1, total: 5 });
    expect(progress.at(-1)).toEqual({ type: "progress", id: 4, index: 0, downloaded: 5, total: 5 });
    expect(progress.length).toBeLessThan(3);
  });

  it("runs calls one at a time, in order", async () => {
    post({ type: "download", url: "u", formatIds: ["137"], id: 5 });
    post({ type: "download", url: "u", formatIds: ["140"], id: 6 });
    await waitFor((m) => m.type === "result" && m.id === 6);
    const results = sent.filter((s) => s.msg.type === "result").map((s) => s.msg as { id: number; value: { name: string }[] });
    expect(results.map((r) => [r.id, r.value.map((f) => f.name)])).toEqual([
      [5, ["jNQXAC9IVRw.f137.mp4"]],
      [6, ["jNQXAC9IVRw.f140.m4a"]],
    ]);
  });

  it("keeps serving calls after one fails", async () => {
    post({ type: "download", url: "u", formatIds: ["999"], id: 8 });
    post({ type: "download", url: "u", formatIds: ["140"], id: 9 });
    await waitFor((m) => m.type === "result" && m.id === 9);
    expect(messages()).toContainEqual(expect.objectContaining({ type: "error", id: 8, message: expect.stringMatching(/KeyError/) }));
  });
});
