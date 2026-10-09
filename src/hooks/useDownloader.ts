import { useCallback, useEffect, useState } from "react";
import { downloadMedia, listFormats } from "../lib/engine";
import { friendlyError } from "../lib/errors";
import { hasVideo, pickDefaultFormat } from "../lib/format";
import { syncProxy } from "../lib/pyodide";
import type { MediaInfo, Mp3Bitrate, Mp3Metadata } from "../types";

// Shared default proxy. It is rate-limited; the UI tells users to deploy their own.
const DEFAULT_PROXY = "https://cf-proxy.eidoriantan.com/";
const PROXY_KEY = "proxy";

const EMPTY_METADATA: Mp3Metadata = {
  title: "", artist: "", album: "", year: "", genre: "", track: "", cover: null,
};

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
  const [formatId, setFormatId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toMp3, setToMp3] = useState(false);
  const [bitrate, setBitrate] = useState<Mp3Bitrate>(320);
  const [metadata, setMetadata] = useState<Mp3Metadata>(EMPTY_METADATA);

  // Keep the Python side and localStorage in step with the input as it changes.
  useEffect(() => {
    syncProxy(proxy);
    try {
      localStorage.setItem(PROXY_KEY, proxy);
    } catch {
      /* storage unavailable; proxy just won't persist */
    }
  }, [proxy]);

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
      setFormatId(pickDefaultFormat(data.formats)?.format_id ?? "");
      setStatus(`Found ${data.formats.length} formats`);
    });

  const download = () =>
    run(async () => {
      const format = info?.formats.find((f) => f.format_id === formatId);
      if (!info || !format) throw new Error("Choose a format first.");
      const mp3 = toMp3 && !hasVideo(format) ? { bitrate, metadata } : null;
      const name = await downloadMedia({ proxy, url, info, format, mp3, onStatus: setStatus });
      setStatus(`Saved ${name}`);
    });

  return {
    proxy, setProxy, url, setUrl, info, formatId, setFormatId,
    status, error, busy, fetchFormats, download,
    toMp3, setToMp3, bitrate, setBitrate, metadata, setMetadata,
  };
}
