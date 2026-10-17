import { beforeEach, describe, expect, it, vi } from "vitest";

/** A decoded chunk with one Float32 plane per channel. */
function sample(planes: number[][]) {
  return {
    numberOfFrames: planes[0].length,
    numberOfChannels: planes.length,
    copyTo: (dest: Float32Array, { planeIndex }: { planeIndex: number }) => dest.set(planes[planeIndex]),
    close: vi.fn(),
  };
}

const media = vi.hoisted(() => ({
  track: null as null | Record<string, unknown>,
  chunks: [] as ReturnType<typeof sample>[],
  range: [] as unknown[],
  dispose: vi.fn(),
}));

vi.mock("mediabunny", () => ({
  ALL_FORMATS: [],
  BlobSource: class {},
  Input: class {
    getPrimaryAudioTrack = async () => media.track;
    computeDuration = async () => 212.5;
    dispose = media.dispose;
  },
  AudioSampleSink: class {
    async *samples(...range: unknown[]) {
      media.range = range;
      yield* media.chunks;
    }
  },
}));

import { decodeAudio, toInt16 } from "./audio";

beforeEach(() => {
  media.dispose.mockReset();
  media.track = { sampleRate: 4, codec: "opus", canDecode: async () => true };
});

describe("decodeAudio", () => {
  it("averages channels to mono, trims to the time limit and reports the full duration", async () => {
    media.chunks = [
      sample([[1, 1, 0.5, 0], [0, -1, 0.5, 0]]),
      sample([[0.2, 0.2, 0.2, 0.2], [0.2, 0.2, 0.2, 0.2]]),
      sample([[1, 1, 1, 1], [1, 1, 1, 1]]), // past the limit
    ];
    const out = await decodeAudio(new Uint8Array([1]), 2);

    expect(media.range).toEqual([0, 2]);
    expect(out.sampleRate).toBe(4);
    expect(out.duration).toBe(212.5);
    expect(Array.from(out.samples)).toEqual(Array.from(toInt16(new Float32Array([0.5, 0, 0.5, 0, 0.2, 0.2, 0.2, 0.2]))));
    media.chunks.forEach((c) => expect(c.close).toHaveBeenCalled());
    expect(media.dispose).toHaveBeenCalled();
  });

  it("fails clearly without an audio track, and when the codec can't be decoded", async () => {
    media.track = null;
    await expect(decodeAudio(new Uint8Array([1]), 120)).rejects.toThrow("No audio track found in this file.");
    media.track = { sampleRate: 48000, codec: "opus", canDecode: async () => false };
    await expect(decodeAudio(new Uint8Array([1]), 120)).rejects.toThrow('This browser cannot decode the "opus" codec.');
    expect(media.dispose).toHaveBeenCalledTimes(2);
  });
});

describe("toInt16", () => {
  it("scales and clamps to the 16-bit range", () => {
    expect(Array.from(toInt16(new Float32Array([0, 1, -1, 2, -2, 0.5])))).toEqual([0, 32767, -32768, 32767, -32768, 16383]);
  });
});
