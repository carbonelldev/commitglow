import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "rounded-md border border-white/10 bg-black/30 p-4 transition duration-200 hover:border-violet-300/40 sm:p-6",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
