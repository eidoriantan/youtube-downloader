import { useState, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { audioFormats, fmtQuality, fmtSize, videoFormats } from "../lib/format";
import type { MediaFormat } from "../types";

type Tab = "video" | "audio";

interface FormatPickerProps {
  formats: MediaFormat[];
  /** Selected format IDs; an empty string means none. */
  videoId: string;
  audioId: string;
  onVideoChange: (formatId: string) => void;
  onAudioChange: (formatId: string) => void;
}

const TABS: { id: Tab; label: string; none: string }[] = [
  { id: "video", label: "Video", none: "No video, audio only" },
  { id: "audio", label: "Audio", none: "No audio, silent video" },
];

/** Compact badge text for a selection, e.g. "1080p" or "128k". */
const badge = (f: MediaFormat | undefined, tab: Tab) =>
  !f ? "none" : tab === "video" ? (f.height ? `${f.height}p` : f.ext) : `${Math.round(f.abr || f.tbr || 0)}k`;

const option = (selected: boolean) =>
  `flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-ember-300 ${
    selected
      ? "border-ember-400/70 bg-ember-500/10 text-cream shadow-[0_0_0_3px_rgb(255_106_69/0.12)]"
      : "border-ink-800 bg-ink-950/60 text-ink-300 hover:border-ink-700 hover:bg-ink-850/60"
  }`;

export function FormatPicker({ formats, videoId, audioId, onVideoChange, onAudioChange }: FormatPickerProps) {
  const lists: Record<Tab, MediaFormat[]> = { video: videoFormats(formats), audio: audioFormats(formats) };
  const ids: Record<Tab, string> = { video: videoId, audio: audioId };
  const [tab, setTab] = useState<Tab>(lists.video.length ? "video" : "audio");

  const select = (t: Tab, id: string) => {
    if (t === "audio") return onAudioChange(id);
    onVideoChange(id);
    // Picking a video leads straight into choosing its soundtrack.
    if (id) setTab("audio");
  };

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const next = tab === "video" ? "audio" : "video";
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div>
      <div role="tablist" aria-label="Stream type" className="grid grid-cols-2 gap-1 rounded-2xl border border-ink-800 bg-ink-950/60 p-1">
        {TABS.map((t) => {
          const chosen = lists[t.id].find((f) => f.format_id === ids[t.id]);
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="format-list"
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={onTabKey}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-300 ${
                active ? "bg-ink-800 text-cream" : "text-ink-400 hover:text-ink-200"
              }`}
            >
              {t.label}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] ${
                  chosen ? "bg-ember-500/15 text-ember-300" : "bg-ink-800/80 text-ink-500"
                }`}
              >
                {chosen && <Check className="h-3 w-3" aria-hidden="true" />}
                {badge(chosen, t.id)}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="format-list"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="mt-3 max-h-64 overflow-y-auto overscroll-contain p-1 [scrollbar-color:var(--color-ink-700)_transparent] [scrollbar-width:thin]"
      >
        <div role="radiogroup" aria-label={`${current.label} format`} className="grid gap-1.5 sm:grid-cols-2">
          {lists[tab].map((f) => (
            <label key={f.format_id} className={option(ids[tab] === f.format_id)}>
              <input
                type="radio"
                name={`format-${tab}`}
                className="sr-only"
                checked={ids[tab] === f.format_id}
                onChange={() => select(tab, f.format_id)}
              />
              <span className="truncate">
                {fmtQuality(f)} <span className="font-mono text-xs text-ink-500">{f.ext}</span>
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-ink-500">{fmtSize(f)}</span>
            </label>
          ))}
          <label className={`${option(!ids[tab])} border-dashed sm:col-span-2`}>
            <input
              type="radio"
              name={`format-${tab}`}
              className="sr-only"
              checked={!ids[tab]}
              onChange={() => select(tab, "")}
            />
            <span className="truncate">{current.none}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
