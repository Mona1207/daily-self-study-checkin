import { useEffect, useState } from "react";
import { BookOpenCheck, CheckCircle2, Sparkles } from "lucide-react";
import { AppSettings, StudyTask } from "./types/task";
import { AppShell, PageKey } from "./components/layout/AppShell";
import { Button } from "./components/common/Button";
import { Card } from "./components/common/Card";
import { ToastContainer, ToastMessage, ToastType } from "./components/common/Toast";
import { TodayPage } from "./pages/TodayPage";
import { CalendarPage } from "./pages/CalendarPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { AdminPage } from "./pages/AdminPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useSettings } from "./hooks/useSettings";
import { useTasks } from "./hooks/useTasks";
import { createDemoTasks } from "./data/demoTasks";
import { PUBLISHED_TASKS_VERSION, publishedTasks } from "./data/publishedTasks";
import { getTodayString } from "./utils/date";
import { summarizeDay } from "./utils/statistics";

export default function App() {
  const { tasks, addTask, addTasks, updateTask, deleteTask, copyDay, replaceTasks, mergeTasks } = useTasks();
  const { settings, setSettings } = useSettings();
  const [page, setPage] = useState<PageKey>("today");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  useEffect(() => {
    if (settings.publishedTasksVersion === PUBLISHED_TASKS_VERSION) return;

    const taskMap = new Map(tasks.map((task) => [task.id, task]));
    publishedTasks.forEach((task) => {
      if (!taskMap.has(task.id)) {
        taskMap.set(task.id, task);
      }
    });

    replaceTasks(Array.from(taskMap.values()));
    setSettings({
      ...settings,
      onboarded: true,
      publishedTasksVersion: PUBLISHED_TASKS_VERSION,
    });
  }, [replaceTasks, setSettings, settings, tasks]);

  const notify = (type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2600);
  };

  const finishOnboarding = (mode: "demo" | "blank") => {
    if (mode === "demo") {
      replaceTasks(createDemoTasks());
      notify("success", "示例任务已准备好。");
    } else {
      replaceTasks([]);
      notify("info", "已从空白计划开始。");
    }
    setSettings({ ...settings, onboarded: true });
  };

  const handleComplete = (task: StudyTask) => {
    updateTask(task.id, { completed: true, completedAt: new Date().toISOString() });
    const today = getTodayString();
    const nextTasks = tasks.map((item) =>
      item.id === task.id ? { ...item, completed: true, completedAt: new Date().toISOString() } : item,
    );
    const summary = summarizeDay(nextTasks, today);
    if (task.date === today && summary.total > 0 && summary.completed === summary.total) {
      notify("success", `恭喜你，今天的学习任务全部完成！总学习 ${summary.minutes} 分钟。`);
    } else {
      notify("success", "任务完成，继续加油！");
    }
  };

  const handleUndo = (task: StudyTask) => {
    updateTask(task.id, { completed: false, completedAt: undefined });
    notify("info", "已取消完成状态。");
  };

  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
  };

  if (!settings.onboarded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-slate-50 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 dark:text-slate-100">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
          <Card className="w-full text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white">
              <BookOpenCheck size={34} />
            </div>
            <h1 className="mt-6 text-3xl font-black sm:text-4xl">开始今天的学习计划吧</h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
              这是一个给中学生使用的每日自学打卡网站。数据只保存在当前浏览器，可以通过 JSON 导入导出在设备间传递。
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => finishOnboarding("demo")}
                className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 text-left transition hover:-translate-y-1 hover:shadow-soft dark:border-indigo-900 dark:bg-indigo-500/15"
              >
                <Sparkles className="text-indigo-500" size={28} />
                <h2 className="mt-4 text-xl font-black">使用示例数据</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">预置数学、英语、语文和运动任务，方便马上查看页面效果。</p>
              </button>
              <button
                onClick={() => finishOnboarding("blank")}
                className="rounded-3xl border border-slate-100 bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900"
              >
                <CheckCircle2 className="text-emerald-500" size={28} />
                <h2 className="mt-4 text-xl font-black">从空白开始</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">不添加任何初始任务，进入后由任务管理页面自行安排。</p>
              </button>
            </div>
            <div className="mt-6">
              <Button variant="ghost" onClick={() => setSettings({ ...settings, onboarded: true })}>
                稍后再说，直接进入
              </Button>
            </div>
          </Card>
        </div>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  return (
    <AppShell activePage={page} onNavigate={setPage} settings={settings}>
      {page === "today" && (
        <TodayPage
          tasks={tasks}
          settings={settings}
          onComplete={handleComplete}
          onUndo={handleUndo}
          onGoAdmin={() => setPage("admin")}
        />
      )}
      {page === "calendar" && <CalendarPage tasks={tasks} settings={settings} />}
      {page === "statistics" && <StatisticsPage tasks={tasks} />}
      {page === "admin" && (
        <AdminPage
          tasks={tasks}
          settings={settings}
          onAddTask={addTask}
          onAddTasks={addTasks}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onCopyDay={copyDay}
          onReplaceTasks={replaceTasks}
          onMergeTasks={mergeTasks}
          onUpdateSettings={setSettings}
          notify={notify}
        />
      )}
      {page === "settings" && <SettingsPage settings={settings} onSave={handleSaveSettings} notify={notify} />}
      <ToastContainer toasts={toasts} />
    </AppShell>
  );
}
