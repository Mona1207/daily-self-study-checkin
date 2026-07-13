import { ReactNode } from "react";
import { BarChart3, CalendarDays, ClipboardList, LockKeyhole, Settings } from "lucide-react";
import { AppSettings } from "../../types/task";

export type PageKey = "today" | "calendar" | "statistics" | "admin" | "settings";

interface AppShellProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  settings: AppSettings;
  children: ReactNode;
}

const navItems: Array<{ key: PageKey; label: string; icon: typeof ClipboardList }> = [
  { key: "today", label: "今日任务", icon: ClipboardList },
  { key: "calendar", label: "学习日历", icon: CalendarDays },
  { key: "statistics", label: "学习统计", icon: BarChart3 },
  { key: "admin", label: "任务管理", icon: LockKeyhole },
  { key: "settings", label: "个性设置", icon: Settings },
];

export function AppShell({ activePage, onNavigate, settings, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-slate-200 bg-white/90 p-5 backdrop-blur lg:block dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-lg font-black text-white">
            学
          </div>
          <h1 className="mt-4 text-xl font-black">每日自学打卡</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">一步一步靠近目标</p>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? "bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-500/15 dark:text-indigo-200"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <div className="font-semibold text-slate-700 dark:text-slate-100">{settings.studentName}</div>
          <div>每日目标 {settings.dailyGoal} 项任务</div>
        </div>
      </aside>

      <main className="min-h-screen pb-24 lg:ml-64 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition ${
                active
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
