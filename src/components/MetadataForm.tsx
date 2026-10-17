import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { Field } from "./Field";
import type { Mp3Metadata } from "../types";

const TEXT_FIELDS: { key: Exclude<keyof Mp3Metadata, "cover">; label: string; inputMode?: "numeric" }[] = [
  { key: "title", label: "Title" },
  { key: "artist", label: "Artist" },
  { key: "album", label: "Album" },
  { key: "genre", label: "Genre" },
  { key: "year", label: "Year", inputMode: "numeric" },
  { key: "track", label: "Track #", inputMode: "numeric" },
];

interface MetadataFormProps {
  metadata: Mp3Metadata;
  onChange: (metadata: Mp3Metadata) => void;
}

/** ID3 text fields plus a cover art picker; blank fields are left out of the tag. */
export function MetadataForm({ metadata, onChange }: MetadataFormProps) {
  const set = <K extends keyof Mp3Metadata>(key: K, value: Mp3Metadata[K]) =>
    onChange({ ...metadata, [key]: value });

  const coverInput = useRef<HTMLInputElement>(null);
  const coverUrl = useMemo(() => (metadata.cover ? URL.createObjectURL(metadata.cover) : ""), [metadata.cover]);
  useEffect(() => () => { if (coverUrl) URL.revokeObjectURL(coverUrl); }, [coverUrl]);

  return (
    <div className="space-y-4">
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
        <label htmlFor="mp3-cover" className="mb-1.5 block text-sm font-medium text-ink-200">
          Cover art
        </label>
        <div className="flex items-center gap-3">
          {coverUrl && (
            <img src={coverUrl} alt="Cover art preview" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-ink-700" />
          )}
          <input
            ref={coverInput}
            id="mp3-cover"
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => set("cover", e.target.files?.[0] ?? null)}
            className="min-w-0 flex-1 text-sm text-ink-400 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink-800 file:px-3.5 file:py-1.5 file:text-sm file:text-ink-200 hover:file:bg-ink-700"
          />
          {metadata.cover && (
            <button
              type="button"
              onClick={() => {
                set("cover", null);
                if (coverInput.current) coverInput.current.value = "";
              }}
              aria-label="Remove cover art"
              className="rounded-full p-1.5 text-ink-500 transition hover:bg-ink-800 hover:text-ink-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
