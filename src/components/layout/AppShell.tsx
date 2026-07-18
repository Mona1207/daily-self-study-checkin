import { ReactNode } from "react";
import { BarChart3, CalendarDays, CircleUserRound, ListTodo, SunMedium } from "lucide-react";
import { AppSettings } from "../../types/task";

export type PageKey = "today" | "calendar" | "statistics" | "profile";

interface AppShellProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  settings: AppSettings;
  children: ReactNode;
}

const navItems: Array<{ key: PageKey; label: string; icon: typeof ListTodo }> = [
  { key: "today", label: "今天", icon: SunMedium },
  { key: "calendar", label: "日历", icon: CalendarDays },
  { key: "statistics", label: "统计", icon: BarChart3 },
  { key: "profile", label: "我的", icon: CircleUserRound },
];

export function AppShell({ activePage, onNavigate, settings, children }: AppShellProps) {
  return (
    <div className="min-h-screen text-[var(--color-text)]" data-density={settings.layoutDensity ?? (settings.compactLayout ? "compact" : "standard")}>
      <main className="min-h-screen pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+8px)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto w-full max-w-[410px] px-[var(--page-x)] py-4 sm:py-6">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-page)] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(20_24_50_/_0.06)]">
        <div className="mx-auto grid max-w-[410px] grid-cols-4 gap-1 px-3 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-[14px] text-[11px] font-semibold transition duration-[var(--motion-fast)] ${
                  active
                    ? "text-[var(--color-brand)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                }`}
                aria-current={active ? "page" : undefined}
                aria-label={`切换到${item.label}`}
              >
                <span className={active ? "flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-soft)]" : "flex h-7 w-7 items-center justify-center"}>
                  <Icon size={21} strokeWidth={active ? 2.3 : 1.9} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
