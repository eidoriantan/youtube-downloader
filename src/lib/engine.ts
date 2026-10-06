import { mergeStreams } from "./ffmpeg";
import { hasAudio, hasVideo, pickAudio, sanitizeFilename } from "./format";
import { initPyodide, syncProxy } from "./pyodide";
import { saveBlob } from "./save";
import type {
  DownloadedStream,
  DownloadedStreams,
  DownloadOptions,
  MediaFormat,
  MediaInfo,
  StatusHandler,
} from "../types";

import listPy from "../py/list_formats.py?raw";
import downloadPy from "../py/download.py?raw";

export { hasVideo, hasAudio, mergeStreams };

const DL_DIR = "/mnt/dl";

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
  const pyodide = await initPyodide();
  syncProxy(proxy);
  pyodide.globals.set("TARGET_URL", singleVideoUrl(url));
  onStatus("Fetching formats…");
  const out = (await pyodide.runPythonAsync(listPy)) as string;
  return JSON.parse(out) as MediaInfo;
}

/** Step 1: fetch raw stream(s) via yt-dlp. No merging happens here. */
export async function downloadStreams({
  proxy,
  url,
  info,
  format,
  onStatus,
}: DownloadOptions): Promise<DownloadedStreams> {
  const pyodide = await initPyodide();
  syncProxy(proxy);

  const ids = [format.format_id];
  let audio: MediaFormat | undefined;
  if (hasVideo(format) && !hasAudio(format)) {
    audio = pickAudio(info.formats, format);
    if (audio) ids.push(audio.format_id);
  }

  pyodide.globals.set("TARGET_URL", singleVideoUrl(url));
  pyodide.globals.set("FORMAT_IDS", pyodide.toPy(ids));
  onStatus("Downloading (the page may freeze while data streams in)…");
  await pyodide.runPythonAsync(downloadPy);

  const files = pyodide.FS.readdir(DL_DIR).filter((n) => n !== "." && n !== "..");
  const grab = (f: MediaFormat): DownloadedStream => {
    const name = files.find((n) => n.includes(`.f${f.format_id}.`));
    if (!name) throw new Error(`Missing downloaded file for format ${f.format_id}`);
    const data = pyodide.FS.readFile(`${DL_DIR}/${name}`);
    pyodide.FS.unlink(`${DL_DIR}/${name}`);
    return { data, ext: name.split(".").pop() as string, format: f };
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
