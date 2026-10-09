import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  /** Small numbered eyebrow shown above the content, e.g. "01". */
  step?: string;
  label?: string;
}

export function Panel({ children, className = "", step, label }: PanelProps) {
  return (
    <section
      className={`relative rounded-2xl border border-ink-800 bg-ink-900/70 p-5 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04),0_24px_48px_-24px_rgb(0_0_0/0.6)] backdrop-blur-sm sm:p-7 ${className}`}
    >
      {label && (
        <p className="flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-400">
          {step && <span className="text-ember-400">{step}</span>}
          {label}
          <span className="h-px flex-1 bg-gradient-to-r from-ink-800 to-transparent" aria-hidden="true" />
        </p>
      )}
      {children}
    </section>
  );
}
