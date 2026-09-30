import { useState } from "react";
import { listFormats, downloadMedia, hasVideo, hasAudio } from "./lib/engine.js";

const fmtSize = (f) => {
  const b = f.filesize || f.filesize_approx;
  return b ? `${(b / 1048576).toFixed(1)} MB` : "size n/a";
};

const label = (f) => {
  const kind = hasVideo(f) && hasAudio(f) ? "video+audio"
    : hasVideo(f) ? "video only (will merge audio)" : "audio only";
  const res = hasVideo(f) ? `${f.resolution || f.height + "p"}${f.fps ? ` ${f.fps}fps` : ""}` : `${Math.round(f.abr || f.tbr || 0)}kbps`;
  return `${f.format_id} · ${f.ext} · ${res} · ${kind} · ${fmtSize(f)}`;
};

const Input = (props) => (
  <input {...props} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none" />
);

export default function App() {
  const [proxy, setProxy] = useState(localStorage.getItem("proxy") || "http://localhost:8787/");
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState(null);
  const [formatId, setFormatId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(String(e?.message || e)); setStatus(""); }
    finally { setBusy(false); }
  };

  const fetchFormats = () => run(async () => {
    localStorage.setItem("proxy", proxy);
    setInfo(null);
    const data = await listFormats(proxy, url, setStatus);
    setInfo(data);
    const best = [...data.formats].reverse().find((f) => hasVideo(f) && hasAudio(f)) || data.formats[data.formats.length - 1];
    setFormatId(best?.format_id || "");
    setStatus(`Found ${data.formats.length} formats`);
  });

  const download = () => run(async () => {
    const format = info.formats.find((f) => f.format_id === formatId);
    const name = await downloadMedia({ proxy, url, info, format, onStatus: setStatus });
    setStatus(`Saved ${name}`);
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-slate-200">
      <h1 className="text-3xl font-bold text-white">Serverless Media Downloader</h1>
      <p className="mt-1 text-sm text-slate-400">yt-dlp in Pyodide + ffmpeg.wasm, all running in your browser.</p>

      <section className="mt-8 space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <label className="block text-sm">Proxy URL
          <div className="mt-1"><Input value={proxy} onChange={(e) => setProxy(e.target.value)} placeholder="http://localhost:8787/" /></div>
        </label>
        <label className="block text-sm">YouTube URL
          <div className="mt-1"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></div>
        </label>
        <button onClick={fetchFormats} disabled={busy || !url || !proxy}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-40">
          {busy && !info ? "Working…" : "Get formats"}
        </button>
      </section>

      {info && (
        <section className="mt-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="font-semibold text-white">{info.title}</h2>
          <select value={formatId} onChange={(e) => setFormatId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
            {info.formats.map((f) => <option key={f.format_id} value={f.format_id}>{label(f)}</option>)}
          </select>
          <button onClick={download} disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-40">
            {busy ? "Working…" : "Download"}
          </button>
        </section>
      )}

      {status && <p className="mt-4 text-sm text-slate-400">{status}</p>}
      {error && <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-red-950/60 p-3 text-xs text-red-300">{error}</pre>}
    </main>
  );
}
