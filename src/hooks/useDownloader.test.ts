import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FORMATS, INFO } from "../test/fixtures";
import { useDownloader } from "./useDownloader";

const mocks = vi.hoisted(() => ({ listFormats: vi.fn(), downloadMedia: vi.fn(), syncProxy: vi.fn() }));
vi.mock("../lib/engine", () => ({ listFormats: mocks.listFormats, downloadMedia: mocks.downloadMedia }));
vi.mock("../lib/pyodide", () => ({ syncProxy: mocks.syncProxy }));

const DEFAULT_PROXY = "https://cf-proxy.eidoriantan.com/";

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.listFormats.mockResolvedValue(INFO);
  mocks.downloadMedia.mockResolvedValue("Me at the zoo.mp4");
});

describe("proxy", () => {
  it("defaults to the shared proxy and syncs it to Python", () => {
    const { result } = renderHook(() => useDownloader());
    expect(result.current.proxy).toBe(DEFAULT_PROXY);
    expect(mocks.syncProxy).toHaveBeenCalledWith(DEFAULT_PROXY);
  });

  it("restores a saved proxy", () => {
    localStorage.setItem("proxy", "http://localhost:8787");
    const { result } = renderHook(() => useDownloader());
    expect(result.current.proxy).toBe("http://localhost:8787");
  });

  it("saves and syncs the proxy as it changes", () => {
    const { result } = renderHook(() => useDownloader());
    act(() => result.current.setProxy("localhost:8787"));
    expect(localStorage.getItem("proxy")).toBe("localhost:8787");
    expect(mocks.syncProxy).toHaveBeenLastCalledWith("localhost:8787");
  });

  it("falls back to the default when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const { result } = renderHook(() => useDownloader());
    expect(result.current.proxy).toBe(DEFAULT_PROXY);
    expect(() => act(() => result.current.setProxy("x"))).not.toThrow();
  });
});

describe("fetchFormats", () => {
  it("loads formats, preselects the best video and its matching audio, and moves to the format step", async () => {
    const { result } = renderHook(() => useDownloader());
    act(() => result.current.setUrl("https://youtu.be/jNQXAC9IVRw"));
    await act(() => result.current.fetchFormats());

    expect(mocks.listFormats).toHaveBeenCalledWith(DEFAULT_PROXY, "https://youtu.be/jNQXAC9IVRw", expect.any(Function));
    expect(result.current.info).toBe(INFO);
    expect(result.current.videoId).toBe("137");
    expect(result.current.audioId).toBe("140");
    expect(result.current.step).toBe("format");
    expect(result.current.status).toBe(`Found ${INFO.formats.length} formats`);
    expect(result.current.busy).toBe(false);
  });

  it("is busy while working and forwards status messages", async () => {
    let finish!: () => void;
    mocks.listFormats.mockImplementation(async (_p, _u, onStatus: (m: string) => void) => {
      onStatus("Fetching formats…");
      await new Promise<void>((r) => (finish = r));
      return INFO;
    });
    const { result } = renderHook(() => useDownloader());
    let done!: Promise<void>;
    act(() => {
      done = result.current.fetchFormats();
    });
    await waitFor(() => expect(result.current.status).toBe("Fetching formats…"));
    expect(result.current.busy).toBe(true);
    await act(async () => {
      finish();
      await done;
    });
    expect(result.current.busy).toBe(false);
  });

  it("resets MP3 options and the previous result", async () => {
    const { result } = renderHook(() => useDownloader());
    await act(() => result.current.fetchFormats());
    act(() => {
      result.current.setToMp3(true);
      result.current.setMetadata({ ...result.current.metadata, title: "old" });
    });
    await act(() => result.current.fetchFormats());
    expect(result.current.toMp3).toBe(false);
    expect(result.current.metadata.title).toBe("");
  });

  it("shows a friendly error and clears the status on failure", async () => {
    mocks.listFormats.mockRejectedValue(new Error("yt_dlp.utils.DownloadError: ERROR: Unsupported URL: x"));
    const { result } = renderHook(() => useDownloader());
    await act(() => result.current.fetchFormats());
    expect(result.current.error).toBe("Unsupported URL: x");
    expect(result.current.status).toBe("");
    expect(result.current.info).toBeNull();

    mocks.listFormats.mockResolvedValue(INFO);
    await act(() => result.current.fetchFormats());
    expect(result.current.error).toBe("");
  });
});

describe("download", () => {
  async function withFormats() {
    const hook = renderHook(() => useDownloader());
    act(() => hook.result.current.setUrl("https://youtu.be/jNQXAC9IVRw"));
    await act(() => hook.result.current.fetchFormats());
    return hook;
  }

  it("downloads the selected format and keeps the modal open with the result", async () => {
    const { result } = await withFormats();
    await act(() => result.current.download());

    expect(mocks.downloadMedia).toHaveBeenCalledWith({
      proxy: DEFAULT_PROXY, url: "https://youtu.be/jNQXAC9IVRw", info: INFO, format: FORMATS.mp4_1080,
      audio: FORMATS.m4a, mp3: null, onProgress: expect.any(Function),
    });
    expect(result.current.progressOpen).toBe(true);
    expect(result.current.savedAs).toBe("Me at the zoo.mp4");
    expect(result.current.status).toBe("Saved Me at the zoo.mp4");

    act(() => result.current.closeProgress());
    expect(result.current.progressOpen).toBe(false);
  });

  it("passes progress updates through", async () => {
    const progress = { stages: [{ id: "video" as const, label: "Download video" }], current: 0, fraction: 0.3, detail: "x" };
    mocks.downloadMedia.mockImplementation(async ({ onProgress }) => {
      onProgress(progress);
      return "a.mp4";
    });
    const { result } = await withFormats();
    await act(() => result.current.download());
    expect(result.current.progress).toBe(progress);
  });

  it("sends MP3 options for audio-only formats when enabled", async () => {
    const { result } = await withFormats();
    act(() => {
      result.current.setVideoId("");
      result.current.setAudioId("140");
      result.current.setToMp3(true);
      result.current.setBitrate(192);
      result.current.setMetadata({ ...result.current.metadata, artist: "jawed" });
    });
    await act(() => result.current.download());
    expect(mocks.downloadMedia.mock.calls[0][0].mp3).toEqual({
      bitrate: 192, metadata: expect.objectContaining({ artist: "jawed" }),
    });
  });

  it("does not send MP3 options for formats with video", async () => {
    const { result } = await withFormats();
    act(() => result.current.setToMp3(true));
    await act(() => result.current.download());
    expect(mocks.downloadMedia.mock.calls[0][0].mp3).toBeNull();
  });

  it("asks for a format when nothing is selected", async () => {
    const { result } = renderHook(() => useDownloader());
    await act(() => result.current.download());
    expect(result.current.error).toBe("Choose a format first.");
    expect(mocks.downloadMedia).not.toHaveBeenCalled();
  });

  it("keeps the modal open and shows the error when the download fails", async () => {
    mocks.downloadMedia.mockRejectedValue(new Error("ffmpeg merge failed"));
    const { result } = await withFormats();
    await act(() => result.current.download());
    expect(result.current.progressOpen).toBe(true);
    expect(result.current.error).toBe("ffmpeg merge failed");
    expect(result.current.savedAs).toBe("");
    expect(result.current.busy).toBe(false);
  });
});
