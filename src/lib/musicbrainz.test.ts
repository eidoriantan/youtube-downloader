import { beforeEach, describe, expect, it, vi } from "vitest";
import { identify, lookupFingerprint, pickRelease, type MbRecording, type MbRelease, type MbReleaseGroup } from "./musicbrainz";

function release(id: string, extra: Partial<MbRelease> = {}, group: Partial<MbReleaseGroup> = {}): MbRelease {
  return {
    id, title: `Release ${id}`, status: "Official", date: "2000-01-01",
    "release-group": { id: `rg-${id}`, "primary-type": "Album", "secondary-types": [], ...group },
    media: [{ tracks: [{ position: 4 }] }],
    ...extra,
  };
}

const recording = (releases: MbRelease[], extra: Partial<MbRecording> = {}): MbRecording => ({
  id: "rec-1",
  title: "Bohemian Rhapsody",
  "artist-credit": [{ name: "Queen", joinphrase: " & " }, { name: "Guest", joinphrase: "" }],
  genres: [],
  releases,
  ...extra,
});

describe("pickRelease", () => {
  it("prefers the earliest official album over singles, compilations, live and bootleg releases", () => {
    const pick = pickRelease(recording([
      release("single", { date: "1975-10-31" }, { "primary-type": "Single" }),
      release("comp", { date: "1974-01-01" }, { "secondary-types": ["Compilation"] }),
      release("live", { date: "1974-01-01" }, { "secondary-types": ["Live"] }),
      release("boot", { date: "1970-01-01", status: "Bootleg" }),
      release("album-late", { date: "1993-01-01" }),
      release("album", { date: "1975-11-21" }),
    ]));
    expect(pick?.id).toBe("album");
  });

  it("falls back to the earliest official single or EP when there is no album", () => {
    const pick = pickRelease(recording([
      release("comp", { date: "1970-01-01" }, { "secondary-types": ["Compilation"] }),
      release("ep", { date: "1990-01-01" }, { "primary-type": "EP" }),
      release("single", { date: "1980-01-01" }, { "primary-type": "Single" }),
    ]));
    expect(pick?.id).toBe("single");
  });

  it("falls back to the earliest of anything, putting undated releases last", () => {
    const pick = pickRelease(recording([
      release("undated", { date: "" }, { "secondary-types": ["Live"] }),
      release("comp", { date: "1999" }, { "secondary-types": ["Compilation"] }),
    ]));
    expect(pick?.id).toBe("comp");
  });

  it("returns null for a recording with no releases", () => {
    expect(pickRelease(recording([]))).toBeNull();
  });
});

describe("AcoustID and MusicBrainz lookups", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  const image = (type = "image/jpeg") => new Response(new Uint8Array([1, 2]), { headers: { "Content-Type": type } });
  const notFound = () => new Response("", { status: 404 });

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("POSTs the fingerprint to AcoustID and returns the first recording of the first result", async () => {
    fetchMock.mockResolvedValueOnce(json({
      status: "ok",
      results: [
        { score: 0.95, recordings: [{ id: "a" }, { id: "b" }] },
        { score: 0.6, recordings: [{ id: "c" }] },
      ],
    }));
    await expect(lookupFingerprint("AQAB", 354.6, "KEY")).resolves.toBe("a");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.acoustid.org/v2/lookup");
    expect(init?.method).toBe("POST");
    expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
      client: "KEY", format: "json", meta: "recordingids", duration: "355", fingerprint: "AQAB",
    });
  });

  it("returns null when the first result scores too low or has no recordings", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "ok", results: [{ score: 0.3, recordings: [{ id: "a" }] }] }));
    await expect(lookupFingerprint("AQAB", 10, "KEY")).resolves.toBeNull();
    fetchMock.mockResolvedValueOnce(json({ status: "ok", results: [{ score: 0.9 }, { score: 0.8, recordings: [{ id: "b" }] }] }));
    await expect(lookupFingerprint("AQAB", 10, "KEY")).resolves.toBeNull();
  });

  it("throws on an AcoustID error", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "error", error: { message: "invalid API key" } }));
    await expect(lookupFingerprint("AQAB", 10, "bad")).rejects.toThrow("AcoustID: invalid API key");
  });

  it("fills every field from the chosen album release and its cover", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ status: "ok", results: [{ score: 0.9, recordings: [{ id: "rec-1" }] }] }))
      .mockResolvedValueOnce(json(recording(
        [release("album", { date: "1975-11-21" }, { genres: [{ name: "rock", count: 9 }] })],
        { genres: [{ name: "progressive rock", count: 3 }, { name: "art rock", count: 5 }] },
      )))
      .mockResolvedValueOnce(image());

    const meta = await identify("AQAB", 355, "KEY");
    expect(meta).toMatchObject({
      title: "Bohemian Rhapsody", artist: "Queen & Guest", album: "Release album",
      year: "1975", genre: "art rock", track: "4",
    });
    expect(meta?.cover).toBeInstanceOf(File);
    expect(meta?.cover?.type).toBe("image/jpeg");

    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://musicbrainz.org/ws/2/recording/rec-1?inc=artist-credits+releases+release-groups+media+genres&fmt=json",
    );
    expect(fetchMock.mock.calls[2][0]).toBe("https://coverartarchive.org/release/album/front-500");
  });

  it("uses the release group's genre and cover when the recording and release have none", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ status: "ok", results: [{ score: 0.9, recordings: [{ id: "rec-1" }] }] }))
      .mockResolvedValueOnce(json(recording([release("album", {}, { genres: [{ name: "rock", count: 9 }] })])))
      .mockResolvedValueOnce(notFound())
      .mockResolvedValueOnce(image("image/png"));

    const meta = await identify("AQAB", 355, "KEY");
    expect(meta?.genre).toBe("rock");
    expect(fetchMock.mock.calls[3][0]).toBe("https://coverartarchive.org/release-group/rg-album/front-500");
    expect(meta?.cover?.type).toBe("image/png");
  });

  it("leaves the cover empty when no art exists", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ status: "ok", results: [{ score: 0.9, recordings: [{ id: "rec-1" }] }] }))
      .mockResolvedValueOnce(json(recording([release("album")])))
      .mockResolvedValueOnce(notFound())
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    expect((await identify("AQAB", 355, "KEY"))?.cover).toBeNull();
  });

  it("looks up only the first recording and fills title and artist even without releases", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ status: "ok", results: [{ score: 0.9, recordings: [{ id: "r1" }, { id: "r2" }] }] }))
      .mockResolvedValueOnce(json(recording([])));

    const meta = await identify("AQAB", 355, "KEY");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain("/recording/r1?");
    expect(meta).toMatchObject({ title: "Bohemian Rhapsody", album: "", year: "", track: "", cover: null });
  });

  it("returns null when AcoustID has no match", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "ok", results: [] }));
    await expect(identify("AQAB", 355, "KEY")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when MusicBrainz fails", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ status: "ok", results: [{ score: 0.9, recordings: [{ id: "rec-1" }] }] }))
      .mockResolvedValueOnce(new Response("", { status: 503, statusText: "Service Unavailable" }));
    await expect(identify("AQAB", 355, "KEY")).rejects.toThrow("MusicBrainz: 503 Service Unavailable");
  });
});
