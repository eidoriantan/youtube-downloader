import { useCallback, useEffect, useState } from "react";
import { downloadForReview, downloadMedia, listFormats, saveMp3 } from "../lib/engine";
import { friendlyError } from "../lib/errors";
import { hasVideo, pickAudio, pickVideo } from "../lib/format";
import { EMPTY_METADATA } from "../lib/id3";
import { syncProxy } from "../lib/pyodide";
import type { DownloadProgress, MediaInfo, Mp3Bitrate, Mp3Metadata, ReviewMp3 } from "../types";

// Shared default proxy. It is rate-limited; the UI tells users to deploy their own.
const DEFAULT_PROXY = "https://cf-proxy.eidoriantan.com/";
const PROXY_KEY = "proxy";
const AUTO_TAG_KEY = "autoTag";

/** Which card is showing; one step at a time so the page never grows past the fold. */
export type Step = "source" | "format" | "metadata";

/** Steps pushed onto the browser history; "source" is the entry the page loaded on. */
const pushedStep = (state: unknown): Step | null => {
  const step = (state as { step?: unknown } | null)?.step;
  return step === "format" || step === "metadata" ? step : null;
};

function loadProxy(): string {
  try {
    return localStorage.getItem(PROXY_KEY) || DEFAULT_PROXY;
  } catch {
    return DEFAULT_PROXY;
  }
}

/** Prefilling from MusicBrainz is on unless the user turned it off. */
function loadAutoTag(): boolean {
  try {
    return localStorage.getItem(AUTO_TAG_KEY) !== "false";
  } catch {
    return true;
  }
}

export function useDownloader() {
  const [proxy, setProxy] = useState<string>(loadProxy);
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [step, setStep] = useState<Step>("source");
  // Empty string means "none": a missing video gives an audio file, a missing audio a silent video.
  const [videoId, setVideoId] = useState("");
  const [audioId, setAudioId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toMp3, setToMp3] = useState(false);
  const [bitrate, setBitrate] = useState<Mp3Bitrate>(320);
  const [metadata, setMetadata] = useState<Mp3Metadata>(EMPTY_METADATA);
  const [autoTag, setAutoTag] = useState<boolean>(loadAutoTag);
  // The converted MP3 waiting on the metadata step; dropped when the user leaves that step.
  const [review, setReview] = useState<Omit<ReviewMp3, "metadata"> | null>(null);
  // The progress modal stays open after a download until the user closes it.
  const [progressOpen, setProgressOpen] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [savedAs, setSavedAs] = useState("");

  // Keep the Python side and localStorage in step with the input as it changes.
  useEffect(() => {
    syncProxy(proxy);
    try {
      localStorage.setItem(PROXY_KEY, proxy);
    } catch {
      /* storage unavailable; proxy just won't persist */
    }
  }, [proxy]);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_TAG_KEY, String(autoTag));
    } catch {
      /* storage unavailable; the choice just won't persist */
    }
  }, [autoTag]);

  // Browser Back/Forward move between steps; the format and metadata steps are pushed as their own entries.
  useEffect(() => {
    // A reload loses the fetched formats, so drop a leftover step entry state.
    if (history.state?.step) history.replaceState(null, "");
    const onPop = (e: PopStateEvent) => showStep(pushedStep(e.state) ?? "source");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /** Shows a step without touching history; leaving the metadata step discards the MP3 waiting there. */
  function showStep(next: Step) {
    setStep(next);
    if (next !== "metadata") setReview(null);
  }

  const goTo = (next: Step) => {
    setStep(next);
    history.pushState({ step: next }, "");
  };

  const backToSource = () => {
    if (pushedStep(history.state) === "format") history.back();
    else showStep("source");
  };

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(e));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }, []);

  const fetchFormats = () =>
    run(async () => {
      setInfo(null);
      setToMp3(false);
      setMetadata(EMPTY_METADATA);
      const data = await listFormats(proxy, url, setStatus);
      setInfo(data);
      const video = pickVideo(data.formats);
      setVideoId(video?.format_id ?? "");
      setAudioId(pickAudio(data.formats, video)?.format_id ?? "");
      setStatus(`Found ${data.formats.length} formats`);
      goTo("format");
    });

  const download = () =>
    run(async () => {
      const video = info?.formats.find((f) => f.format_id === videoId) ?? null;
      const audio = info?.formats.find((f) => f.format_id === audioId) ?? null;
      const format = video ?? audio;
      if (!info || !format) throw new Error("Choose a format first.");
      const mp3 = toMp3 && !video ? { bitrate, metadata } : null;
      setProgress(null);
      setSavedAs("");
      setStatus("");
      setProgressOpen(true);

      // Hold the MP3 in memory and let the user review the prefilled tags before saving.
      if (mp3 && autoTag && !hasVideo(format)) {
        const { metadata: found, ...pending } = await downloadForReview({
          proxy, url, info, format, bitrate, onProgress: setProgress,
        });
        setMetadata(found);
        setReview(pending);
        setProgressOpen(false);
        setStatus(pending.matched ? "Found it on MusicBrainz" : "No MusicBrainz match");
        goTo("metadata");
        return;
      }

      // With a video picked, its audio choice is explicit: null means a silent video.
      const name = await downloadMedia({
        proxy, url, info, format, audio: video ? audio : undefined, mp3, onProgress: setProgress,
      });
      setSavedAs(name);
      setStatus(`Saved ${name}`);
    });

  /** Saves the reviewed MP3, with the form's tags or without any, and returns to the format step. */
  const saveReviewed = (withTags: boolean) =>
    run(async () => {
      if (!review) throw new Error("The converted MP3 is no longer available. Download it again.");
      const name = await saveMp3(review, withTags ? metadata : null);
      setStatus(`Saved ${name}`);
      if (pushedStep(history.state) === "metadata") history.back();
      else showStep("format");
    });

  return {
    proxy, setProxy, url, setUrl, info, step, backToSource,
    videoId, setVideoId, audioId, setAudioId,
    status, error, busy, fetchFormats, download,
    toMp3, setToMp3, bitrate, setBitrate, metadata, setMetadata,
    autoTag, setAutoTag, review, saveReviewed,
    progressOpen, progress, savedAs, closeProgress: () => setProgressOpen(false),
  };
}
