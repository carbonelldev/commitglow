import type { SelectHTMLAttributes } from "react";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="group/select relative block w-full">
      <select
        className={[
          "w-full appearance-none rounded-sm border border-white/10 bg-[#050507]/90 px-4 py-3 pr-11 font-mono text-sm text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.18)] transition duration-200 hover:border-violet-300/35 hover:bg-white/[0.035] focus:border-violet-200/70 focus:bg-black/60 focus:ring-2 focus:ring-violet-300/25 disabled:cursor-not-allowed disabled:opacity-50",
          className
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute bottom-2 right-2 top-2 flex w-8 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.03] text-zinc-500 transition group-hover/select:border-violet-300/30 group-hover/select:text-violet-100 group-focus-within/select:border-violet-200/50 group-focus-within/select:bg-violet-500/10 group-focus-within/select:text-violet-100">
        <svg aria-hidden="true" className="h-3.5 w-3.5 transition group-focus-within/select:rotate-180" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.7">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </span>
    </span>
  );
}
