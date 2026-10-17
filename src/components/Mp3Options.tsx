import { ChevronRight } from "lucide-react";
import { MetadataForm } from "./MetadataForm";
import type { Mp3Bitrate, Mp3Metadata } from "../types";

const BITRATES: Mp3Bitrate[] = [128, 192, 256, 320];

const control =
  "rounded-xl border border-ink-800 bg-ink-950/80 px-3 py-2 text-sm text-cream outline-none transition hover:border-ink-700 focus:border-ember-400/70 focus:ring-4 focus:ring-ember-500/15";

interface Mp3OptionsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  bitrate: Mp3Bitrate;
  onBitrateChange: (bitrate: Mp3Bitrate) => void;
  /** When on, the tags are prefilled from MusicBrainz after the download instead of entered here. */
  autoTag: boolean;
  onAutoTagChange: (autoTag: boolean) => void;
  metadata: Mp3Metadata;
  onMetadataChange: (metadata: Mp3Metadata) => void;
}

export function Mp3Options({
  enabled, onEnabledChange, bitrate, onBitrateChange, autoTag, onAutoTagChange, metadata, onMetadataChange,
}: Mp3OptionsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="h-4 w-4 accent-ember-500"
          />
          Convert to MP3
        </label>
        {enabled && (
          <label className="flex items-center gap-2 text-sm text-ink-400">
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
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={autoTag}
            onChange={(e) => onAutoTagChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-ember-500"
          />
          <span>
            Prefill metadata from MusicBrainz
            <span className="block text-xs text-ink-500">
              Identifies the song by its audio fingerprint, then lets you review the tags before saving.
            </span>
          </span>
        </label>
      )}

      {enabled && !autoTag && (
        <details className="group rounded-2xl border border-dashed border-ink-700 bg-ink-950/30">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-ink-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-300 sm:px-5 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 text-ink-500 transition group-open:rotate-90" aria-hidden="true" />
            MP3 metadata <span className="font-normal text-ink-500">Optional, blank fields are left out</span>
          </summary>
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <MetadataForm metadata={metadata} onChange={onMetadataChange} />
          </div>
        </details>
      )}
    </div>
  );
}
