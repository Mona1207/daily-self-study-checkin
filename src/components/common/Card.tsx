import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ${className}`}
      {...props}
    />
  );
}
