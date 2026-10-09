import MP3Tag from "mp3tag.js";
import type { Mp3Metadata } from "../types";

/** ID3v2.3 text frame for each form field. */
const TEXT_FRAMES = {
  title: "TIT2",
  artist: "TPE1",
  album: "TALB",
  year: "TYER",
  genre: "TCON",
  track: "TRCK",
} as const;

/** Writes the non-blank fields of `metadata` as an ID3v2.3 tag. */
export async function writeMp3Tags(mp3: Uint8Array, metadata: Mp3Metadata): Promise<Uint8Array> {
  const v2: Record<string, unknown> = {};
  for (const [field, frame] of Object.entries(TEXT_FRAMES)) {
    const value = metadata[field as keyof typeof TEXT_FRAMES].trim();
    if (value) v2[frame] = value;
  }
  if (metadata.cover) {
    const bytes = new Uint8Array(await metadata.cover.arrayBuffer());
    // type 3 = front cover
    v2.APIC = [{ format: metadata.cover.type, type: 3, description: "", data: Array.from(bytes) }];
  }
  if (Object.keys(v2).length === 0) return mp3;

  const buffer = mp3.buffer.slice(mp3.byteOffset, mp3.byteOffset + mp3.byteLength) as ArrayBuffer;
  const tags = { v2 } as unknown as Parameters<typeof MP3Tag.writeBuffer>[1];
  const out = MP3Tag.writeBuffer(buffer, tags, { id3v2: { version: 3 } });
  return new Uint8Array(out as ArrayBuffer);
}
