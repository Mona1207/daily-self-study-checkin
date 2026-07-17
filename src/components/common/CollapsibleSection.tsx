import { ReactNode, useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  count?: number;
  defaultExpanded?: boolean;
  persistState?: boolean;
  children: ReactNode;
  className?: string;
}

type CollapsibleState = Record<string, boolean>;

export const COLLAPSIBLE_STORAGE_KEY = "ui-collapsed-sections";

const readState = (): CollapsibleState => {
  try {
    const raw = window.localStorage.getItem(COLLAPSIBLE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CollapsibleState) : {};
  } catch {
    return {};
  }
};

const writeState = (state: CollapsibleState) => {
  try {
    window.localStorage.setItem(COLLAPSIBLE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Layout preferences should never block normal app usage.
  }
};

export const resetCollapsiblePreferences = () => {
  try {
    window.localStorage.removeItem(COLLAPSIBLE_STORAGE_KEY);
  } catch {
    // Ignore storage errors for UI preferences.
  }
};

export function CollapsibleSection({
  id,
  title,
  subtitle,
  count,
  defaultExpanded = false,
  persistState = true,
  children,
  className = "",
}: CollapsibleSectionProps) {
  const reactId = useId();
  const contentId = `${id}-${reactId}`;
  const [expanded, setExpanded] = useState(() => {
    if (!persistState || typeof window === "undefined") return defaultExpanded;
    const stored = readState();
    return stored[id] ?? defaultExpanded;
  });

  useEffect(() => {
    if (!persistState) return;
    const stored = readState();
    writeState({ ...stored, [id]: expanded });
  }, [expanded, id, persistState]);

  return (
    <section className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}>
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-[var(--color-text)]">
            {title}
            {typeof count === "number" ? <span className="ml-2 text-[var(--color-text-secondary)]">{count}</span> : null}
          </span>
          {subtitle ? <span className="mt-0.5 block truncate text-xs text-[var(--color-text-secondary)]">{subtitle}</span> : null}
        </span>
        <ChevronDown className={`shrink-0 text-[var(--color-text-muted)] transition-transform duration-[var(--motion-fast)] ${expanded ? "rotate-180" : ""}`} size={20} />
      </button>
      {expanded && (
        <div id={contentId} className="animate-[fadeIn_180ms_ease-out] border-t border-[var(--color-border)] px-4 py-3">
          {children}
        </div>
      )}
    </section>
  );
}
