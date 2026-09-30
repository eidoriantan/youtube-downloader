import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  /** Shown before the label; replaced by a spinner while loading. */
  icon?: ReactNode;
}

export function Button({ loading, icon, children, disabled, className = "", ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
