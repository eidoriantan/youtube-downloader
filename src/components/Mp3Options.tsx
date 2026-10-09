import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { Field } from "./Field";
import type { Mp3Bitrate, Mp3Metadata } from "../types";

const BITRATES: Mp3Bitrate[] = [128, 192, 256, 320];

const TEXT_FIELDS: { key: Exclude<keyof Mp3Metadata, "cover">; label: string; inputMode?: "numeric" }[] = [
  { key: "title", label: "Title" },
  { key: "artist", label: "Artist" },
  { key: "album", label: "Album" },
  { key: "genre", label: "Genre" },
  { key: "year", label: "Year", inputMode: "numeric" },
  { key: "track", label: "Track #", inputMode: "numeric" },
];

const control =
  "rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20";

interface Mp3OptionsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  bitrate: Mp3Bitrate;
  onBitrateChange: (bitrate: Mp3Bitrate) => void;
  metadata: Mp3Metadata;
  onMetadataChange: (metadata: Mp3Metadata) => void;
}

export function Mp3Options({
  enabled, onEnabledChange, bitrate, onBitrateChange, metadata, onMetadataChange,
}: Mp3OptionsProps) {
  const set = <K extends keyof Mp3Metadata>(key: K, value: Mp3Metadata[K]) =>
    onMetadataChange({ ...metadata, [key]: value });

  const coverInput = useRef<HTMLInputElement>(null);
  const coverUrl = useMemo(() => (metadata.cover ? URL.createObjectURL(metadata.cover) : ""), [metadata.cover]);
  useEffect(() => () => { if (coverUrl) URL.revokeObjectURL(coverUrl); }, [coverUrl]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="h-4 w-4 accent-teal-400"
          />
          Convert to MP3
        </label>
        {enabled && (
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Bitrate
            <select
              value={bitrate}
              onChange={(e) => onBitrateChange(Number(e.target.value) as Mp3Bitrate)}
              className={control}
            >
              {BITRATES.map((b) => (
                <option key={b} value={b}>{b} kbps</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {enabled && (
        <fieldset className="space-y-4 rounded-lg border border-zinc-800 p-4">
          <legend className="px-1 text-sm font-medium text-zinc-300">
            MP3 metadata <span className="ml-1 font-normal text-zinc-500">Blank fields are left out</span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEXT_FIELDS.map((f) => (
              <Field
                key={f.key}
                id={`mp3-${f.key}`}
                label={f.label}
                inputMode={f.inputMode}
                value={metadata[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ))}
          </div>
          <div>
            <label htmlFor="mp3-cover" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Cover art
            </label>
            <div className="flex items-center gap-3">
              {coverUrl && (
                <img src={coverUrl} alt="Cover art preview" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              )}
              <input
                ref={coverInput}
                id="mp3-cover"
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => set("cover", e.target.files?.[0] ?? null)}
                className="min-w-0 flex-1 text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
              />
              {metadata.cover && (
                <button
                  type="button"
                  onClick={() => {
                    set("cover", null);
                    if (coverInput.current) coverInput.current.value = "";
                  }}
                  aria-label="Remove cover art"
                  className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </fieldset>
      )}
    </div>
  );
}
