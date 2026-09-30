import { Check, Circle, LoaderCircle, RotateCw, X } from "lucide-react";
import type { ReactNode } from "react";
import type { LoadState, LoadStepState } from "../types";
import { Button } from "./Button";
import { ErrorAlert } from "./ErrorAlert";

const icon: Record<LoadStepState, ReactNode> = {
  pending: <Circle className="h-2 w-2 fill-zinc-700 text-zinc-700" />,
  active: <LoaderCircle className="h-4 w-4 animate-spin text-teal-400 motion-reduce:animate-none" />,
  done: <Check className="h-4 w-4 text-teal-400" />,
  error: <X className="h-4 w-4 text-red-400" />,
};

interface LoadingScreenProps extends Pick<LoadState, "steps" | "ready" | "error"> {
  onRetry: () => void;
}

export function LoadingScreen({ steps, ready, error, onRetry }: LoadingScreenProps) {
  if (ready) return null;
  const done = steps.filter((s) => s.state === "done").length;

  return (
    <div role="dialog" aria-modal="true" aria-label="Loading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 px-4">
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
              <span className="flex h-4 w-4 items-center justify-center" aria-hidden="true">{icon[s.state]}</span>
              <span className={s.state === "pending" ? "text-zinc-600" : s.state === "error" ? "text-red-300" : "text-zinc-200"}>
                {s.label}
              </span>
            </li>
          ))}
        </ul>

        {error && (
          <div className="mt-6 space-y-4">
            <ErrorAlert message={error} />
            <Button onClick={onRetry} icon={<RotateCw className="h-4 w-4" />}>Try again</Button>
          </div>
        )}
      </div>
    </div>
  );
}
