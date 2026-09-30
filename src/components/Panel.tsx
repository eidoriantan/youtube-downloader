import type { ReactNode } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}
