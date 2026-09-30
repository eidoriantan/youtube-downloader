import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import type { DownloadedStream, MergedMedia, StatusHandler } from "../types";

const CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";

let ffPromise: Promise<FFmpeg> | null = null;

function getFFmpeg(onStatus: StatusHandler): Promise<FFmpeg> {
  if (!ffPromise) {
    ffPromise = (async () => {
      onStatus("Loading ffmpeg.wasm…");
      const ff = new FFmpeg();
      await ff.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ff;
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
  const ff = await getFFmpeg(onStatus);
  await ff.writeFile(vIn, primary.data);
  await ff.writeFile(aIn, audio.data);
  const code = await ff.exec(["-i", vIn, "-i", aIn, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", out]);
  if (code !== 0) throw new Error("ffmpeg merge failed");

  const data = (await ff.readFile(out)) as Uint8Array;
  await Promise.all([vIn, aIn, out].map((f) => ff.deleteFile(f).catch(() => {})));
  return { data, ext };
}
