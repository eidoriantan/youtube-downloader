import { Button } from "./components/Button";
import { Field } from "./components/Field";
import { FormatPicker } from "./components/FormatPicker";
import { Panel } from "./components/Panel";
import { useDownloader } from "./hooks/useDownloader";

export default function App() {
  const d = useDownloader();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 antialiased">
      <main className="mx-auto max-w-2xl px-4 py-14 sm:py-20">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            Serverless Media Downloader
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
            yt-dlp runs in Pyodide and ffmpeg.wasm merges streams, all inside your browser.
            Only a small CORS proxy sits in between.
          </p>
        </header>

        <div className="space-y-5">
          <Panel className="space-y-4">
            <Field
              label="Proxy URL"
              value={d.proxy}
              onChange={(e) => d.setProxy(e.target.value)}
              placeholder="http://localhost:8787/"
              hint="Saved in this browser."
            />
            <Field
              label="Video URL"
              value={d.url}
              onChange={(e) => d.setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              onKeyDown={(e) => e.key === "Enter" && d.url && d.proxy && !d.busy && d.fetchFormats()}
            />
            <Button onClick={d.fetchFormats} disabled={!d.url || !d.proxy} loading={d.busy && !d.info}>
              {d.busy && !d.info ? "Working…" : "Get formats"}
            </Button>
          </Panel>

          {d.info && (
            <Panel className="space-y-5">
              <div>
                <p className="text-xs text-zinc-500">Ready to download</p>
                <h2 className="mt-0.5 text-lg font-medium text-zinc-50">{d.info.title}</h2>
              </div>
              <FormatPicker formats={d.info.formats} value={d.formatId} onChange={d.setFormatId} />
              <Button onClick={d.download} disabled={!d.formatId} loading={d.busy}>
                {d.busy ? "Working…" : "Download"}
              </Button>
            </Panel>
          )}

          <div aria-live="polite" className="space-y-3">
            {d.status && (
              <p className="flex items-center gap-2 text-sm text-zinc-400">
                {d.busy && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />}
                {d.status}
              </p>
            )}
            {d.error && (
              <pre className="whitespace-pre-wrap rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs leading-relaxed text-red-300">
                {d.error}
              </pre>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
