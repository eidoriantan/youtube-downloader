import { CircleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";

const tones = {
  info: { icon: Info, box: "border-zinc-800 bg-zinc-950/60 text-zinc-400", iconColor: "text-teal-400" },
  warn: { icon: CircleAlert, box: "border-amber-900/50 bg-amber-950/20 text-amber-200/80", iconColor: "text-amber-400" },
} as const;

export function Notice({ tone = "info", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const { icon: Icon, box, iconColor } = tones[tone];
  return (
    <div className={`flex gap-2.5 rounded-lg border p-3 text-xs leading-relaxed ${box}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
