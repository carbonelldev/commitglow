import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type BaseProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;
type AnchorButtonProps = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

const variants = {
  primary:
    "border-violet-300/70 bg-violet-500/20 text-white shadow-[0_0_28px_rgba(139,92,246,0.22)] hover:border-violet-200 hover:bg-violet-500/25",
  secondary: "border-white/15 bg-white/[0.02] text-white hover:border-violet-300/70 hover:text-white",
  ghost: "border-transparent bg-transparent text-zinc-300 hover:border-white/10 hover:text-white"
};

function classes(variant: BaseProps["variant"], className?: string) {
  return [
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] transition duration-200 focus:outline-none focus:ring-2 focus:ring-violet-300/50 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant ?? "secondary"],
    className
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({ variant = "secondary", className, ...props }: ButtonProps) {
  return <button className={classes(variant, className)} {...props} />;
}

export function AnchorButton({ variant = "secondary", className, ...props }: AnchorButtonProps) {
  return <a className={classes(variant, className)} {...props} />;
}
