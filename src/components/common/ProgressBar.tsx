interface ProgressBarProps {
  percent: number;
  label?: string;
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  return (
    <div>
      {label ? (
        <div className="mb-2 flex items-center justify-between text-[13px] text-[var(--color-text-secondary)]">
          <span>{label}</span>
          <span className="font-medium text-[var(--color-text)]">{percent}%</span>
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
        <div
          className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
