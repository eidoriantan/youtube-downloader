import { describe, expect, it } from "vitest";
import { FORMATS, ALL_FORMATS } from "../test/fixtures";
import {
  fmtBytes, fmtQuality, fmtSize, formatKind, groupFormats, hasAudio, hasVideo,
  pickAudio, pickDefaultFormat, sanitizeFilename,
} from "./format";

describe("hasVideo / hasAudio / formatKind", () => {
  it("treats 'none', null and missing codecs as absent", () => {
    expect(hasVideo({ format_id: "a", ext: "m4a", vcodec: "none" })).toBe(false);
    expect(hasVideo({ format_id: "a", ext: "m4a", vcodec: null })).toBe(false);
    expect(hasVideo({ format_id: "a", ext: "m4a" })).toBe(false);
    expect(hasAudio({ format_id: "v", ext: "mp4", acodec: "none" })).toBe(false);
  });

  it("classifies muxed, video-only and audio-only formats", () => {
    expect(formatKind(FORMATS.mp4_360)).toBe("muxed");
    expect(formatKind(FORMATS.mp4_1080)).toBe("video");
    expect(formatKind(FORMATS.m4a)).toBe("audio");
  });
});

describe("fmtBytes / fmtSize", () => {
  it("formats bytes as MB with one decimal", () => {
    expect(fmtBytes(0)).toBe("0.0 MB");
    expect(fmtBytes(1048576 * 2.25)).toBe("2.3 MB");
  });

  it("prefers filesize, falls back to filesize_approx, else 'size unknown'", () => {
    expect(fmtSize(FORMATS.mp4_1080)).toBe("50.0 MB");
    expect(fmtSize(FORMATS.opus)).toBe("3.1 MB");
    expect(fmtSize(FORMATS.webm_720)).toBe("size unknown");
  });
});

describe("fmtQuality", () => {
  it("uses resolution, else height, plus fps for video", () => {
    expect(fmtQuality(FORMATS.mp4_360)).toBe("640x360 30fps");
    expect(fmtQuality(FORMATS.mp4_1080)).toBe("1080p 60fps");
    expect(fmtQuality(FORMATS.webm_720)).toBe("1280x720");
    expect(fmtQuality({ format_id: "x", ext: "mp4", vcodec: "avc1" })).toBe("video");
  });

  it("rounds the audio bitrate, falling back to tbr then 0", () => {
    expect(fmtQuality(FORMATS.m4a)).toBe("130 kbps");
    expect(fmtQuality({ format_id: "x", ext: "m4a", acodec: "aac", tbr: 95.6 })).toBe("96 kbps");
    expect(fmtQuality({ format_id: "x", ext: "m4a", acodec: "aac" })).toBe("0 kbps");
  });
});

describe("groupFormats", () => {
  it("groups by kind in a fixed order, best quality first", () => {
    const groups = groupFormats(ALL_FORMATS);
    expect(groups.map((g) => g.kind)).toEqual(["muxed", "video", "audio"]);
    expect(groups[1].formats.map((f) => f.format_id)).toEqual(["137", "247"]);
    expect(groups[2].formats.map((f) => f.format_id)).toEqual(["251", "140", "250"]);
    expect(groups[1].hint).toMatch(/audio is added/i);
  });

  it("drops empty groups", () => {
    expect(groupFormats([FORMATS.m4a]).map((g) => g.kind)).toEqual(["audio"]);
    expect(groupFormats([])).toEqual([]);
  });
});

describe("pickDefaultFormat", () => {
  it("picks the last listed muxed format (yt-dlp lists best last)", () => {
    const second = { ...FORMATS.mp4_360, format_id: "22" };
    expect(pickDefaultFormat([FORMATS.mp4_360, second, FORMATS.m4a])?.format_id).toBe("22");
  });

  it("falls back to the last format when nothing is muxed", () => {
    expect(pickDefaultFormat([FORMATS.mp4_1080, FORMATS.m4a])?.format_id).toBe("140");
    expect(pickDefaultFormat([])).toBeUndefined();
  });
});

describe("pickAudio", () => {
  it("prefers m4a for mp4 video", () => {
    expect(pickAudio(ALL_FORMATS, FORMATS.mp4_1080)?.format_id).toBe("140");
  });

  it("prefers the best webm audio for webm video", () => {
    expect(pickAudio(ALL_FORMATS, FORMATS.webm_720)?.format_id).toBe("251");
  });

  it("falls back to the best audio of any container, and ignores muxed formats", () => {
    expect(pickAudio([FORMATS.mp4_360, FORMATS.opus, FORMATS.opusLow], FORMATS.mp4_1080)?.format_id).toBe("251");
    expect(pickAudio([FORMATS.mp4_360], FORMATS.mp4_1080)).toBeUndefined();
  });
});

describe("sanitizeFilename", () => {
  it("replaces characters that are invalid in filenames", () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j");
    expect(sanitizeFilename("AC/DC: <Live>")).toBe("AC_DC_ _Live_");
    expect(sanitizeFilename("Me at the zoo")).toBe("Me at the zoo");
  });
});
