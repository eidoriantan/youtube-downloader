import { Check, Circle, LoaderCircle, RotateCw, X } from "lucide-react";
import type { ReactNode } from "react";
import type { LoadState, LoadStepState } from "../types";
import { Button } from "./Button";
import { ErrorAlert } from "./ErrorAlert";
import { Panel } from "./Panel";

const icon: Record<LoadStepState, ReactNode> = {
  pending: <Circle className="h-2 w-2 fill-ink-700 text-ink-700" />,
  active: <LoaderCircle className="h-4 w-4 animate-spin text-ember-400 motion-reduce:animate-none" />,
  done: <Check className="h-4 w-4 text-ember-400" />,
  error: <X className="h-4 w-4 text-rose-400" />,
};

interface EngineStatusProps extends Pick<LoadState, "steps" | "ready" | "error"> {
  onRetry: () => void;
}

/**
 * Inline loading progress for the in-browser tools. It never blocks the page:
 * the form stays usable and requests simply wait for the tools they need.
 */
export function EngineStatus({ steps, ready, error, onRetry }: EngineStatusProps) {
  if (ready) return null;
  const done = steps.filter((s) => s.state === "done").length;

  return (
    <Panel className="space-y-4">
      <div aria-live="polite">
        <h2 className="font-display text-base font-semibold text-cream">
          {error ? "Couldn't finish loading" : "Getting things ready"}
        </h2>
        <p className="mt-1 text-sm text-ink-400">
          {error
            ? "Something failed while setting up the in-browser tools."
            : "This runs once per visit. You can paste a link in the meantime."}
        </p>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-ink-800" role="progressbar" aria-label="Loading tools"
        aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}>
        <div className="h-full rounded-full bg-ember transition-all duration-500"
          style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>

      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-3 text-sm">
            <span className="flex h-4 w-4 items-center justify-center" aria-hidden="true">{icon[s.state]}</span>
            <span className={s.state === "pending" ? "text-ink-600" : s.state === "error" ? "text-rose-300" : "text-ink-200"}>
              {s.label}
            </span>
          </li>
        ))}
      </ul>

      {error && (
        <div className="space-y-4">
          <ErrorAlert message={error} />
          <Button onClick={onRetry} icon={<RotateCw className="h-4 w-4" />}>Try again</Button>
        </div>
      )}
    </Panel>
  );
}
