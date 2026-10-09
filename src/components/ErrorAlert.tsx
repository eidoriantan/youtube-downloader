import { CircleAlert } from "lucide-react";

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="flex gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
      <p className="break-words">{message}</p>
    </div>
  );
}
