import { useCallback, useEffect, useState } from "react";
import { downloadMedia, listFormats } from "../lib/engine";
import { friendlyError } from "../lib/errors";
import { pickAudio, pickVideo } from "../lib/format";
import { syncProxy } from "../lib/pyodide";
import type { DownloadProgress, MediaInfo, Mp3Bitrate, Mp3Metadata } from "../types";

// Shared default proxy. It is rate-limited; the UI tells users to deploy their own.
const DEFAULT_PROXY = "https://cf-proxy.eidoriantan.com/";
const PROXY_KEY = "proxy";

const EMPTY_METADATA: Mp3Metadata = {
  title: "", artist: "", album: "", year: "", genre: "", track: "", cover: null,
};

/** Which card is showing; one step at a time so the page never grows past the fold. */
export type Step = "source" | "format";

function loadProxy(): string {
  try {
    return localStorage.getItem(PROXY_KEY) || DEFAULT_PROXY;
  } catch {
    return DEFAULT_PROXY;
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

  // Browser Back/Forward move between steps; the format step is pushed as its own entry.
  useEffect(() => {
    // A reload loses the fetched formats, so drop a leftover "format" entry state.
    if (history.state?.step) history.replaceState(null, "");
    const onPop = (e: PopStateEvent) => setStep(e.state?.step === "format" ? "format" : "source");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const backToSource = () => {
    if (history.state?.step === "format") history.back();
    else setStep("source");
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
      setStep("format");
      history.pushState({ step: "format" }, "");
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
      // With a video picked, its audio choice is explicit: null means a silent video.
      const name = await downloadMedia({
        proxy, url, info, format, audio: video ? audio : undefined, mp3, onProgress: setProgress,
      });
      setSavedAs(name);
      setStatus(`Saved ${name}`);
    });

  return {
    proxy, setProxy, url, setUrl, info, step, backToSource,
    videoId, setVideoId, audioId, setAudioId,
    status, error, busy, fetchFormats, download,
    toMp3, setToMp3, bitrate, setBitrate, metadata, setMetadata,
    progressOpen, progress, savedAs, closeProgress: () => setProgressOpen(false),
  };
}
