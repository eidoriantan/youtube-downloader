import { beforeEach, describe, expect, it, vi } from "vitest";
import { friendlyError } from "./errors";

describe("friendlyError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("logs the original error", () => {
    const e = new Error("boom");
    friendlyError(e);
    expect(console.error).toHaveBeenCalledWith(e);
  });

  it("reduces a Pyodide traceback to its last line without the exception type", () => {
    const e = new Error([
      "Traceback (most recent call last):",
      '  File "/lib/python3.14/site-packages/yt_dlp/YoutubeDL.py", line 1, in download',
      "    raise DownloadError(message, exc_info)",
      "yt_dlp.utils.DownloadError: \u001b[0;31mERROR:\u001b[0m [youtube] abc: Video unavailable",
      "",
    ].join("\n"));
    expect(friendlyError(e)).toBe("[youtube] abc: Video unavailable");
  });

  it("strips simple exception prefixes and ERROR: markers", () => {
    expect(friendlyError(new Error("ValueError: bad url"))).toBe("bad url");
    expect(friendlyError(new Error("ERROR: Unsupported URL"))).toBe("Unsupported URL");
    expect(friendlyError(new Error("ffmpeg merge failed"))).toBe("ffmpeg merge failed");
  });

  it("handles non-Error values and empty messages", () => {
    expect(friendlyError("plain string")).toBe("plain string");
    expect(friendlyError(new Error(""))).toBe("Something went wrong.");
    expect(friendlyError(new Error("Exception: "))).toBe("Something went wrong.");
  });
});
