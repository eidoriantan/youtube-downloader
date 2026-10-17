import { beforeEach, describe, expect, it, vi } from "vitest";
import { flush } from "../test/fakeWorker";
import type { LoadStepId, LoadStepState, StepReporter } from "../types";

/** A promise a test can settle by hand, plus the reporter the loader passed in. */
function deferred() {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject, report: (() => {}) as StepReporter };
}

let python: ReturnType<typeof deferred>;
let ffmpeg: ReturnType<typeof deferred>;
const initPyodide = vi.fn();
const getFFmpeg = vi.fn();

vi.mock("./pyodide", () => ({ initPyodide: (r?: StepReporter) => initPyodide(r) }));
vi.mock("./ffmpeg", () => ({ getFFmpeg: (r?: StepReporter) => getFFmpeg(r) }));

let loader: typeof import("./loader");
beforeEach(async () => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => {});
  python = deferred();
  ffmpeg = deferred();
  initPyodide.mockReset().mockImplementation((r?: StepReporter) => {
    if (r) python.report = r;
    return python.promise;
  });
  getFFmpeg.mockReset().mockImplementation((r: StepReporter) => {
    ffmpeg.report = r;
    return ffmpeg.promise;
  });
  loader = await import("./loader");
});

const stateOf = (id: LoadStepId) => loader.getLoadState().steps.find((s) => s.id === id)?.state;

describe("startLoading", () => {
  it("starts with every step pending", () => {
    expect(loader.getLoadState()).toEqual({
      steps: [
        { id: "runtime", label: "Python runtime", state: "pending" },
        { id: "packages", label: "Package installer", state: "pending" },
        { id: "ytdlp", label: "yt-dlp", state: "pending" },
        { id: "ffmpeg", label: "ffmpeg for merging", state: "pending" },
      ],
      ready: false,
      error: null,
    });
  });

  it("loads Python and ffmpeg in parallel, once, and becomes ready", async () => {
    const p = loader.startLoading();
    expect(loader.startLoading()).toBe(p);
    expect(initPyodide).toHaveBeenCalledTimes(1);
    expect(getFFmpeg).toHaveBeenCalledTimes(1);

    python.resolve();
    ffmpeg.resolve();
    await p;
    expect(loader.getLoadState().ready).toBe(true);
  });

  it("publishes each step update as a new state object to subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = loader.subscribe(listener);
    loader.startLoading();
    const before = loader.getLoadState();
    python.report("runtime", "active" as LoadStepState);
    expect(loader.getLoadState()).not.toBe(before);
    expect(stateOf("runtime")).toBe("active");
    ffmpeg.report("ffmpeg", "done");
    expect(stateOf("ffmpeg")).toBe("done");
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    python.report("runtime", "done");
    expect(listener).not.toHaveBeenCalled();
  });

  it("is still ready when ffmpeg fails, since it is only needed for merging", async () => {
    const p = loader.startLoading();
    python.resolve();
    ffmpeg.reject(new Error("cdn down"));
    await p;
    expect(loader.getLoadState()).toMatchObject({ ready: true, error: null });
  });

  it("shows a friendly error when Python fails and retries on the next call", async () => {
    const p = loader.startLoading();
    python.reject(new Error("Traceback (most recent call last):\nOSError: network unreachable"));
    ffmpeg.resolve();
    await expect(p).rejects.toThrow();
    expect(loader.getLoadState()).toMatchObject({ ready: false, error: "network unreachable" });

    python = deferred();
    const retry = loader.startLoading();
    expect(retry).not.toBe(p);
    // A retry starts again from a clean slate.
    expect(loader.getLoadState().error).toBeNull();
    python.resolve();
    await retry;
    expect(loader.getLoadState().ready).toBe(true);
  });
});

describe("loadPython", () => {
  it("tells the user it is waiting until yt-dlp is loaded, without waiting for ffmpeg", async () => {
    const onStatus = vi.fn();
    const p = loader.loadPython(onStatus);
    expect(onStatus).toHaveBeenCalledWith("Waiting for yt-dlp to finish loading…");
    python.resolve();
    await expect(p).resolves.toBeUndefined(); // ffmpeg is still pending
  });

  it("says nothing once yt-dlp is done", async () => {
    loader.startLoading();
    python.report("ytdlp", "done");
    python.resolve();
    const onStatus = vi.fn();
    await loader.loadPython(onStatus);
    expect(onStatus).not.toHaveBeenCalled();
  });

  it("rejects when Python fails to load", async () => {
    const p = loader.loadPython(() => {});
    python.reject(new Error("boom"));
    await expect(p).rejects.toThrow("boom");
    await flush();
  });
});
