import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-300/70 focus:ring-2 focus:ring-violet-300/25 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
