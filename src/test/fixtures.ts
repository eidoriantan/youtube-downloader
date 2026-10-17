import type { MediaFormat, MediaInfo, Mp3Metadata } from "../types";

/** A trimmed-down version of what yt-dlp reports for a typical YouTube video. */
export const FORMATS = {
  m4a: { format_id: "140", ext: "m4a", vcodec: "none", acodec: "mp4a.40.2", abr: 129.5, filesize: 3_000_000 },
  opusLow: { format_id: "250", ext: "webm", vcodec: "none", acodec: "opus", abr: 64 },
  opus: { format_id: "251", ext: "webm", vcodec: "none", acodec: "opus", abr: 135, filesize_approx: 3_200_000 },
  mp4_360: { format_id: "18", ext: "mp4", vcodec: "avc1", acodec: "mp4a.40.2", resolution: "640x360", height: 360, fps: 30 },
  mp4_1080: { format_id: "137", ext: "mp4", vcodec: "avc1", acodec: "none", height: 1080, fps: 60, filesize: 50 * 1048576 },
  webm_720: { format_id: "247", ext: "webm", vcodec: "vp9", acodec: "none", resolution: "1280x720", height: 720 },
} satisfies Record<string, MediaFormat>;

export const ALL_FORMATS: MediaFormat[] = Object.values(FORMATS);

export const INFO: MediaInfo = { id: "jNQXAC9IVRw", title: "Me at the zoo", formats: ALL_FORMATS };

export const EMPTY_METADATA: Mp3Metadata = {
  title: "", artist: "", album: "", year: "", genre: "", track: "", cover: null,
};
