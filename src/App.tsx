import { useEffect, useState } from "react";
import { Import, Plus, Sparkles } from "lucide-react";
import { AppSettings, DailyReflection, StudyTask, TaskEvidence } from "./types/task";
import { AppShell, PageKey } from "./components/layout/AppShell";
import { Button } from "./components/common/Button";
import { Card } from "./components/common/Card";
import { EvidenceDialog } from "./components/evidence/EvidenceDialog";
import { ToastContainer, ToastMessage, ToastType } from "./components/common/Toast";
import { TodayPage } from "./pages/TodayPage";
import { CalendarPage } from "./pages/CalendarPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useTasks } from "./hooks/useTasks";
import { createDemoTasks } from "./data/demoTasks";
import { PUBLISHED_TASKS_VERSION } from "./data/publishedTasks";
import { getTodayString } from "./utils/date";
import { summarizeDay } from "./utils/statistics";

export default function App() {
  const store = useTasks();
  const {
    database,
    tasks,
    settings,
    evidences,
    reflections,
    addTask,
    addTasks,
    updateTask,
    deleteTask,
    restoreTask,
    copyDay,
    replaceTasks,
    mergeTasks,
    saveTemplate,
    deleteTemplate,
    generateRecurringTasks,
    saveEvidence,
    saveReflection,
    replaceDatabase,
  } = store;
  const [page, setPage] = useState<PageKey>("today");
  const [calendarDate, setCalendarDate] = useState(getTodayString());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [evidenceTarget, setEvidenceTarget] = useState<StudyTask | null>(null);
  const [completeAfterEvidence, setCompleteAfterEvidence] = useState(false);

  useEffect(() => {
    const applyTheme = () => {
      const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
      const mode = settings.themeMode ?? (settings.darkMode ? "dark" : "light");
      document.documentElement.classList.toggle("dark", mode === "dark" || (mode === "system" && systemDark));
      document.documentElement.dataset.themeColor = settings.themeColor ?? "blueviolet";
      const pageColor = getComputedStyle(document.documentElement).getPropertyValue("--color-page").trim();
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", pageColor || "#f7f8fa");
      document.body.style.backgroundColor = pageColor || "";
    };
    applyTheme();
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener("change", applyTheme);
    return () => media?.removeEventListener("change", applyTheme);
  }, [settings.darkMode, settings.themeColor, settings.themeMode]);

  useEffect(() => {
    if (settings.publishedTasksVersion === PUBLISHED_TASKS_VERSION) return;
    replaceDatabase({
      ...database,
      settings: { ...settings, onboarded: true, publishedTasksVersion: PUBLISHED_TASKS_VERSION },
    });
  }, [database, replaceDatabase, settings]);

  useEffect(() => {
    const rootState = { ...(window.history.state ?? {}), appExitGuardRoot: true };
    window.history.replaceState(rootState, "");
    window.history.pushState({ appExitGuardTop: true }, "");
    let edgeTouchStart: { x: number; y: number } | null = null;

    const keepAppOpenOnBackSwipe = (event: PopStateEvent) => {
      if (event.state?.appExitGuardRoot) window.history.pushState({ appExitGuardTop: true }, "");
    };
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      edgeTouchStart = touch && touch.clientX < 24 ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (!edgeTouchStart) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dx = touch.clientX - edgeTouchStart.x;
      const dy = Math.abs(touch.clientY - edgeTouchStart.y);
      if (dx > 8 && dx > dy) event.preventDefault();
    };

    window.addEventListener("popstate", keepAppOpenOnBackSwipe);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener("popstate", keepAppOpenOnBackSwipe);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useEffect(() => {
    if (database.recurringTemplates.length === 0) return;
    const created = generateRecurringTasks();
    if (created > 0) notify("info", `已生成 ${created} 个重复任务。`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database.recurringTemplates.length]);

  const notify = (type: ToastType, message: string, action?: Pick<ToastMessage, "actionLabel" | "onAction">) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, type, message, ...action }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3000);
  };

  const finishOnboarding = (mode: "demo" | "blank" | "import") => {
    if (mode === "import") {
      replaceDatabase({ ...database, settings: { ...settings, onboarded: true } });
      setPage("profile");
      notify("info", "可以在“我的 > 数据管理”里导入已有数据。");
      return;
    }
    replaceDatabase({
      ...database,
      tasks: mode === "demo" ? createDemoTasks() : [],
      settings: { ...settings, onboarded: true, userName: settings.userName || "我" },
    });
    notify(mode === "demo" ? "success" : "info", mode === "demo" ? "示例任务已准备好。" : "可以创建你的第一件事了。");
  };

  const markComplete = (task: StudyTask) => {
    updateTask(task.id, { status: "completed", completedAt: new Date().toISOString(), completed: true });
    const today = getTodayString();
    const nextTasks = tasks.map((item) => (item.id === task.id ? { ...item, status: "completed" as const, completedAt: new Date().toISOString() } : item));
    const summary = summarizeDay(nextTasks, today);
    if ((task.date === today || task.originalDate === today || task.originalScheduledDate === today) && summary.total > 0 && summary.completed === summary.total) notify("success", "今天的任务已完成。");
    else notify("success", "已完成。");
  };

  const handleComplete = (task: StudyTask) => {
    if (task.status === "completed") return notify("info", "这个任务已经完成了。");
    const evidence = evidences.find((item) => item.taskId === task.id || item.id === task.evidenceId);
    if (task.evidenceRequirement !== "none" && !evidence) {
      setCompleteAfterEvidence(true);
      setEvidenceTarget(task);
      return;
    }
    markComplete(task);
  };

  const handleEvidenceSave = (evidence: TaskEvidence) => {
    saveEvidence(evidence);
    if (completeAfterEvidence) {
      const task = tasks.find((item) => item.id === evidence.taskId);
      if (task) markComplete({ ...task, evidenceId: evidence.id });
    }
    setCompleteAfterEvidence(false);
  };

  const handleUndo = (task: StudyTask) => {
    updateTask(task.id, { status: task.date < getTodayString() ? "overdue" : "pending", completedAt: undefined, completed: false });
    notify("info", "已撤销完成。");
  };

  const handleDelete = (task: StudyTask) => {
    deleteTask(task.id);
    notify("info", "任务已删除。", {
      actionLabel: "撤销",
      onAction: () => {
        restoreTask(task);
        notify("success", "已恢复任务。");
      },
    });
  };

  const handlePostpone = (task: StudyTask, toDate: string, reason?: string, copy = false) => {
    const record = { fromDate: task.date, toDate, reason, postponedAt: new Date().toISOString() };
    const nextTask = {
      ...task,
      date: toDate,
      originalDate: task.originalDate ?? task.date,
      originalScheduledDate: task.originalScheduledDate ?? task.date,
      status: "pending" as const,
      completedAt: undefined,
      evidenceId: undefined,
      postponeHistory: [...(task.postponeHistory ?? []), record],
    };
    if (!copy) updateTask(task.id, { status: "postponed", postponeHistory: [...(task.postponeHistory ?? []), record] });
    addTask(nextTask);
    notify("success", copy ? "已复制到新日期。" : "已延期到新日期。");
  };

  const handleSaveSettings = (next: AppSettings) => replaceDatabase({ ...database, settings: next });

  const goCalendarDate = (date: string) => {
    setCalendarDate(date);
    setPage("calendar");
  };

  if (!settings.onboarded) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] px-4 py-8 text-[#1F2329] dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
          <Card className="w-full">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#EEF2FF] text-2xl font-semibold text-[#4F6EF7]">清</div>
              <h1 className="mt-6 text-[22px] font-semibold">欢迎使用今日清单</h1>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">把每天要做的事，清楚地安排好。数据只保存在当前设备，不需要注册登录。</p>
            </div>
            <div className="mt-8 space-y-3">
              <button className="flex w-full items-center gap-3 rounded-[12px] border border-[#E9EBEF] bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900" onClick={() => finishOnboarding("blank")}>
                <Plus className="text-[#4F6EF7]" size={22} />
                <div><div className="font-semibold">创建第一个任务</div><div className="text-sm text-[#6B7280]">从空白清单创建</div></div>
              </button>
              <button className="flex w-full items-center gap-3 rounded-[12px] border border-[#E9EBEF] bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900" onClick={() => finishOnboarding("demo")}>
                <Sparkles className="text-[#4F6EF7]" size={22} />
                <div><div className="font-semibold">使用示例任务</div><div className="text-sm text-[#6B7280]">快速看看应用效果</div></div>
              </button>
              <button className="flex w-full items-center gap-3 rounded-[12px] border border-[#E9EBEF] bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900" onClick={() => finishOnboarding("import")}>
                <Import className="text-[#4F6EF7]" size={22} />
                <div><div className="font-semibold">导入已有数据</div><div className="text-sm text-[#6B7280]">从备份恢复</div></div>
              </button>
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
          evidences={evidences}
          reflections={reflections}
          onAddTask={addTask}
          onUpdateTask={(task, patch) => { updateTask(task.id, patch); notify("success", "任务已更新。"); }}
          onDeleteTask={handleDelete}
          onComplete={handleComplete}
          onUndo={handleUndo}
          onEvidence={(task) => { setCompleteAfterEvidence(false); setEvidenceTarget(task); }}
          onPostpone={handlePostpone}
          onCancel={(task) => { updateTask(task.id, { status: "cancelled" }); notify("info", "已取消任务。"); }}
          onRestore={(task) => { updateTask(task.id, { status: task.date < getTodayString() ? "overdue" : "pending" }); notify("success", "任务已恢复。"); }}
          onSaveReflection={saveReflection}
          onGoCalendar={() => goCalendarDate(getTodayString())}
          notify={notify}
        />
      )}
      {page === "calendar" && (
        <CalendarPage
          tasks={tasks}
          settings={settings}
          reflections={reflections}
          initialDate={calendarDate}
          onAddTask={addTask}
          onUpdateTask={(task, patch) => { updateTask(task.id, patch); notify("success", "任务已更新。"); }}
          onDeleteTask={handleDelete}
          onComplete={handleComplete}
          onUndo={handleUndo}
          onSaveReflection={saveReflection}
          notify={notify}
        />
      )}
      {page === "statistics" && <StatisticsPage tasks={tasks} reflections={reflections} onGoDate={goCalendarDate} />}
      {page === "profile" && (
        <SettingsPage
          database={database}
          settings={settings}
          tasks={tasks}
          onAddTasks={addTasks}
          onUpdateSettings={handleSaveSettings}
          onReplaceDatabase={replaceDatabase}
          onSaveTemplate={saveTemplate}
          onDeleteTemplate={deleteTemplate}
          onGenerateRecurring={generateRecurringTasks}
          notify={notify}
        />
      )}
      <EvidenceDialog
        task={evidenceTarget}
        evidence={evidences.find((item) => item.taskId === evidenceTarget?.id || item.id === evidenceTarget?.evidenceId)}
        open={Boolean(evidenceTarget)}
        onClose={() => { setEvidenceTarget(null); setCompleteAfterEvidence(false); }}
        onSave={handleEvidenceSave}
        notify={notify}
      />
      <ToastContainer toasts={toasts} />
    </AppShell>
  );
}
