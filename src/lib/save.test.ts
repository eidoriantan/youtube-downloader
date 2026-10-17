import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveBlob } from "./save";

describe("saveBlob", () => {
  let clicked: HTMLAnchorElement[];
  let blobs: Blob[];

  beforeEach(() => {
    vi.useFakeTimers();
    clicked = [];
    blobs = [];
    URL.createObjectURL = vi.fn((b: Blob) => {
      blobs.push(b);
      return `blob:test/${blobs.length}`;
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clicks a download link with the file name and bytes", async () => {
    saveBlob(new Uint8Array([1, 2, 3]), "mp4", true, "clip.mp4");
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe("clip.mp4");
    expect(clicked[0].href).toBe("blob:test/1");
    expect(new Uint8Array(await blobs[0].arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it.each([
    ["mp4", true, "video/mp4"],
    ["webm", true, "video/webm"],
    ["mkv", true, "video/x-matroska"],
    ["mp3", false, "audio/mpeg"],
    ["m4a", false, "audio/m4a"],
    ["webm", false, "audio/webm"],
  ])("uses the right MIME type for .%s (video=%s)", (ext, isVideo, type) => {
    saveBlob(new Uint8Array(), ext, isVideo, `f.${ext}`);
    expect(blobs[0].type).toBe(type);
  });

  it("revokes the object URL after a minute", () => {
    saveBlob(new Uint8Array(), "mp3", false, "a.mp3");
    vi.advanceTimersByTime(59_999);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });
});
