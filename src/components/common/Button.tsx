import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[image:var(--brand-gradient)] text-white shadow-[var(--brand-shadow)] hover:brightness-105 active:brightness-95",
  secondary: "bg-white/80 text-[var(--color-text)] ring-1 ring-[var(--color-border)] hover:bg-white active:brightness-95 dark:bg-white/10 dark:hover:bg-white/15",
  ghost: "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] active:brightness-95",
  danger: "bg-transparent text-[var(--color-danger)] ring-1 ring-[var(--color-border)] hover:bg-red-50 active:brightness-95 dark:hover:bg-red-500/10",
  success: "bg-[var(--color-success)] text-white hover:brightness-95 active:brightness-90 shadow-sm",
};

export function Button({ variant = "primary", icon, className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-[var(--button-height)] items-center justify-center gap-2 rounded-[14px] px-4 py-2 text-sm font-semibold transition duration-[var(--motion-fast)] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
