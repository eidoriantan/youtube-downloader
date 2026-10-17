import { beforeEach, describe, expect, it, vi } from "vitest";
import { FORMATS } from "../test/fixtures";
import type { DownloadedStream } from "../types";

type ProgressListener = (e: { progress: number }) => void;

/** In-memory stand-in for ffmpeg.wasm; `exec` runs `script` instead of ffmpeg. */
class FakeFFmpeg {
  static instances: FakeFFmpeg[] = [];
  static loadError: Error | null = null;
  static script: (ff: FakeFFmpeg, args: string[]) => number = (ff, args) => {
    ff.files.set(args[args.length - 1], new Uint8Array([9, 9]));
    return 0;
  };

  files = new Map<string, Uint8Array>();
  listeners = new Set<ProgressListener>();
  execs: string[][] = [];
  load = vi.fn(async () => {
    if (FakeFFmpeg.loadError) throw FakeFFmpeg.loadError;
  });

  constructor() {
    FakeFFmpeg.instances.push(this);
  }
  on(_: "progress", l: ProgressListener) { this.listeners.add(l); }
  off(_: "progress", l: ProgressListener) { this.listeners.delete(l); }
  emit(progress: number) { this.listeners.forEach((l) => l({ progress })); }
  async writeFile(name: string, data: Uint8Array) { this.files.set(name, data); }
  async readFile(name: string) {
    const f = this.files.get(name);
    if (!f) throw new Error(`no such file ${name}`);
    return f;
  }
  async deleteFile(name: string) { this.files.delete(name); }
  async exec(args: string[]) {
    this.execs.push(args);
    return FakeFFmpeg.script(this, args);
  }
}

vi.mock("@ffmpeg/ffmpeg", () => ({ FFmpeg: FakeFFmpeg }));
vi.mock("@ffmpeg/util", () => ({ toBlobURL: vi.fn(async (url: string) => `blob:${url}`) }));

const stream = (ext: string, bytes: number[] = [1]): DownloadedStream =>
  ({ data: new Uint8Array(bytes), ext, format: FORMATS.mp4_1080 });

// The module caches the loaded instance, so each test gets a fresh copy.
const load = () => import("./ffmpeg");
const defaultScript = FakeFFmpeg.script;

beforeEach(() => {
  vi.resetModules();
  FakeFFmpeg.instances = [];
  FakeFFmpeg.loadError = null;
  FakeFFmpeg.script = defaultScript;
});

describe("getFFmpeg", () => {
  it("loads the core from the CDN once and reports progress", async () => {
    const { getFFmpeg } = await load();
    const report = vi.fn();
    const [a, b] = await Promise.all([getFFmpeg(report), getFFmpeg()]);
    expect(a).toBe(b);
    expect(FakeFFmpeg.instances).toHaveLength(1);
    expect(a.load).toHaveBeenCalledWith({
      coreURL: expect.stringMatching(/^blob:https:\/\/cdn\.jsdelivr\.net\/npm\/@ffmpeg\/core@[\d.]+\/dist\/esm\/ffmpeg-core\.js$/),
      wasmURL: expect.stringMatching(/ffmpeg-core\.wasm$/),
    });
    expect(report.mock.calls).toEqual([["ffmpeg", "active"], ["ffmpeg", "done"]]);
  });

  it("reports an error and retries on the next call after a failed load", async () => {
    const { getFFmpeg } = await load();
    const report = vi.fn();
    FakeFFmpeg.loadError = new Error("network down");
    await expect(getFFmpeg(report)).rejects.toThrow("network down");
    expect(report).toHaveBeenLastCalledWith("ffmpeg", "error");

    FakeFFmpeg.loadError = null;
    await expect(getFFmpeg()).resolves.toBeInstanceOf(FakeFFmpeg);
    expect(FakeFFmpeg.instances).toHaveLength(2);
  });
});

describe("mergeStreams", () => {
  it.each([
    ["mp4", "m4a", "mp4"],
    ["webm", "webm", "webm"],
    ["mp4", "webm", "mkv"],
    ["webm", "m4a", "mkv"],
  ])("merges %s video with %s audio into .%s", async (v, a, ext) => {
    const { mergeStreams } = await load();
    const result = await mergeStreams({ primary: stream(v, [1]), audio: stream(a, [2]) });
    expect(result).toEqual({ data: new Uint8Array([9, 9]), ext });
  });

  it("stream-copies the first video track and first audio track without re-encoding", async () => {
    const { mergeStreams } = await load();
    let inputs: Record<string, Uint8Array> = {};
    FakeFFmpeg.script = (ff) => {
      inputs = Object.fromEntries(ff.files);
      ff.files.set("out.mp4", new Uint8Array([7]));
      return 0;
    };
    await mergeStreams({ primary: stream("mp4", [1, 1]), audio: stream("m4a", [2, 2]) });

    const ff = FakeFFmpeg.instances[0];
    expect(ff.execs).toEqual([["-i", "v.mp4", "-i", "a.m4a", "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "out.mp4"]]);
    expect(inputs).toEqual({ "v.mp4": new Uint8Array([1, 1]), "a.m4a": new Uint8Array([2, 2]) });
    // Temporary files are cleaned up so the next job starts from scratch.
    expect(ff.files.size).toBe(0);
  });

  it("forwards progress clamped to 0..1 and detaches the listener afterwards", async () => {
    const { mergeStreams } = await load();
    FakeFFmpeg.script = (ff, args) => {
      ff.emit(-0.5);
      ff.emit(0.4);
      ff.emit(3);
      ff.files.set(args[args.length - 1], new Uint8Array());
      return 0;
    };
    const onProgress = vi.fn();
    await mergeStreams({ primary: stream("mp4"), audio: stream("m4a"), onProgress });
    expect(onProgress.mock.calls).toEqual([[0], [0.4], [1]]);
    expect(FakeFFmpeg.instances[0].listeners.size).toBe(0);
  });

  it("throws when ffmpeg exits with a non-zero code", async () => {
    const { mergeStreams } = await load();
    FakeFFmpeg.script = () => 1;
    await expect(mergeStreams({ primary: stream("mp4"), audio: stream("m4a") })).rejects.toThrow("ffmpeg merge failed");
    expect(FakeFFmpeg.instances[0].listeners.size).toBe(0);
  });

  it("loads ffmpeg on demand if the startup load failed", async () => {
    const { getFFmpeg, mergeStreams } = await load();
    FakeFFmpeg.loadError = new Error("offline");
    await getFFmpeg().catch(() => {});
    FakeFFmpeg.loadError = null;
    await expect(mergeStreams({ primary: stream("mp4"), audio: stream("m4a") })).resolves.toMatchObject({ ext: "mp4" });
  });
});

describe("convertToMp3", () => {
  it("re-encodes to CBR MP3 at the chosen bitrate and drops source metadata", async () => {
    const { convertToMp3 } = await load();
    const data = await convertToMp3({ audio: stream("webm", [5]), bitrate: 192 });
    expect(data).toEqual(new Uint8Array([9, 9]));
    const ff = FakeFFmpeg.instances[0];
    expect(ff.execs).toEqual([[
      "-i", "in.webm", "-vn", "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "192k", "out.mp3",
    ]]);
    expect(ff.files.size).toBe(0);
  });

  it("forwards progress", async () => {
    const { convertToMp3 } = await load();
    FakeFFmpeg.script = (ff) => {
      ff.emit(0.5);
      ff.files.set("out.mp3", new Uint8Array());
      return 0;
    };
    const onProgress = vi.fn();
    await convertToMp3({ audio: stream("m4a"), bitrate: 128, onProgress });
    expect(onProgress).toHaveBeenCalledWith(0.5);
  });

  it("throws when the conversion fails", async () => {
    const { convertToMp3 } = await load();
    FakeFFmpeg.script = () => 1;
    await expect(convertToMp3({ audio: stream("m4a"), bitrate: 320 })).rejects.toThrow("ffmpeg MP3 conversion failed");
  });
});
