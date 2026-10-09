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
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-[0_8px_24px_-8px_rgb(255_106_69/0.55)] transition hover:brightness-110 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300 disabled:cursor-not-allowed disabled:bg-none disabled:bg-ink-800 disabled:text-ink-500 disabled:shadow-none disabled:hover:brightness-100 disabled:active:translate-y-0 ${className}`}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
