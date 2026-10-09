import { CircleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";

const tones = {
  info: { icon: Info, box: "border-ink-800 bg-ink-850/60 text-ink-400", iconColor: "text-iris" },
  warn: { icon: CircleAlert, box: "border-amber-glow/20 bg-amber-glow/5 text-amber-100/80", iconColor: "text-amber-glow" },
} as const;

export function Notice({ tone = "info", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const { icon: Icon, box, iconColor } = tones[tone];
  return (
    <div className={`flex gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${box}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
