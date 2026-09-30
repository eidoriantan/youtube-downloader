import { CircleAlert } from "lucide-react";

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="flex gap-2.5 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-300">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="break-words">{message}</p>
    </div>
  );
}
