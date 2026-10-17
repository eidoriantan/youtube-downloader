import { ArrowLeft, Download, Save, Search } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "./components/Button";
import { EngineStatus } from "./components/EngineStatus";
import { ErrorAlert } from "./components/ErrorAlert";
import { Field } from "./components/Field";
import { FormatPicker } from "./components/FormatPicker";
import { GithubLink } from "./components/GithubLink";
import { MetadataForm } from "./components/MetadataForm";
import { Mp3Options } from "./components/Mp3Options";
import { Notice } from "./components/Notice";
import { Panel } from "./components/Panel";
import { ProgressModal } from "./components/ProgressModal";
import { useDownloader } from "./hooks/useDownloader";
import { useEngine } from "./hooks/useEngine";
import { fmtQuality, outputExt } from "./lib/format";
import hero from "./assets/hero.svg";
import type { MediaFormat } from "./types";

const link = "text-ember-300 underline decoration-ember-300/40 underline-offset-2 hover:decoration-ember-300";
const STACK = ["yt-dlp", "Pyodide", "ffmpeg.wasm"];
const now = new Date();

export default function App() {
  const d = useDownloader();
  const engine = useEngine();
  const year = now.getFullYear();
  const video = d.info?.formats.find((f) => f.format_id === d.videoId) ?? null;
  const audio = d.info?.formats.find((f) => f.format_id === d.audioId) ?? null;
  const toMp3 = d.toMp3 && !video;
  const onFormatStep = d.step === "format" && !!d.info;
  const onMetadataStep = d.step === "metadata" && !!d.info && !!d.review;

  // Move focus to the card that just swapped in, so keyboard and screen reader users follow along.
  const stepRef = useRef<HTMLDivElement>(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) firstStep.current = false;
    else stepRef.current?.focus({ preventScroll: true });
  }, [onFormatStep, onMetadataStep]);

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

          <div ref={stepRef} tabIndex={-1} className="outline-none">
            {onMetadataStep && d.info && d.review ? (
              <Panel step="03" label="Metadata" className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold leading-snug tracking-tight text-cream line-clamp-2" title={d.info.title}>
                    {d.info.title}
                  </h2>
                  <p className="mt-1 text-sm text-ink-400">
                    Your MP3 is ready. Check the tags below, then save it.
                  </p>
                </div>
                <Notice tone={d.review.matched ? "info" : "warn"}>
                  {d.review.matched
                    ? "Filled in from MusicBrainz using the audio fingerprint. Edit anything that looks off."
                    : "No match on MusicBrainz, so the title and artist come from the video. Fill in the rest if you like."}
                </Notice>
                <MetadataForm metadata={d.metadata} onChange={d.setMetadata} />
                <div className="flex flex-col-reverse gap-3 border-t border-ink-800 pt-5 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => d.saveReviewed(false)}
                    disabled={d.busy}
                    className="rounded-full border border-ink-700 px-5 py-2.5 text-sm font-medium text-ink-200 transition hover:border-ink-600 hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save without tags
                  </button>
                  <Button onClick={() => d.saveReviewed(true)} loading={d.busy} icon={<Save className="h-4 w-4" />}>
                    Save MP3
                  </Button>
                </div>
              </Panel>
            ) : onFormatStep && d.info ? (
              <Panel step="02" label="Format" className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <button
                    type="button"
                    onClick={d.backToSource}
                    disabled={d.busy}
                    className="-ml-1 inline-flex items-center gap-1.5 rounded-full px-1 py-0.5 text-sm text-ink-400 transition hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Change URL
                  </button>
                  <div className="w-full sm:w-auto sm:min-w-72">
                    <Field
                      compact
                      label="Proxy"
                      value={d.proxy}
                      onChange={(e) => d.setProxy(e.target.value)}
                      placeholder="https://cf-proxy.eidoriantan.com"
                    />
                  </div>
                </div>
                <h2 className="font-display text-xl font-semibold leading-snug tracking-tight text-cream line-clamp-2" title={d.info.title}>
                  {d.info.title}
                </h2>
                <FormatPicker
                  formats={d.info.formats}
                  videoId={d.videoId}
                  audioId={d.audioId}
                  onVideoChange={d.setVideoId}
                  onAudioChange={d.setAudioId}
                />
                {audio && !video && (
                  <Mp3Options
                    enabled={d.toMp3}
                    onEnabledChange={d.setToMp3}
                    bitrate={d.bitrate}
                    onBitrateChange={d.setBitrate}
                    autoTag={d.autoTag}
                    onAutoTagChange={d.setAutoTag}
                    metadata={d.metadata}
                    onMetadataChange={d.setMetadata}
                  />
                )}
                <div className="flex flex-col gap-4 border-t border-ink-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-w-0 text-sm text-ink-400">
                    {video || audio ? (
                      <>
                        <span className="text-ink-500">Will save </span>
                        <span className="text-ink-200">
                          {[video, audio].filter((f): f is MediaFormat => !!f).map((f) => `${fmtQuality(f)} ${f.ext}`).join(" + ")}
                        </span>
                        {video && !audio && <span className="text-ink-500"> (no sound)</span>}
                        <span className="font-mono text-ember-300"> → .{outputExt(video, audio, toMp3)}</span>
                      </>
                    ) : (
                      "Choose a video, an audio track, or both."
                    )}
                  </p>
                  <Button onClick={d.download} disabled={!video && !audio} loading={d.busy}
                    icon={<Download className="h-4 w-4" />} className="shrink-0">
                    {d.busy ? "Working…" : "Download"}
                  </Button>
                </div>
              </Panel>
            ) : (
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
                <Button onClick={d.fetchFormats} disabled={!d.url || !d.proxy} loading={d.busy}
                  icon={<Search className="h-4 w-4" />}>
                  {d.busy ? "Working…" : "Get formats"}
                </Button>
              </Panel>
            )}
          </div>

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
