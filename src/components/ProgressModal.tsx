import { Check, Circle, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { DownloadProgress } from "../types";
import { Button } from "./Button";
import { ErrorAlert } from "./ErrorAlert";

type StageState = "pending" | "active" | "done" | "error";

const icon: Record<StageState, ReactNode> = {
  pending: <Circle className="h-2 w-2 fill-zinc-700 text-zinc-700" />,
  active: <LoaderCircle className="h-4 w-4 animate-spin text-teal-400 motion-reduce:animate-none" />,
  done: <Check className="h-4 w-4 text-teal-400" />,
  error: <X className="h-4 w-4 text-red-400" />,
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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-0 text-zinc-200 shadow-2xl backdrop:bg-zinc-950/80 backdrop:backdrop-blur-sm"
    >
      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 id="progress-heading" className="text-base font-medium text-zinc-50">{heading}</h2>
          <p className="mt-0.5 truncate text-sm text-zinc-400" title={title}>{title}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 text-sm" aria-live="polite">
            <span className="text-zinc-200">
              {stage && !done ? `Step ${current + 1} of ${stages.length}: ${stage.label}` : done ? "All steps finished" : "Preparing"}
            </span>
            {fraction !== null && <span className="tabular-nums text-zinc-400">{Math.round(fraction * 100)}%</span>}
          </div>

          <div
            className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-label={stage?.label ?? "Download progress"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fraction === null ? undefined : Math.round(fraction * 100)}
          >
            {fraction === null ? (
              <div className="h-full w-1/3 rounded-full bg-teal-400 animate-[indeterminate_1.2s_ease-in-out_infinite] motion-reduce:animate-none" />
            ) : (
              <div
                className={`h-full rounded-full transition-[width] duration-200 ${failed ? "bg-red-400" : "bg-teal-400"}`}
                style={{ width: `${fraction * 100}%` }}
              />
            )}
          </div>

          <p className="min-h-5 text-xs tabular-nums text-zinc-500">{detail}</p>
        </div>

        {stages.length > 0 && (
          <ul className="space-y-2">
            {stages.map((s, i) => {
              const state = stateOf(i);
              return (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="flex h-4 w-4 items-center justify-center" aria-hidden="true">{icon[state]}</span>
                  <span className={state === "pending" ? "text-zinc-600" : state === "error" ? "text-red-300" : "text-zinc-200"}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {failed && <ErrorAlert message={error} />}

        {busy ? (
          <p className="text-xs text-zinc-500">Keep this tab open. Long videos can take a few minutes.</p>
        ) : (
          <div className="flex justify-end">
            <Button onClick={onClose} autoFocus>Close</Button>
          </div>
        )}
      </div>
    </dialog>
  );
}
