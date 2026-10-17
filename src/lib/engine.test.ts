import { beforeEach, describe, expect, it, vi } from "vitest";
import { FORMATS, INFO } from "../test/fixtures";
import type { DownloadedFile, DownloadOptions, DownloadProgress, FileProgressHandler, MediaFormat } from "../types";

const mocks = vi.hoisted(() => ({
  syncProxy: vi.fn(),
  runListFormats: vi.fn(),
  runDownload: vi.fn(),
  loadPython: vi.fn(),
  mergeStreams: vi.fn(),
  convertToMp3: vi.fn(),
  writeMp3Tags: vi.fn(),
  saveBlob: vi.fn(),
}));

vi.mock("./pyodide", () => ({
  syncProxy: mocks.syncProxy, runListFormats: mocks.runListFormats, runDownload: mocks.runDownload,
}));
vi.mock("./loader", () => ({ loadPython: mocks.loadPython }));
vi.mock("./ffmpeg", () => ({ mergeStreams: mocks.mergeStreams, convertToMp3: mocks.convertToMp3 }));
vi.mock("./id3", () => ({ writeMp3Tags: mocks.writeMp3Tags }));
vi.mock("./save", () => ({ saveBlob: mocks.saveBlob }));

import { downloadMedia, downloadStreams, listFormats, singleVideoUrl } from "./engine";

const URL_WITH_PLAYLIST = "https://www.youtube.com/watch?v=jNQXAC9IVRw&list=PL123&index=2#t=5";
const CLEAN_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

/** Mimics download.py: one file per format, named <id>.f<format_id>.<ext>. */
function fileFor(f: MediaFormat, byte = Number(f.format_id) % 256): DownloadedFile {
  return { name: `${INFO.id}.f${f.format_id}.${f.ext}`, data: new Uint8Array([byte]) };
}

/** Makes runDownload emit `progress` events and return a file per requested format. */
function serveDownload(progress: [number, number, number][] = []) {
  mocks.runDownload.mockImplementation(async (_url: string, ids: string[], onProgress: FileProgressHandler) => {
    progress.forEach(([i, done, total]) => onProgress(i, done, total));
    return ids.map((id) => fileFor(INFO.formats.find((f) => f.format_id === id)!));
  });
}

function options(format: MediaFormat, extra: Partial<DownloadOptions> = {}) {
  const events: DownloadProgress[] = [];
  const opts: DownloadOptions = {
    proxy: "localhost:8787", url: URL_WITH_PLAYLIST, info: INFO, format, onProgress: (p) => events.push(p), ...extra,
  };
  return { opts, events };
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.loadPython.mockResolvedValue(undefined);
  mocks.mergeStreams.mockResolvedValue({ data: new Uint8Array([42]), ext: "mp4" });
  mocks.convertToMp3.mockResolvedValue(new Uint8Array([3]));
  mocks.writeMp3Tags.mockImplementation(async (d: Uint8Array) => new Uint8Array([...d, 0x1d]));
  serveDownload();
});

describe("singleVideoUrl", () => {
  it("keeps only the v parameter so playlists are not expanded", () => {
    expect(singleVideoUrl(URL_WITH_PLAYLIST)).toBe(CLEAN_URL);
  });

  it("leaves URLs without a v parameter alone", () => {
    expect(singleVideoUrl("https://youtu.be/jNQXAC9IVRw?si=abc")).toBe("https://youtu.be/jNQXAC9IVRw?si=abc");
    expect(singleVideoUrl("https://www.youtube.com/playlist?list=PL1")).toBe("https://www.youtube.com/playlist?list=PL1");
  });

  it("throws on input that is not a URL", () => {
    expect(() => singleVideoUrl("not a url")).toThrow();
  });
});

describe("listFormats", () => {
  it("syncs the proxy, waits for Python and parses the JSON for a single video", async () => {
    mocks.runListFormats.mockResolvedValue(JSON.stringify(INFO));
    const onStatus = vi.fn();
    await expect(listFormats("my-proxy", URL_WITH_PLAYLIST, onStatus)).resolves.toEqual(INFO);
    expect(mocks.syncProxy).toHaveBeenCalledWith("my-proxy");
    expect(mocks.loadPython).toHaveBeenCalledWith(onStatus);
    expect(mocks.runListFormats).toHaveBeenCalledWith(CLEAN_URL);
    expect(onStatus).toHaveBeenLastCalledWith("Fetching formats…");
    expect(mocks.syncProxy.mock.invocationCallOrder[0]).toBeLessThan(mocks.runListFormats.mock.invocationCallOrder[0]);
  });
});

describe("downloadStreams", () => {
  it("downloads a muxed format on its own", async () => {
    const report = vi.fn();
    const { primary, audio } = await downloadStreams(options(FORMATS.mp4_360).opts, report);
    expect(mocks.runDownload).toHaveBeenCalledWith(CLEAN_URL, ["18"], expect.any(Function));
    expect(primary).toEqual({ data: new Uint8Array([18]), ext: "mp4", format: FORMATS.mp4_360 });
    expect(audio).toBeNull();
    expect(mocks.syncProxy).toHaveBeenCalledWith("localhost:8787");
  });

  it("adds the best matching audio stream for video-only formats", async () => {
    const { primary, audio } = await downloadStreams(options(FORMATS.mp4_1080).opts, vi.fn());
    expect(mocks.runDownload).toHaveBeenCalledWith(CLEAN_URL, ["137", "140"], expect.any(Function));
    expect(primary.format).toBe(FORMATS.mp4_1080);
    expect(audio).toMatchObject({ ext: "m4a", format: FORMATS.m4a });
  });

  it("downloads only the video when there is no audio to add", async () => {
    const info = { ...INFO, formats: [FORMATS.webm_720] };
    const { audio } = await downloadStreams({ ...options(FORMATS.webm_720).opts, info }, vi.fn());
    expect(mocks.runDownload).toHaveBeenCalledWith(CLEAN_URL, ["247"], expect.any(Function));
    expect(audio).toBeNull();
  });

  it("reports byte progress per stream, falling back to the listed size", async () => {
    serveDownload([
      [0, 10 * 1048576, 0], // yt-dlp doesn't know the size; listed filesize is 50 MB
      [0, 60 * 1048576, 50 * 1048576], // overshoot is clamped
      [1, 1048576, 2 * 1048576],
    ]);
    const report = vi.fn();
    await downloadStreams(options(FORMATS.mp4_1080).opts, report);
    expect(report).toHaveBeenCalledWith("video", null, "Fetching stream details…");
    expect(report).toHaveBeenCalledWith("video", 0.2, "10.0 MB of 50.0 MB");
    expect(report).toHaveBeenCalledWith("video", 1, "60.0 MB of 50.0 MB");
    expect(report).toHaveBeenCalledWith("audio", 0.5, "1.0 MB of 2.0 MB");
  });

  it("reports bytes without a fraction when no size is known at all", async () => {
    const info = { ...INFO, formats: [FORMATS.webm_720] };
    serveDownload([[0, 3 * 1048576, 0]]);
    const report = vi.fn();
    await downloadStreams({ ...options(FORMATS.webm_720).opts, info }, report);
    expect(report).toHaveBeenCalledWith("video", null, "3.0 MB downloaded");
  });

  it("labels loading progress under the first stage", async () => {
    mocks.loadPython.mockImplementation(async (onStatus: (m: string) => void) => onStatus("Waiting for yt-dlp…"));
    const report = vi.fn();
    await downloadStreams(options(FORMATS.m4a).opts, report);
    expect(report).toHaveBeenCalledWith("audio", null, "Waiting for yt-dlp…");
  });

  it("fails clearly when yt-dlp did not produce a file for a format", async () => {
    mocks.runDownload.mockResolvedValue([fileFor(FORMATS.mp4_1080)]);
    await expect(downloadStreams(options(FORMATS.mp4_1080).opts, vi.fn())).rejects.toThrow(
      "Missing downloaded file for format 140",
    );
  });

  it("matches files by format id, not by position", async () => {
    mocks.runDownload.mockResolvedValue([fileFor(FORMATS.m4a, 1), fileFor(FORMATS.mp4_1080, 2)]);
    const { primary, audio } = await downloadStreams(options(FORMATS.mp4_1080).opts, vi.fn());
    expect(primary.data).toEqual(new Uint8Array([2]));
    expect(audio?.data).toEqual(new Uint8Array([1]));
  });
});

describe("downloadMedia", () => {
  const stageIds = (events: DownloadProgress[]) => events[0].stages.map((s) => s.id);

  it("saves a muxed format directly", async () => {
    const { opts, events } = options(FORMATS.mp4_360);
    await expect(downloadMedia(opts)).resolves.toBe("Me at the zoo.mp4");
    expect(stageIds(events)).toEqual(["video", "save"]);
    expect(mocks.mergeStreams).not.toHaveBeenCalled();
    expect(mocks.saveBlob).toHaveBeenCalledWith(new Uint8Array([18]), "mp4", true, "Me at the zoo.mp4");
    expect(events.at(-1)).toMatchObject({ current: 1, fraction: 1, detail: "Saved as Me at the zoo.mp4" });
  });

  it("merges audio into a video-only format with ffmpeg", async () => {
    const { opts, events } = options(FORMATS.mp4_1080);
    mocks.mergeStreams.mockImplementation(async ({ onProgress }) => {
      onProgress(0.5);
      return { data: new Uint8Array([42]), ext: "mkv" };
    });
    await expect(downloadMedia(opts)).resolves.toBe("Me at the zoo.mkv");

    expect(stageIds(events)).toEqual(["video", "audio", "merge", "save"]);
    const { primary, audio } = mocks.mergeStreams.mock.calls[0][0];
    expect(primary.format).toBe(FORMATS.mp4_1080);
    expect(audio.format).toBe(FORMATS.m4a);
    expect(events).toContainEqual(expect.objectContaining({ current: 2, fraction: 0.5 }));
    expect(mocks.saveBlob).toHaveBeenCalledWith(new Uint8Array([42]), "mkv", true, "Me at the zoo.mkv");
  });

  it("saves audio-only formats as-is when MP3 is off", async () => {
    const { opts, events } = options(FORMATS.opus, { mp3: null });
    await expect(downloadMedia(opts)).resolves.toBe("Me at the zoo.webm");
    expect(stageIds(events)).toEqual(["audio", "save"]);
    expect(mocks.convertToMp3).not.toHaveBeenCalled();
    expect(mocks.saveBlob).toHaveBeenCalledWith(expect.any(Uint8Array), "webm", false, "Me at the zoo.webm");
  });

  it("converts audio to a tagged MP3", async () => {
    const metadata = { title: "T", artist: "", album: "", year: "", genre: "", track: "", cover: null };
    const { opts, events } = options(FORMATS.m4a, { mp3: { bitrate: 256, metadata } });
    await expect(downloadMedia(opts)).resolves.toBe("Me at the zoo.mp3");

    expect(stageIds(events)).toEqual(["audio", "mp3", "tags", "save"]);
    expect(mocks.convertToMp3).toHaveBeenCalledWith(expect.objectContaining({ bitrate: 256 }));
    expect(mocks.convertToMp3.mock.calls[0][0].audio.format).toBe(FORMATS.m4a);
    expect(mocks.writeMp3Tags).toHaveBeenCalledWith(new Uint8Array([3]), metadata);
    expect(mocks.saveBlob).toHaveBeenCalledWith(new Uint8Array([3, 0x1d]), "mp3", false, "Me at the zoo.mp3");
    expect(events).toContainEqual(expect.objectContaining({ current: 1, detail: "Re-encoding at 256 kbps" }));
  });

  it("ignores MP3 options for formats with video", async () => {
    const metadata = { title: "", artist: "", album: "", year: "", genre: "", track: "", cover: null };
    const { opts, events } = options(FORMATS.mp4_360, { mp3: { bitrate: 128, metadata } });
    await downloadMedia(opts);
    expect(stageIds(events)).toEqual(["video", "save"]);
    expect(mocks.convertToMp3).not.toHaveBeenCalled();
  });

  it("sanitizes the title and falls back to the video id", async () => {
    await expect(downloadMedia(options(FORMATS.mp4_360, { info: { ...INFO, title: 'a/b: "c"' } }).opts))
      .resolves.toBe("a_b_ _c_.mp4");
    await expect(downloadMedia(options(FORMATS.mp4_360, { info: { ...INFO, title: "" } }).opts))
      .resolves.toBe("jNQXAC9IVRw.mp4");
  });

  it("propagates failures without saving anything", async () => {
    mocks.mergeStreams.mockRejectedValue(new Error("ffmpeg merge failed"));
    await expect(downloadMedia(options(FORMATS.mp4_1080).opts)).rejects.toThrow("ffmpeg merge failed");
    expect(mocks.saveBlob).not.toHaveBeenCalled();
  });
});
