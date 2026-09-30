import { useCallback, useEffect, useState } from "react";
import { downloadMedia, listFormats } from "../lib/engine";
import { friendlyError } from "../lib/errors";
import { pickDefaultFormat } from "../lib/format";
import { syncProxy } from "../lib/pyodide";
import type { MediaInfo } from "../types";

// Shared default proxy. It is rate-limited; the UI tells users to deploy their own.
const DEFAULT_PROXY = "https://cf-proxy.eidoriantan.com/";
const PROXY_KEY = "proxy";

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
      const data = await listFormats(proxy, url, setStatus);
      setInfo(data);
      setFormatId(pickDefaultFormat(data.formats)?.format_id ?? "");
      setStatus(`Found ${data.formats.length} formats`);
    });

  const download = () =>
    run(async () => {
      const format = info?.formats.find((f) => f.format_id === formatId);
      if (!info || !format) throw new Error("Choose a format first.");
      const name = await downloadMedia({ proxy, url, info, format, onStatus: setStatus });
      setStatus(`Saved ${name}`);
    });

  return {
    proxy, setProxy, url, setUrl, info, formatId, setFormatId,
    status, error, busy, fetchFormats, download,
  };
}
