import { Check, Circle, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { DownloadProgress } from "../types";
import { Button } from "./Button";
import { ErrorAlert } from "./ErrorAlert";

type StageState = "pending" | "active" | "done" | "error";

const icon: Record<StageState, ReactNode> = {
  pending: <Circle className="h-2 w-2 fill-ink-700 text-ink-700" />,
  active: <LoaderCircle className="h-4 w-4 animate-spin text-ember-400 motion-reduce:animate-none" />,
  done: <Check className="h-4 w-4 text-ember-400" />,
  error: <X className="h-4 w-4 text-rose-400" />,
};

interface ProgressModalProps {
  open: boolean;
  /** Title of the media being downloaded. */
  title: string;
  progress: DownloadProgress | null;
  busy: boolean;
  savedAs: string;
  error: string;
  onClose: () => void;
}

/**
 * Blocking modal shown while a download runs. It can only be closed once the
 * download has finished or failed, since the work can't be cancelled midway.
 */
export function ProgressModal({ open, title, progress, busy, savedAs, error, onClose }: ProgressModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const failed = !busy && !!error;
  const done = !busy && !error && !!savedAs;
  const stages = progress?.stages ?? [];
  const current = progress?.current ?? 0;
  const fraction = done ? 1 : (progress?.fraction ?? null);
  const stage = stages[current];

  const stateOf = (i: number): StageState =>
    done || i < current ? "done" : i > current ? "pending" : failed ? "error" : "active";

  const heading = failed ? "Download failed" : done ? "Download complete" : "Downloading";
  const detail = done
    ? `Saved as ${savedAs}. Check your browser's downloads if it didn't open.`
    : failed
      ? "Something went wrong partway through."
      : (progress?.detail ?? "Starting…");

  return (
    <dialog
      ref={ref}
      aria-labelledby="progress-heading"
      onCancel={(e) => {
        e.preventDefault(); // Escape only closes once the work is over
        if (!busy) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-ink-700/70 bg-ink-900 p-0 outline-none text-ink-200 shadow-[0_40px_80px_-20px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_255_255/0.02)] backdrop:bg-ink-950/80 backdrop:backdrop-blur-md"
    >
      <div className="space-y-5 p-6 sm:p-7">
        <div>
          <h2 id="progress-heading" className="font-display text-xl font-semibold tracking-tight text-cream">{heading}</h2>
          <p className="mt-0.5 truncate text-sm text-ink-400" title={title}>{title}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 text-sm" aria-live="polite">
            <span className="text-ink-200">
              {stage && !done ? `Step ${current + 1} of ${stages.length}: ${stage.label}` : done ? "All steps finished" : "Preparing"}
            </span>
            {fraction !== null && <span className="tabular-nums text-ink-400">{Math.round(fraction * 100)}%</span>}
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-ink-800"
            role="progressbar"
            aria-label={stage?.label ?? "Download progress"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fraction === null ? undefined : Math.round(fraction * 100)}
          >
            {fraction === null ? (
              <div className="h-full w-1/3 rounded-full bg-ember animate-[indeterminate_1.2s_ease-in-out_infinite] motion-reduce:animate-none" />
            ) : (
              <div
                className={`h-full rounded-full transition-[width] duration-200 ${failed ? "bg-rose-400" : "bg-ember"}`}
                style={{ width: `${fraction * 100}%` }}
              />
            )}
          </div>

          <p className="min-h-5 text-xs tabular-nums text-ink-500">{detail}</p>
        </div>

        {stages.length > 0 && (
          <ul className="space-y-2">
            {stages.map((s, i) => {
              const state = stateOf(i);
              return (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="flex h-4 w-4 items-center justify-center" aria-hidden="true">{icon[state]}</span>
                  <span className={state === "pending" ? "text-ink-600" : state === "error" ? "text-rose-300" : "text-ink-200"}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {failed && <ErrorAlert message={error} />}

        {busy ? (
          <p className="text-xs text-ink-500">Keep this tab open. Long videos can take a few minutes.</p>
        ) : (
          <div className="flex justify-end">
            <Button onClick={onClose} autoFocus>Close</Button>
          </div>
        )}
      </div>
    </dialog>
  );
}
