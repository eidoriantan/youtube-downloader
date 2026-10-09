import { mergeStreams } from "./ffmpeg";
import { hasAudio, hasVideo, pickAudio, sanitizeFilename } from "./format";
import { loadPython } from "./loader";
import { runDownload, runListFormats, syncProxy } from "./pyodide";
import { saveBlob } from "./save";
import type {
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

/** Step 1: fetch raw stream(s) via yt-dlp. No merging happens here. */
export async function downloadStreams({
  proxy,
  url,
  info,
  format,
  onStatus,
}: DownloadOptions): Promise<DownloadedStreams> {
  syncProxy(proxy);
  await loadPython(onStatus);

  const ids = [format.format_id];
  let audio: MediaFormat | undefined;
  if (hasVideo(format) && !hasAudio(format)) {
    audio = pickAudio(info.formats, format);
    if (audio) ids.push(audio.format_id);
  }

  onStatus("Downloading…");
  const files = await runDownload(singleVideoUrl(url), ids);

  const grab = (f: MediaFormat): DownloadedStream => {
    const file = files.find((x) => x.name.includes(`.f${f.format_id}.`));
    if (!file) throw new Error(`Missing downloaded file for format ${f.format_id}`);
    return { data: file.data, ext: file.name.split(".").pop() as string, format: f };
  };
  return { primary: grab(format), audio: audio ? grab(audio) : null };
}

/** Downloads, merges if needed, saves to disk, and returns the filename. */
export async function downloadMedia(opts: DownloadOptions): Promise<string> {
  const { info, format, onStatus } = opts;
  const { primary, audio } = await downloadStreams(opts);

  let data: Uint8Array = primary.data;
  let ext: string = primary.ext;
  if (audio) ({ data, ext } = await mergeStreams({ primary, audio, onStatus }));

  const filename = `${sanitizeFilename(info.title || info.id)}.${ext}`;
  saveBlob(data, ext, hasVideo(format), filename);
  return filename;
}
