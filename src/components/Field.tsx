import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export function Field({ label, hint, id, ...input }: FieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-200">
        {label}
      </label>
      <input
        id={inputId}
        {...input}
        className="w-full rounded-xl border border-ink-800 bg-ink-950/80 px-3.5 py-2.5 text-sm text-cream placeholder-ink-600 outline-none transition hover:border-ink-700 focus:border-ember-400/70 focus:ring-4 focus:ring-ember-500/15"
      />
      {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
