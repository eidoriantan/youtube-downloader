import type { FormatGroup, FormatKind, MediaFormat } from "../types";

export const hasVideo = (f: MediaFormat): boolean => !!f.vcodec && f.vcodec !== "none";
export const hasAudio = (f: MediaFormat): boolean => !!f.acodec && f.acodec !== "none";

export const formatKind = (f: MediaFormat): FormatKind =>
  hasVideo(f) && hasAudio(f) ? "muxed" : hasVideo(f) ? "video" : "audio";

export function fmtSize(f: MediaFormat): string {
  const bytes = f.filesize || f.filesize_approx;
  return bytes ? `${(bytes / 1048576).toFixed(1)} MB` : "size unknown";
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

/** Best audio-only format compatible with the video container. */
export function pickAudio(formats: MediaFormat[], video: MediaFormat): MediaFormat | undefined {
  const audios = formats
    .filter((f) => hasAudio(f) && !hasVideo(f))
    .sort((a, b) => (b.abr || 0) - (a.abr || 0));
  const preferred = video.ext === "mp4" ? "m4a" : "webm";
  return audios.find((f) => f.ext === preferred) ?? audios[0];
}

export const sanitizeFilename = (name: string): string => name.replace(/[\\/:*?"<>|]+/g, "_");
