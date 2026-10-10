import { Download, Search } from "lucide-react";

import { Button } from "./components/Button";
import { EngineStatus } from "./components/EngineStatus";
import { ErrorAlert } from "./components/ErrorAlert";
import { Field } from "./components/Field";
import { FormatPicker } from "./components/FormatPicker";
import { GithubLink } from "./components/GithubLink";
import { Mp3Options } from "./components/Mp3Options";
import { Notice } from "./components/Notice";
import { Panel } from "./components/Panel";
import { ProgressModal } from "./components/ProgressModal";
import { useDownloader } from "./hooks/useDownloader";
import { useEngine } from "./hooks/useEngine";
import { hasVideo } from "./lib/format";
import hero from "./assets/hero.svg";

const link = "text-ember-300 underline decoration-ember-300/40 underline-offset-2 hover:decoration-ember-300";
const STACK = ["yt-dlp", "Pyodide", "ffmpeg.wasm"];
const now = new Date();

export default function App() {
  const d = useDownloader();
  const engine = useEngine();
  const year = now.getFullYear();
  const selected = d.info?.formats.find((f) => f.format_id === d.formatId);

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip bg-ink-950 font-sans text-ink-200 antialiased">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-[70%] rounded-full bg-ember-500/15 blur-[120px]" />
        <div className="absolute top-1/3 right-0 h-[28rem] w-[28rem] translate-x-1/3 rounded-full bg-iris/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.035)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      </div>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:py-20">
        <header className="lg:sticky lg:top-12 lg:self-start">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="" className="h-10 w-10 rounded-xl shadow-[0_8px_24px_-6px_rgb(255_106_69/0.6)]" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-400">ytdl</span>
            </div>
            <GithubLink />
          </div>

          <h1 className="mt-8 max-w-[400px] font-display text-4xl font-bold leading-[1.05] tracking-tight text-cream sm:text-5xl">
            Media{" "}
            <span className="bg-ember bg-clip-text text-transparent">Downloader</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-400">
            yt-dlp runs in Pyodide and ffmpeg.wasm merges streams, all inside your browser.
            Only a small CORS proxy sits in between.
          </p>

          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Built with">
            {STACK.map((t) => (
              <li key={t} className="rounded-full border border-ink-800 bg-ink-900/60 px-3 py-1 font-mono text-xs text-ink-300">
                {t}
              </li>
            ))}
          </ul>

          <img src={hero} alt="" className="mt-10 hidden w-full max-w-md select-none lg:block" draggable={false} />
        </header>

        <div className="min-w-0 space-y-5">
          <EngineStatus steps={engine.steps} ready={engine.ready} error={engine.error} onRetry={engine.retry} />

          <Panel step="01" label="Source" className="space-y-5">
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
            <Panel step="02" label="Format" className="space-y-6">
              <div>
                <p className="text-xs text-ink-500">Ready to download</p>
                <h2 className="mt-1 font-display text-xl font-semibold leading-snug tracking-tight text-cream">{d.info.title}</h2>
              </div>
              <FormatPicker formats={d.info.formats} value={d.formatId} onChange={d.setFormatId} />
              {selected && !hasVideo(selected) && (
                <Mp3Options
                  enabled={d.toMp3}
                  onEnabledChange={d.setToMp3}
                  bitrate={d.bitrate}
                  onBitrateChange={d.setBitrate}
                  metadata={d.metadata}
                  onMetadataChange={d.setMetadata}
                />
              )}
              <Button onClick={d.download} disabled={!d.formatId} loading={d.busy}
                icon={<Download className="h-4 w-4" />}>
                {d.busy ? "Working…" : "Download"}
              </Button>
            </Panel>
          )}

          <div aria-live="polite" className="space-y-3">
            {d.status && (
              <p className="flex items-center gap-2 px-1 text-sm text-ink-400">
                {d.busy && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember-400" />}
                {d.status}
              </p>
            )}
            {d.error && <ErrorAlert message={d.error} />}
          </div>
        </div>
      </main>

      <ProgressModal
        open={d.progressOpen}
        title={d.info?.title ?? ""}
        progress={d.progress}
        busy={d.busy}
        savedAs={d.savedAs}
        error={d.error}
        onClose={d.closeProgress}
      />

      <footer className="border-t border-ink-900 px-4 py-6 text-center font-mono text-xs text-ink-600">
        © {year} <a href="https://eidoriantan.com" className="text-ink-500 hover:text-ink-400">
          eidoriantan
        </a>
      </footer>
    </div>
  );
}
