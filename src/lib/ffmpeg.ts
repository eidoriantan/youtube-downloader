import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import type { DownloadedStream, MergedMedia, Mp3Bitrate, StepReporter } from "../types";

type FractionHandler = (fraction: number) => void;

const CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";

let ffPromise: Promise<FFmpeg> | null = null;

/** Loads ffmpeg.wasm once; retries on the next call if a previous attempt failed. */
export function getFFmpeg(report: StepReporter = () => {}): Promise<FFmpeg> {
  if (!ffPromise) {
    ffPromise = (async () => {
      report("ffmpeg", "active");
      try {
        const ff = new FFmpeg();
        await ff.load({
          coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
        });
        report("ffmpeg", "done");
        return ff;
      } catch (e) {
        report("ffmpeg", "error");
        throw e;
      }
    })().catch((e) => {
      ffPromise = null;
      throw e;
    });
  }
  return ffPromise;
}

/** Runs ffmpeg, forwarding its 0–1 progress estimate while it works. */
async function exec(ff: FFmpeg, args: string[], onProgress?: FractionHandler): Promise<number> {
  const listener = ({ progress }: { progress: number }) => onProgress?.(Math.min(Math.max(progress, 0), 1));
  ff.on("progress", listener);
  try {
    return await ff.exec(args);
  } finally {
    ff.off("progress", listener);
  }
}

function pickContainer(video: string, audio: string): MergedMedia["ext"] {
  if (video === "mp4" && audio === "m4a") return "mp4";
  if (video === "webm" && audio === "webm") return "webm";
  return "mkv";
}

/** Stream-copies a video and an audio file into one container. */
export async function mergeStreams(args: {
  primary: DownloadedStream;
  audio: DownloadedStream;
  onProgress?: FractionHandler;
}): Promise<MergedMedia> {
  const { primary, audio, onProgress } = args;
  const ext = pickContainer(primary.ext, audio.ext);
  const vIn = `v.${primary.ext}`;
  const aIn = `a.${audio.ext}`;
  const out = `out.${ext}`;

  const ff = await getFFmpeg(); // already loaded at startup; retries if that failed
  await ff.writeFile(vIn, primary.data);
  await ff.writeFile(aIn, audio.data);
  const code = await exec(ff, ["-i", vIn, "-i", aIn, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", out], onProgress);
  if (code !== 0) throw new Error("ffmpeg merge failed");

  const data = (await ff.readFile(out)) as Uint8Array;
  await Promise.all([vIn, aIn, out].map((f) => ff.deleteFile(f).catch(() => {})));
  return { data, ext };
}

/** Re-encodes an audio stream to a constant-bitrate MP3 with no tags. */
export async function convertToMp3(args: {
  audio: DownloadedStream;
  bitrate: Mp3Bitrate;
  onProgress?: FractionHandler;
}): Promise<Uint8Array> {
  const { audio, bitrate, onProgress } = args;
  const input = `in.${audio.ext}`;
  const out = "out.mp3";

  const ff = await getFFmpeg();
  await ff.writeFile(input, audio.data);
  const code = await exec(ff, [
    "-i", input, "-vn", "-map_metadata", "-1",
    "-c:a", "libmp3lame", "-b:a", `${bitrate}k`, out,
  ], onProgress);
  if (code !== 0) throw new Error("ffmpeg MP3 conversion failed");

  const data = (await ff.readFile(out)) as Uint8Array;
  await Promise.all([input, out].map((f) => ff.deleteFile(f).catch(() => {})));
  return data;
}
