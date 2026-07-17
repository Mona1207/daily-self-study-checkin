import { ReactNode } from "react";
import { BarChart3, CalendarDays, CheckSquare, Settings } from "lucide-react";
import { AppSettings } from "../../types/task";

export type PageKey = "today" | "calendar" | "statistics" | "profile";

interface AppShellProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  settings: AppSettings;
  children: ReactNode;
}

const navItems: Array<{ key: PageKey; label: string; icon: typeof CheckSquare }> = [
  { key: "today", label: "今天", icon: CheckSquare },
  { key: "calendar", label: "日历", icon: CalendarDays },
  { key: "statistics", label: "统计", icon: BarChart3 },
  { key: "profile", label: "我的", icon: Settings },
];

export function AppShell({ activePage, onNavigate, settings, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text)]" data-density={settings.layoutDensity ?? (settings.compactLayout ? "compact" : "standard")}>
      <main className="min-h-screen pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+20px)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto w-full max-w-3xl px-[var(--page-x)] py-4 sm:py-6">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] text-[11px] font-medium transition duration-[var(--motion-fast)] ${
                  active
                    ? "text-[var(--color-brand)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                }`}
                aria-current={active ? "page" : undefined}
                aria-label={`切换到${item.label}`}
              >
                <Icon size={22} strokeWidth={1.9} />
                <span>{item.label}</span>
                {active ? <span className="absolute bottom-0.5 h-[3px] w-[3px] rounded-full bg-[var(--color-brand)]" /> : null}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
