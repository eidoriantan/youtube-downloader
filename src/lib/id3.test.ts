import MP3Tag from "mp3tag.js";
import { describe, expect, it } from "vitest";
import { EMPTY_METADATA } from "../test/fixtures";
import { writeMp3Tags } from "./id3";

/** One silent MPEG-1 Layer III frame (128 kbps, 44.1 kHz), repeated. */
function silentMp3(frames = 4): Uint8Array {
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x64]);
  const out = new Uint8Array(frame.length * frames);
  for (let i = 0; i < frames; i++) out.set(frame, i * frame.length);
  return out;
}

function readTags(bytes: Uint8Array) {
  const tag = new MP3Tag(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  tag.read();
  if (tag.error) throw new Error(tag.error);
  return tag.tags as unknown as { v2: Record<string, unknown>; v2Details?: { version: number[] } };
}

describe("writeMp3Tags", () => {
  it("returns the input untouched when every field is blank", async () => {
    const mp3 = silentMp3();
    const out = await writeMp3Tags(mp3, { ...EMPTY_METADATA, title: "   " });
    expect(out).toBe(mp3);
  });

  it("writes trimmed, non-blank text fields as ID3v2.3 frames", async () => {
    const mp3 = silentMp3();
    const out = await writeMp3Tags(mp3, {
      ...EMPTY_METADATA, title: "  Me at the zoo ", artist: "jawed", album: "", year: "2005", genre: "Vlog", track: "1",
    });

    expect(String.fromCharCode(...out.slice(0, 4))).toBe("ID3\u0003");
    const { v2 } = readTags(out);
    expect(v2).toMatchObject({ TIT2: "Me at the zoo", TPE1: "jawed", TYER: "2005", TCON: "Vlog", TRCK: "1" });
    expect(v2.TALB).toBeUndefined();
    // The audio frames follow the tag unchanged.
    expect(out.slice(out.length - mp3.length)).toEqual(mp3);
  });

  it("embeds the cover as the front cover picture", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const cover = new File([png], "cover.png", { type: "image/png" });
    const out = await writeMp3Tags(silentMp3(), { ...EMPTY_METADATA, cover });

    const apic = readTags(out).v2.APIC as { format: string; type: number; data: number[] }[];
    expect(apic).toHaveLength(1);
    expect(apic[0]).toMatchObject({ format: "image/png", type: 3 });
    expect(apic[0].data).toEqual(Array.from(png));
  });

  it("respects the byte offset of a Uint8Array view", async () => {
    const mp3 = silentMp3();
    const padded = new Uint8Array(mp3.length + 10);
    padded.set(mp3, 5);
    const view = padded.subarray(5, 5 + mp3.length);
    const out = await writeMp3Tags(view, { ...EMPTY_METADATA, title: "x" });
    expect(out.slice(out.length - mp3.length)).toEqual(mp3);
  });
});
