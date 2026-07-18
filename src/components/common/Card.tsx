import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`soft-card rounded-[var(--radius-lg)] p-4 ${className}`}
      {...props}
    />
  );
}
