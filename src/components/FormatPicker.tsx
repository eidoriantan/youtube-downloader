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
          <legend className="mb-2 text-sm font-medium text-zinc-300">
            {group.title}
            {group.hint && <span className="ml-2 font-normal text-zinc-500">{group.hint}</span>}
          </legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {group.formats.map((f) => (
              <label
                key={f.format_id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-teal-300 ${
                  value === f.format_id
                    ? "border-teal-400/70 bg-teal-400/10 text-zinc-50"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700"
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
                  {fmtQuality(f)} <span className="text-zinc-500">{f.ext}</span>
                </span>
                <span className="shrink-0 text-xs text-zinc-500">{fmtSize(f)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
