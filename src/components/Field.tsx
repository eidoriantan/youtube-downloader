import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  /** Label beside a shorter input on one line, for secondary settings. */
  compact?: boolean;
}

export function Field({ label, hint, compact, id, ...input }: FieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className={compact ? "flex items-center gap-3" : undefined}>
      <label
        htmlFor={inputId}
        className={compact ? "shrink-0 text-xs font-medium text-ink-400" : "mb-1.5 block text-sm font-medium text-ink-200"}
      >
        {label}
      </label>
      <input
        id={inputId}
        {...input}
        className={`w-full min-w-0 rounded-xl border border-ink-800 bg-ink-950/80 text-cream placeholder-ink-600 outline-none transition hover:border-ink-700 focus:border-ember-400/70 focus:ring-4 focus:ring-ember-500/15 ${
          compact ? "px-3 py-1.5 font-mono text-xs" : "px-3.5 py-2.5 text-sm"
        }`}
      />
      {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
