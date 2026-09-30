import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import bootstrapPy from "../py/ytdlp_bootstrap.py?raw";
import listPy from "../py/list_formats.py?raw";
import downloadPy from "../py/download.py?raw";

let pyPromise = null;
let ffPromise = null;

export function initPyodide(onStatus = () => {}) {
  if (!pyPromise) {
    pyPromise = (async () => {
      onStatus("Loading Pyodide…");
      const pyodide = await window.loadPyodide();
      await pyodide.loadPackage(["micropip", "pyodide-http"]);
      const micropip = pyodide.pyimport("micropip");
      onStatus("Installing yt-dlp…");
      await micropip.install(["yt-dlp", "yt-dlp-ejs"]);
      await pyodide.runPythonAsync(bootstrapPy);
      return pyodide;
    })().catch((e) => { pyPromise = null; throw e; });
  }
  return pyPromise;
}

function normalizeProxy(p) {
  let s = p.trim();
  if (!/^https?:\/\//.test(s)) s = "http://" + s;
  return s.split("?")[0]; // the script appends ?url=...
}

export async function listFormats(proxy, url, onStatus) {
  const pyodide = await initPyodide(onStatus);
  pyodide.globals.set("TARGET_URL", url);
  onStatus("Fetching formats…");
  const out = await pyodide.runPythonAsync(listPy);
  return JSON.parse(out);
}

async function getFFmpeg(onStatus) {
  if (!ffPromise) {
    ffPromise = (async () => {
      onStatus("Loading ffmpeg.wasm…");
      const ff = new FFmpeg();
      const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
      await ff.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ff;
    })().catch((e) => { ffPromise = null; throw e; });
  }
  return ffPromise;
}

const hasVideo = (f) => f.vcodec && f.vcodec !== "none";
const hasAudio = (f) => f.acodec && f.acodec !== "none";
export { hasVideo, hasAudio };

/** Choose the best audio-only format compatible with the video container. */
function pickAudio(formats, video) {
  const audios = formats.filter((f) => hasAudio(f) && !hasVideo(f))
    .sort((a, b) => (b.abr || 0) - (a.abr || 0));
  const pref = video.ext === "mp4" ? "m4a" : "webm";
  return audios.find((f) => f.ext === pref) || audios[0];
}

/** Step 1: fetch raw stream(s) via yt-dlp. No merging happens here. */
export async function downloadStreams({ proxy, url, info, format, onStatus }) {
  const pyodide = await initPyodide(onStatus);
  globalThis.YTDLP_CORS_PROXY = normalizeProxy(proxy);

  const ids = [format.format_id];
  let audio = null;
  if (hasVideo(format) && !hasAudio(format)) {
    audio = pickAudio(info.formats, format);
    if (audio) ids.push(audio.format_id);
  }

  pyodide.globals.set("TARGET_URL", url);
  pyodide.globals.set("FORMAT_IDS", pyodide.toPy(ids));
  onStatus("Downloading (the page may freeze while data streams in)…");
  await pyodide.runPythonAsync(downloadPy);

  const files = pyodide.FS.readdir("/mnt/dl").filter((n) => n !== "." && n !== "..");
  const grab = (f) => {
    const name = files.find((n) => n.includes(`.f${f.format_id}.`));
    if (!name) throw new Error(`Missing downloaded file for format ${f.format_id}`);
    const data = pyodide.FS.readFile(`/mnt/dl/${name}`);
    pyodide.FS.unlink(`/mnt/dl/${name}`);
    return { data, ext: name.split(".").pop(), format: f };
  };
  // `video` is the primary stream (may already include audio); `audio` only set when a merge is required.
  return { primary: grab(format), audio: audio ? grab(audio) : null };
}

/** Step 2 (only when needed): merge video + audio with ffmpeg.wasm. */
export async function mergeStreams({ primary, audio, onStatus }) {
  const ext = primary.ext === "mp4" && audio.ext === "m4a" ? "mp4"
    : primary.ext === "webm" && audio.ext === "webm" ? "webm" : "mkv";
  const vIn = `v.${primary.ext}`, aIn = `a.${audio.ext}`, out = `out.${ext}`;
  onStatus("Merging audio + video with ffmpeg.wasm…");
  const ff = await getFFmpeg(onStatus);
  await ff.writeFile(vIn, primary.data);
  await ff.writeFile(aIn, audio.data);
  const code = await ff.exec(["-i", vIn, "-i", aIn, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", out]);
  if (code !== 0) throw new Error("ffmpeg merge failed");
  const data = await ff.readFile(out);
  await Promise.all([vIn, aIn, out].map((f) => ff.deleteFile(f).catch(() => {})));
  return { data, ext };
}

function saveBlob(data, ext, isVideo, filename) {
  const type = isVideo ? `video/${ext === "mkv" ? "x-matroska" : ext}` : `audio/${ext}`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

export async function downloadMedia({ proxy, url, info, format, onStatus }) {
  const { primary, audio } = await downloadStreams({ proxy, url, info, format, onStatus });
  const safeTitle = (info.title || info.id).replace(/[\\/:*?"<>|]+/g, "_");
  let data = primary.data, ext = primary.ext;
  if (audio) ({ data, ext } = await mergeStreams({ primary, audio, onStatus }));
  const filename = `${safeTitle}.${ext}`;
  saveBlob(data, ext, hasVideo(format), filename);
  return filename;
}
