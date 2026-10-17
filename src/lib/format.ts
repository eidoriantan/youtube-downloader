import type { FormatGroup, FormatKind, MediaFormat } from "../types";

export const hasVideo = (f: MediaFormat): boolean => !!f.vcodec && f.vcodec !== "none";
export const hasAudio = (f: MediaFormat): boolean => !!f.acodec && f.acodec !== "none";

export const formatKind = (f: MediaFormat): FormatKind =>
  hasVideo(f) && hasAudio(f) ? "muxed" : hasVideo(f) ? "video" : "audio";

export const fmtBytes = (bytes: number): string => `${(bytes / 1048576).toFixed(1)} MB`;

export function fmtSize(f: MediaFormat): string {
  const bytes = f.filesize || f.filesize_approx;
  return bytes ? fmtBytes(bytes) : "size unknown";
}

/** Short quality string, e.g. "1080p 60fps" or "128 kbps". */
export function fmtQuality(f: MediaFormat): string {
  if (hasVideo(f)) {
    const res = f.resolution || (f.height ? `${f.height}p` : "video");
    return f.fps ? `${res} ${f.fps}fps` : res;
  }
  return `${Math.round(f.abr || f.tbr || 0)} kbps`;
}

const GROUPS: Omit<FormatGroup, "formats">[] = [
  { kind: "muxed", title: "Video and audio" },
  { kind: "video", title: "Video only", hint: "Audio is added automatically" },
  { kind: "audio", title: "Audio only" },
];

const rank = (f: MediaFormat) => (hasVideo(f) ? f.height || 0 : f.abr || f.tbr || 0);

/** Groups formats by kind, best quality first; empty groups are dropped. */
export function groupFormats(formats: MediaFormat[]): FormatGroup[] {
  return GROUPS.map((g) => ({
    ...g,
    formats: formats.filter((f) => formatKind(f) === g.kind).sort((a, b) => rank(b) - rank(a)),
  })).filter((g) => g.formats.length > 0);
}

/** Highest-quality stream that needs no merge, else the last listed format. */
export function pickDefaultFormat(formats: MediaFormat[]): MediaFormat | undefined {
  return (
    [...formats].reverse().find((f) => hasVideo(f) && hasAudio(f)) ?? formats[formats.length - 1]
  );
}

/** Video-only streams (no sound), best first: resolution, then frame rate, then bitrate. */
export function videoFormats(formats: MediaFormat[]): MediaFormat[] {
  return formats
    .filter((f) => hasVideo(f) && !hasAudio(f))
    .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.fps || 0) - (a.fps || 0) || (b.tbr || 0) - (a.tbr || 0));
}

/** Audio-only streams, highest bitrate first. */
export function audioFormats(formats: MediaFormat[]): MediaFormat[] {
  return formats
    .filter((f) => hasAudio(f) && !hasVideo(f))
    .sort((a, b) => (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0));
}

/** Highest-resolution video stream, preferring mp4 among equals for wider playback support. */
export function pickVideo(formats: MediaFormat[]): MediaFormat | undefined {
  const videos = videoFormats(formats);
  const top = videos[0]?.height;
  return videos.find((f) => f.height === top && f.ext === "mp4") ?? videos[0];
}

/** Best audio stream, preferring one that fits the video's container so no .mkv fallback is needed. */
export function pickAudio(formats: MediaFormat[], video?: MediaFormat): MediaFormat | undefined {
  const audios = audioFormats(formats);
  const preferred = video?.ext === "mp4" ? "m4a" : "webm";
  return (video && audios.find((f) => f.ext === preferred)) || audios[0];
}

/** Container for a stream-copied merge: native when the pair fits, else mkv. */
export function mergedExt(video: string, audio: string): "mp4" | "webm" | "mkv" {
  if (video === "mp4" && audio === "m4a") return "mp4";
  if (video === "webm" && audio === "webm") return "webm";
  return "mkv";
}

/** Extension of the saved file for a given selection, mirroring what `downloadMedia` produces. */
export function outputExt(video: MediaFormat | null, audio: MediaFormat | null, toMp3: boolean): string {
  if (video && audio) return mergedExt(video.ext, audio.ext);
  if (video) return video.ext;
  return toMp3 ? "mp3" : (audio?.ext ?? "");
}

export const sanitizeFilename = (name: string): string => name.replace(/[\\/:*?"<>|]+/g, "_");
