import type { JSX } from "react";
import type { LoadState, LoadStepState } from "../types";
import { Button } from "./Button";

const icon: Record<LoadStepState, JSX.Element> = {
  pending: <span className="h-2 w-2 rounded-full bg-zinc-700" />,
  active: (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400 motion-reduce:animate-none" />
  ),
  done: (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-teal-400" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  ),
};

interface LoadingScreenProps extends Pick<LoadState, "steps" | "ready" | "error"> {
  onRetry: () => void;
}

export function LoadingScreen({ steps, ready, error, onRetry }: LoadingScreenProps) {
  if (ready) return null;
  const done = steps.filter((s) => s.state === "done").length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 px-4"
    >
      <div className="w-full max-w-sm">
        <h2 className="text-lg font-medium text-zinc-50">
          {error ? "Couldn't finish loading" : "Getting things ready"}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {error ? "Something failed while setting up the in-browser tools." : "This runs once per visit and can take a moment."}
        </p>

        <div className="mt-5 h-1 overflow-hidden rounded-full bg-zinc-800" role="progressbar"
          aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}>
          <div className="h-full rounded-full bg-teal-400 transition-all duration-500"
            style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>

        <ul className="mt-5 space-y-3">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-3 text-sm">
              <span className="flex h-4 w-4 items-center justify-center">{icon[s.state]}</span>
              <span className={s.state === "pending" ? "text-zinc-600" : s.state === "error" ? "text-red-300" : "text-zinc-200"}>
                {s.label}
              </span>
            </li>
          ))}
        </ul>

        {error && (
          <div className="mt-6 space-y-4">
            <pre className="whitespace-pre-wrap rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">{error}</pre>
            <Button onClick={onRetry}>Try again</Button>
          </div>
        )}
      </div>
    </div>
  );
}
