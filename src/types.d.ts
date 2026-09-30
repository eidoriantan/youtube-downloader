/** A single downloadable stream as reported by yt-dlp. */
export interface MediaFormat {
  format_id: string;
  ext: string;
  vcodec?: string | null;
  acodec?: string | null;
  resolution?: string | null;
  format_note?: string | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  /** Audio bitrate (kbps). */
  abr?: number | null;
  /** Total bitrate (kbps). */
  tbr?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
}

/** The subset of yt-dlp's info dict that `list_formats.py` returns. */
export interface MediaInfo {
  id: string;
  title: string;
  formats: MediaFormat[];
  thumbnail?: string | null;
  duration?: number | null;
  uploader?: string | null;
}

/** muxed = video+audio in one stream, video = video only, audio = audio only. */
export type FormatKind = "muxed" | "video" | "audio";

export interface FormatGroup {
  kind: FormatKind;
  title: string;
  hint?: string;
  formats: MediaFormat[];
}

/** Receives human-readable progress messages. */
export type StatusHandler = (message: string) => void;

/** Raw bytes of one downloaded stream. */
export interface DownloadedStream {
  data: Uint8Array;
  ext: string;
  format: MediaFormat;
}

export interface DownloadedStreams {
  /** Main stream; already contains audio unless `audio` is set. */
  primary: DownloadedStream;
  /** Present only when a separate audio stream must be merged in. */
  audio: DownloadedStream | null;
}

export interface MergedMedia {
  data: Uint8Array;
  ext: "mp4" | "webm" | "mkv";
}

export interface DownloadOptions {
  proxy: string;
  url: string;
  info: MediaInfo;
  format: MediaFormat;
  onStatus: StatusHandler;
}

/** Steps shown on the loading screen, in the order they run. */
export type LoadStepId = "runtime" | "packages" | "ytdlp" | "ffmpeg";
export type LoadStepState = "pending" | "active" | "done" | "error";

export interface LoadStep {
  id: LoadStepId;
  label: string;
  state: LoadStepState;
}

export interface LoadState {
  steps: LoadStep[];
  ready: boolean;
  /** Set when a required step failed. */
  error: string | null;
}

export type StepReporter = (id: LoadStepId, state: LoadStepState) => void;
