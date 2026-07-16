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

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#1F2329] dark:bg-slate-950 dark:text-slate-100">
      <main className="min-h-screen pb-24">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:py-6">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E9EBEF] bg-white/95 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[10px] text-xs font-medium transition ${
                  active
                    ? "bg-[#EEF2FF] text-[#4F6EF7] dark:bg-indigo-500/15 dark:text-indigo-200"
                    : "text-[#6B7280] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
