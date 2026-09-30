import { Download, Search } from "lucide-react";
import { Button } from "./components/Button";
import { ErrorAlert } from "./components/ErrorAlert";
import { Field } from "./components/Field";
import { FormatPicker } from "./components/FormatPicker";
import { GithubLink } from "./components/GithubLink";
import { LoadingScreen } from "./components/LoadingScreen";
import { Notice } from "./components/Notice";
import { Panel } from "./components/Panel";
import { useDownloader } from "./hooks/useDownloader";
import { useEngine } from "./hooks/useEngine";

const link = "text-teal-300 underline decoration-teal-300/40 underline-offset-2 hover:decoration-teal-300";

export default function App() {
  const d = useDownloader();
  const engine = useEngine();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-200 antialiased" aria-busy={!engine.ready}>
      <LoadingScreen steps={engine.steps} ready={engine.ready} error={engine.error} onRetry={engine.retry} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[400px]">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Media Downloader
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
              yt-dlp runs in Pyodide and ffmpeg.wasm merges streams, all inside your browser.
              Only a small CORS proxy sits in between.
            </p>
          </div>
          <GithubLink />
        </header>

        <div className="space-y-5">
          <Panel className="space-y-4">
            <Field
              label="Proxy URL"
              value={d.proxy}
              onChange={(e) => d.setProxy(e.target.value)}
              placeholder="https://cf-proxy.eidoriantan.com"
              hint="Applied immediately and saved in this browser."
            />
            <div className="space-y-2">
              <Notice>
                The proxy is a deploy of{" "}
                <a href="https://github.com/eidoriantan/cf-proxy" target="_blank" rel="noopener noreferrer" className={link}>
                  cf-proxy
                </a>{" "}
                on Cloudflare. It only forwards requests so your browser can reach YouTube.
              </Notice>
              <Notice tone="warn">
                The default proxy is shared and rate-limited, so it may sometimes fail. If that happens,
                try again later or deploy your own cf-proxy and paste its URL above.
              </Notice>
            </div>
            <Field
              label="Video URL"
              value={d.url}
              onChange={(e) => d.setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              onKeyDown={(e) => e.key === "Enter" && d.url && d.proxy && !d.busy && d.fetchFormats()}
            />
            <Button onClick={d.fetchFormats} disabled={!d.url || !d.proxy} loading={d.busy && !d.info}
              icon={<Search className="h-4 w-4" />}>
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
              <Button onClick={d.download} disabled={!d.formatId} loading={d.busy}
                icon={<Download className="h-4 w-4" />}>
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
            {d.error && <ErrorAlert message={d.error} />}
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-900 px-4 py-6 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} eidoriantan
      </footer>
    </div>
  );
}
