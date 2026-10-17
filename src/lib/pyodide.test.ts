import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeWorker, flush } from "../test/fakeWorker";

vi.stubGlobal("Worker", FakeWorker);

// The module holds the worker and pending calls, so each test gets a fresh copy.
let py: typeof import("./pyodide");
beforeEach(async () => {
  vi.resetModules();
  FakeWorker.instances = [];
  py = await import("./pyodide");
});

/** Starts the worker and marks it ready. */
async function ready() {
  const p = py.initPyodide();
  FakeWorker.last.reply({ type: "ready" });
  await p;
  return FakeWorker.last;
}

describe("normalizeProxy", () => {
  it.each([
    ["", ""],
    ["   ", ""],
    ["https://cf-proxy.eidoriantan.com/", "https://cf-proxy.eidoriantan.com/"],
    ["  localhost:8787  ", "http://localhost:8787"],
    ["127.0.0.1:8787/", "http://127.0.0.1:8787/"],
    ["http://localhost:8787/?url=https://x", "http://localhost:8787/"],
    ["https://p.example/path?foo=1", "https://p.example/path"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(py.normalizeProxy(input)).toBe(expected);
  });
});

describe("initPyodide", () => {
  it("starts one module worker and sends the proxy before init", async () => {
    py.syncProxy("localhost:8787");
    const a = py.initPyodide();
    const b = py.initPyodide();
    expect(a).toBe(b);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(String(FakeWorker.last.url)).toMatch(/\/pyodide\.worker\.ts\b/);
    expect(FakeWorker.last.options).toEqual({ type: "module" });
    expect(FakeWorker.last.posted).toEqual([{ type: "proxy", proxy: "http://localhost:8787" }, { type: "init" }]);
    FakeWorker.last.reply({ type: "ready" });
    await expect(a).resolves.toBeUndefined();
  });

  it("forwards load steps to the reporter", async () => {
    const report = vi.fn();
    const p = py.initPyodide(report);
    FakeWorker.last.reply({ type: "step", step: "runtime", state: "active" });
    FakeWorker.last.reply({ type: "step", step: "runtime", state: "done" });
    FakeWorker.last.reply({ type: "ready" });
    await p;
    expect(report.mock.calls).toEqual([["runtime", "active"], ["runtime", "done"]]);
  });

  it("rejects on initError, terminates the worker and retries with a new one", async () => {
    const p = py.initPyodide();
    const first = FakeWorker.last;
    first.reply({ type: "initError", message: "micropip failed" });
    await expect(p).rejects.toThrow("micropip failed");
    expect(first.terminated).toBe(true);

    const retry = py.initPyodide();
    expect(FakeWorker.instances).toHaveLength(2);
    FakeWorker.last.reply({ type: "ready" });
    await expect(retry).resolves.toBeUndefined();
  });

  it("rejects when the worker crashes while loading", async () => {
    const p = py.initPyodide();
    FakeWorker.last.crash();
    await expect(p).rejects.toThrow("The Python worker crashed.");
    expect(FakeWorker.last.terminated).toBe(true);
  });
});

describe("syncProxy", () => {
  it("posts the normalized proxy to a running worker immediately", async () => {
    const w = await ready();
    py.syncProxy("https://my-proxy.dev?x=1");
    expect(w.posted.at(-1)).toEqual({ type: "proxy", proxy: "https://my-proxy.dev" });
  });

  it("is safe before the worker exists", () => {
    expect(() => py.syncProxy("x")).not.toThrow();
    expect(FakeWorker.instances).toHaveLength(0);
  });
});

describe("runListFormats / runDownload", () => {
  it("waits for init, then resolves with the worker's result", async () => {
    const result = py.runListFormats("https://youtu.be/x");
    FakeWorker.last.reply({ type: "ready" });
    await flush();
    const req = FakeWorker.last.lastCall();
    expect(req).toEqual({ type: "listFormats", url: "https://youtu.be/x", id: req.id });
    FakeWorker.last.reply({ type: "result", id: req.id, value: '{"id":"x"}' });
    await expect(result).resolves.toBe('{"id":"x"}');
  });

  it("routes progress and results to the matching call", async () => {
    const w = await ready();
    const onA = vi.fn();
    const onB = vi.fn();
    const a = py.runDownload("u", ["137", "140"], onA);
    const b = py.runDownload("u", ["18"], onB);
    await flush();
    const [reqA, reqB] = w.posted.filter((r) => "id" in r) as { id: number; formatIds: string[] }[];
    expect(reqA.formatIds).toEqual(["137", "140"]);
    expect(reqA.id).not.toBe(reqB.id);

    w.reply({ type: "progress", id: reqB.id, index: 0, downloaded: 5, total: 10 });
    w.reply({ type: "progress", id: reqA.id, index: 1, downloaded: 1, total: 0 });
    expect(onA.mock.calls).toEqual([[1, 1, 0]]);
    expect(onB.mock.calls).toEqual([[0, 5, 10]]);

    const files = [{ name: "x.f18.mp4", data: new Uint8Array([1]) }];
    w.reply({ type: "result", id: reqB.id, value: files });
    w.reply({ type: "error", id: reqA.id, message: "HTTP Error 403: Forbidden" });
    await expect(b).resolves.toBe(files);
    await expect(a).rejects.toThrow("HTTP Error 403: Forbidden");
  });

  it("ignores messages for unknown ids", async () => {
    const w = await ready();
    expect(() => {
      w.reply({ type: "progress", id: 999, index: 0, downloaded: 1, total: 1 });
      w.reply({ type: "result", id: 999, value: null });
    }).not.toThrow();
  });

  it("fails pending calls when the worker crashes, and starts a fresh worker for the next call", async () => {
    const w = await ready();
    const pending = py.runListFormats("u");
    await flush();
    w.crash("out of memory");
    await expect(pending).rejects.toThrow("out of memory");
    expect(w.terminated).toBe(true);

    const next = py.runListFormats("u2");
    expect(FakeWorker.instances).toHaveLength(2);
    FakeWorker.last.reply({ type: "ready" });
    await flush();
    FakeWorker.last.reply({ type: "result", id: FakeWorker.last.lastCall().id, value: "ok" });
    await expect(next).resolves.toBe("ok");
  });
});
