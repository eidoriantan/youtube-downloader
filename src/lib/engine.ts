import { convertToMp3, mergeStreams } from "./ffmpeg";
import { fmtBytes, hasAudio, hasVideo, pickAudio, sanitizeFilename } from "./format";
import { writeMp3Tags } from "./id3";
import { loadPython } from "./loader";
import { runDownload, runListFormats, syncProxy } from "./pyodide";
import { saveBlob } from "./save";
import type {
  DownloadStage,
  DownloadStageId,
  DownloadedStream,
  DownloadedStreams,
  DownloadOptions,
  MediaFormat,
  MediaInfo,
  StatusHandler,
} from "../types";

export { hasVideo, hasAudio, mergeStreams };

/**
 * A YouTube watch URL can include a playlist ID alongside the selected video.
 * Keep only `v` so yt-dlp does not expand the playlist for either operation.
 */
export function singleVideoUrl(url: string): string {
  const parsed = new URL(url);
  const videoId = parsed.searchParams.get("v");
  if (!videoId) return url;

  parsed.search = "";
  parsed.searchParams.set("v", videoId);
  parsed.hash = "";
  return parsed.toString();
}

export async function listFormats(
  proxy: string,
  url: string,
  onStatus: StatusHandler,
): Promise<MediaInfo> {
  syncProxy(proxy);
  await loadPython(onStatus);
  onStatus("Fetching formats…");
  return JSON.parse(await runListFormats(singleVideoUrl(url))) as MediaInfo;
}

/** The stages a download goes through, in order, given what it needs. */
function planStages(format: MediaFormat, mergeAudio: boolean, toMp3: boolean): DownloadStage[] {
  const stages: DownloadStage[] = [
    hasVideo(format) ? { id: "video", label: "Download video" } : { id: "audio", label: "Download audio" },
  ];
  if (mergeAudio) {
    stages.push({ id: "audio", label: "Download audio" }, { id: "merge", label: "Merge audio and video" });
  }
  if (toMp3) stages.push({ id: "mp3", label: "Convert to MP3" }, { id: "tags", label: "Write ID3 tags" });
  stages.push({ id: "save", label: "Save file" });
  return stages;
}

/** Step 1: fetch raw stream(s) via yt-dlp. No merging happens here. */
export async function downloadStreams(
  { proxy, url, info, format }: DownloadOptions,
  report: (stage: DownloadStageId, fraction: number | null, detail: string) => void,
): Promise<DownloadedStreams> {
  const first: DownloadStageId = hasVideo(format) ? "video" : "audio";
  syncProxy(proxy);
  await loadPython((msg) => report(first, null, msg));

  const formats = [format];
  const audio = hasVideo(format) && !hasAudio(format) ? pickAudio(info.formats, format) : undefined;
  if (audio) formats.push(audio);

  report(first, null, "Fetching stream details…");
  const files = await runDownload(singleVideoUrl(url), formats.map((f) => f.format_id), (i, done, total) => {
    // yt-dlp doesn't always know the size up front; fall back to the listed one.
    total ||= formats[i].filesize || formats[i].filesize_approx || 0;
    report(
      i === 0 ? first : "audio",
      total ? Math.min(done / total, 1) : null,
      total ? `${fmtBytes(done)} of ${fmtBytes(total)}` : `${fmtBytes(done)} downloaded`,
    );
  });

  const grab = (f: MediaFormat): DownloadedStream => {
    const file = files.find((x) => x.name.includes(`.f${f.format_id}.`));
    if (!file) throw new Error(`Missing downloaded file for format ${f.format_id}`);
    return { data: file.data, ext: file.name.split(".").pop() as string, format: f };
  };
  return { primary: grab(format), audio: audio ? grab(audio) : null };
}

/** Downloads, merges if needed, saves to disk, and returns the filename. */
export async function downloadMedia(opts: DownloadOptions): Promise<string> {
  const { info, format, mp3, onProgress } = opts;
  // MP3 conversion is only offered for audio-only formats.
  const toMp3 = !!mp3 && !hasVideo(format);
  const stages = planStages(format, hasVideo(format) && !hasAudio(format), toMp3);
  const report = (stage: DownloadStageId, fraction: number | null, detail: string) =>
    onProgress({ stages, current: stages.findIndex((s) => s.id === stage), fraction, detail });

  report(stages[0].id, null, "Starting…");
  const { primary, audio } = await downloadStreams(opts, report);

  let data: Uint8Array = primary.data;
  let ext: string = primary.ext;
  if (audio) {
    const detail = "Combining both streams into one file without re-encoding";
    report("merge", null, detail);
    ({ data, ext } = await mergeStreams({ primary, audio, onProgress: (f) => report("merge", f, detail) }));
  }

  if (toMp3 && mp3) {
    const detail = `Re-encoding at ${mp3.bitrate} kbps`;
    report("mp3", null, detail);
    data = await convertToMp3({ audio: primary, bitrate: mp3.bitrate, onProgress: (f) => report("mp3", f, detail) });
    report("tags", null, "Adding title, artist and cover art");
    data = await writeMp3Tags(data, mp3.metadata);
    ext = "mp3";
  }

  const filename = `${sanitizeFilename(info.title || info.id)}.${ext}`;
  report("save", null, "Handing the file to your browser…");
  saveBlob(data, ext, hasVideo(format), filename);
  report("save", 1, `Saved as ${filename}`);
  return filename;
}
