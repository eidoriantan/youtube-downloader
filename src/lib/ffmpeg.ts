import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import type { DownloadedStream, MergedMedia, Mp3Bitrate, StatusHandler, StepReporter } from "../types";

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

function pickContainer(video: string, audio: string): MergedMedia["ext"] {
  if (video === "mp4" && audio === "m4a") return "mp4";
  if (video === "webm" && audio === "webm") return "webm";
  return "mkv";
}

/** Stream-copies a video and an audio file into one container. */
export async function mergeStreams(args: {
  primary: DownloadedStream;
  audio: DownloadedStream;
  onStatus: StatusHandler;
}): Promise<MergedMedia> {
  const { primary, audio, onStatus } = args;
  const ext = pickContainer(primary.ext, audio.ext);
  const vIn = `v.${primary.ext}`;
  const aIn = `a.${audio.ext}`;
  const out = `out.${ext}`;

  onStatus("Merging audio and video…");
  const ff = await getFFmpeg(); // already loaded at startup; retries if that failed
  await ff.writeFile(vIn, primary.data);
  await ff.writeFile(aIn, audio.data);
  const code = await ff.exec(["-i", vIn, "-i", aIn, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", out]);
  if (code !== 0) throw new Error("ffmpeg merge failed");

  const data = (await ff.readFile(out)) as Uint8Array;
  await Promise.all([vIn, aIn, out].map((f) => ff.deleteFile(f).catch(() => {})));
  return { data, ext };
}

/** Re-encodes an audio stream to a constant-bitrate MP3 with no tags. */
export async function convertToMp3(args: {
  audio: DownloadedStream;
  bitrate: Mp3Bitrate;
  onStatus: StatusHandler;
}): Promise<Uint8Array> {
  const { audio, bitrate, onStatus } = args;
  const input = `in.${audio.ext}`;
  const out = "out.mp3";

  onStatus("Converting to MP3…");
  const ff = await getFFmpeg();
  await ff.writeFile(input, audio.data);
  const code = await ff.exec([
    "-i", input, "-vn", "-map_metadata", "-1",
    "-c:a", "libmp3lame", "-b:a", `${bitrate}k`, out,
  ]);
  if (code !== 0) throw new Error("ffmpeg MP3 conversion failed");

  const data = (await ff.readFile(out)) as Uint8Array;
  await Promise.all([input, out].map((f) => ff.deleteFile(f).catch(() => {})));
  return data;
}
