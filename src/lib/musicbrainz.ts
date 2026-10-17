import type { Mp3Metadata } from "../types";

const ACOUSTID_URL = "https://api.acoustid.org/v2/lookup";
const MB_URL = "https://musicbrainz.org/ws/2";
const CAA_URL = "https://coverartarchive.org";

/** AcoustID results below this score are treated as no match. */
const MIN_SCORE = 0.5;

interface Genre { name: string; count: number }
interface ArtistCredit { name: string; joinphrase?: string }

export interface MbReleaseGroup {
  id: string;
  "primary-type"?: string | null;
  "secondary-types"?: string[];
  "first-release-date"?: string;
  genres?: Genre[];
}

export interface MbRelease {
  id: string;
  title: string;
  status?: string | null;
  date?: string;
  "release-group"?: MbReleaseGroup;
  media?: { tracks?: { position: number }[] }[];
}

export interface MbRecording {
  id: string;
  title: string;
  "artist-credit"?: ArtistCredit[];
  genres?: Genre[];
  releases?: MbRelease[];
}

interface AcoustIdResponse {
  status: string;
  error?: { message: string };
  results?: { score: number; recordings?: { id: string }[] }[];
}

/**
 * The first recording MBID of AcoustID's first result, which is its highest
 * scoring match, or null if that result is missing or scores too low.
 */
export async function lookupFingerprint(fingerprint: string, duration: number, key: string): Promise<string | null> {
  // POST keeps the long fingerprint out of the URL; a form body needs no CORS preflight.
  const body = new URLSearchParams({
    client: key, format: "json", meta: "recordingids", duration: String(Math.round(duration)), fingerprint,
  });
  const res = await fetch(ACOUSTID_URL, { method: "POST", body });
  const data = (await res.json()) as AcoustIdResponse;
  if (data.status !== "ok") throw new Error(`AcoustID: ${data.error?.message ?? res.statusText}`);

  const best = data.results?.[0];
  return best && best.score >= MIN_SCORE ? (best.recordings?.[0]?.id ?? null) : null;
}

async function fetchRecording(id: string): Promise<MbRecording> {
  const inc = "artist-credits+releases+release-groups+media+genres";
  const res = await fetch(`${MB_URL}/recording/${id}?inc=${inc}&fmt=json`);
  if (!res.ok) throw new Error(`MusicBrainz: ${res.status} ${res.statusText}`);
  return (await res.json()) as MbRecording;
}

/** 0 = official studio album, 1 = official single or EP, 2 = anything else. */
function tier(release: MbRelease): number {
  const group = release["release-group"];
  const plain = !group?.["secondary-types"]?.length;
  if (release.status !== "Official" || !plain) return 2;
  if (group?.["primary-type"] === "Album") return 0;
  if (group?.["primary-type"] === "Single" || group?.["primary-type"] === "EP") return 1;
  return 2;
}

/** Undated releases sort after dated ones. */
const dateOf = (release: MbRelease) => release.date || release["release-group"]?.["first-release-date"] || "9999";

/**
 * Picks the recording's earliest official album, then single or EP, then
 * anything; ties go to the first listed. Null if it has no releases.
 */
export function pickRelease(recording: MbRecording): MbRelease | null {
  const releases = recording.releases ?? [];
  if (!releases.length) return null;
  return releases.reduce((best, r) => {
    const byTier = tier(r) - tier(best);
    return byTier < 0 || (byTier === 0 && dateOf(r) < dateOf(best)) ? r : best;
  });
}

const topGenre = (genres: Genre[] = []) =>
  genres.reduce<Genre | null>((top, g) => (!top || g.count > top.count ? g : top), null)?.name ?? "";

const credit = (credits: ArtistCredit[] = []) => credits.map((c) => c.name + (c.joinphrase ?? "")).join("");

/** The release's front cover, else the release group's (the album's chosen cover). */
async function fetchCover(release: MbRelease): Promise<File | null> {
  const urls = [`${CAA_URL}/release/${release.id}/front-500`];
  const group = release["release-group"];
  if (group) urls.push(`${CAA_URL}/release-group/${group.id}/front-500`);
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const type = blob.type === "image/png" ? "image/png" : "image/jpeg";
      return new File([blob], type === "image/png" ? "cover.png" : "cover.jpg", { type });
    } catch {
      /* try the next source */
    }
  }
  return null;
}

/** Turns the chosen recording and release into form fields. */
async function toMetadata(recording: MbRecording, release: MbRelease | null): Promise<Mp3Metadata> {
  const group = release?.["release-group"];
  const position = release?.media?.[0]?.tracks?.[0]?.position;
  return {
    title: recording.title,
    artist: credit(recording["artist-credit"]),
    album: release?.title ?? "",
    year: (release ? dateOf(release) : "").slice(0, 4).replace("9999", ""),
    genre: topGenre(recording.genres) || topGenre(group?.genres),
    track: position ? String(position) : "",
    cover: release ? await fetchCover(release) : null,
  };
}

/**
 * Looks up a Chromaprint fingerprint on AcoustID and fills the tags from
 * MusicBrainz and the Cover Art Archive. Returns null when nothing matches.
 */
export async function identify(fingerprint: string, duration: number, key: string): Promise<Mp3Metadata | null> {
  const id = await lookupFingerprint(fingerprint, duration, key);
  if (!id) return null;
  const recording = await fetchRecording(id);
  return toMetadata(recording, pickRelease(recording));
}
