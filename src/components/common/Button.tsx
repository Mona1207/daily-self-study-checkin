import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-brand)] text-white hover:brightness-95 active:brightness-90 shadow-sm",
  secondary: "bg-[var(--color-surface)] text-[var(--color-text)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-muted)] active:brightness-95",
  ghost: "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] active:brightness-95",
  danger: "bg-[var(--color-danger)] text-white hover:brightness-95 active:brightness-90 shadow-sm",
  success: "bg-[var(--color-success)] text-white hover:brightness-95 active:brightness-90 shadow-sm",
};

export function Button({ variant = "primary", icon, className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-[var(--button-height)] items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition duration-[var(--motion-fast)] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
