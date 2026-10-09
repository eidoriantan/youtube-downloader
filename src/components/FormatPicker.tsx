import { fmtQuality, fmtSize, groupFormats } from "../lib/format";
import type { MediaFormat } from "../types";

interface FormatPickerProps {
  formats: MediaFormat[];
  value: string;
  onChange: (formatId: string) => void;
}

export function FormatPicker({ formats, value, onChange }: FormatPickerProps) {
  return (
    <div className="space-y-5">
      {groupFormats(formats).map((group) => (
        <fieldset key={group.kind}>
          <legend className="mb-2.5 text-sm font-medium text-ink-200">
            {group.title}
            {group.hint && <span className="ml-2 font-normal text-ink-500">{group.hint}</span>}
          </legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {group.formats.map((f) => (
              <label
                key={f.format_id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-ember-300 ${
                  value === f.format_id
                    ? "border-ember-400/70 bg-ember-500/10 text-cream shadow-[0_0_0_3px_rgb(255_106_69/0.12)]"
                    : "border-ink-800 bg-ink-950/60 text-ink-300 hover:border-ink-700 hover:bg-ink-850/60"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  className="sr-only"
                  checked={value === f.format_id}
                  onChange={() => onChange(f.format_id)}
                />
                <span className="truncate">
                  {fmtQuality(f)} <span className="font-mono text-xs text-ink-500">{f.ext}</span>
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-ink-500">{fmtSize(f)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
