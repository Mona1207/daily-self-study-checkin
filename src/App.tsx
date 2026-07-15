import { useEffect, useState } from "react";
import { BookOpenCheck, CheckCircle2, Sparkles } from "lucide-react";
import { AppSettings, DailyReflection, StudyTask, TaskEvidence } from "./types/task";
import { AppShell, PageKey } from "./components/layout/AppShell";
import { Button } from "./components/common/Button";
import { Card } from "./components/common/Card";
import { ToastContainer, ToastMessage, ToastType } from "./components/common/Toast";
import { EvidenceDialog } from "./components/evidence/EvidenceDialog";
import { TodayPage } from "./pages/TodayPage";
import { CalendarPage } from "./pages/CalendarPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { AdminPage } from "./pages/AdminPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useTasks } from "./hooks/useTasks";
import { createDemoTasks } from "./data/demoTasks";
import { PUBLISHED_TASKS_VERSION, publishedTasks } from "./data/publishedTasks";
import { getTodayString } from "./utils/date";
import { summarizeDay } from "./utils/statistics";
import { isTimerCrossDay } from "./utils/timer";

export default function App() {
  const store = useTasks();
  const {
    database,
    tasks,
    settings,
    timerState,
    studySessions,
    evidences,
    reflections,
    addTask,
    addTasks,
    updateTask,
    deleteTask,
    copyDay,
    replaceTasks,
    mergeTasks,
    saveTemplate,
    deleteTemplate,
    generateRecurringTasks,
    saveEvidence,
    saveReflection,
    startTimer,
    pauseTimer,
    resetTimer,
    replaceDatabase,
  } = store;
  const [page, setPage] = useState<PageKey>("today");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [evidenceTarget, setEvidenceTarget] = useState<StudyTask | null>(null);
  const [completeAfterEvidence, setCompleteAfterEvidence] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  useEffect(() => {
    if (settings.publishedTasksVersion === PUBLISHED_TASKS_VERSION) return;
    const taskMap = new Map(tasks.map((task) => [task.id, task]));
    publishedTasks.forEach((task) => {
      if (!taskMap.has(task.id)) taskMap.set(task.id, task);
    });
    replaceDatabase({
      ...database,
      tasks: Array.from(taskMap.values()),
      settings: { ...settings, onboarded: true, publishedTasksVersion: PUBLISHED_TASKS_VERSION },
    });
  }, [database, replaceDatabase, settings, tasks]);

  useEffect(() => {
    if (database.recurringTemplates.length === 0) return;
    const created = generateRecurringTasks();
    if (created > 0) notify("info", `已自动生成 ${created} 个周期任务。`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database.recurringTemplates.length]);

  useEffect(() => {
    if (isTimerCrossDay(timerState)) {
      notify("info", "检测到有跨天计时，建议先暂停确认实际学习时长。");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notify = (type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const finishOnboarding = (mode: "demo" | "blank") => {
    replaceDatabase({
      ...database,
      tasks: mode === "demo" ? createDemoTasks() : [],
      settings: { ...settings, onboarded: true },
    });
    notify(mode === "demo" ? "success" : "info", mode === "demo" ? "示例任务已准备好。" : "已从空白计划开始。");
  };

  const stopTimerForTask = (task: StudyTask) => {
    if (timerState?.taskId === task.id) pauseTimer(task.id);
  };

  const markComplete = (task: StudyTask) => {
    stopTimerForTask(task);
    updateTask(task.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      completed: true,
    });
    const today = getTodayString();
    const nextTasks = tasks.map((item) => (item.id === task.id ? { ...item, status: "completed" as const, completedAt: new Date().toISOString() } : item));
    const summary = summarizeDay(nextTasks, today);
    if ((task.date === today || task.originalScheduledDate === today) && summary.total > 0 && summary.completed === summary.total) {
      notify("success", "恭喜你，今天的学习任务全部完成！");
    } else if ((task.originalScheduledDate ?? task.date) < today) {
      notify("success", "逾期补做完成。");
    } else {
      notify("success", "任务完成，继续加油！");
    }
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
    notify("info", "已取消完成状态，完成证明会保留。");
  };

  const handleStart = (task: StudyTask) => {
    if (timerState?.running && timerState.taskId !== task.id) {
      const oldTask = tasks.find((item) => item.id === timerState.taskId);
      const ok = window.confirm(`“${oldTask?.title ?? "另一个任务"}”正在计时。是否暂停旧任务并开始当前任务？`);
      if (!ok) return;
      startTimer(task, true);
    } else {
      startTimer(task, true);
    }
  };

  const handlePostpone = (task: StudyTask, toDate: string, reason?: string, copy = false) => {
    const record = { fromDate: task.date, toDate, reason, postponedAt: new Date().toISOString() };
    if (copy) {
      addTask({
        ...task,
        date: toDate,
        originalScheduledDate: task.originalScheduledDate ?? task.date,
        status: "pending",
        completedAt: undefined,
        evidenceId: undefined,
        actualSeconds: 0,
        postponeHistory: [...(task.postponeHistory ?? []), record],
      });
    } else {
      updateTask(task.id, {
        status: "postponed",
        postponeHistory: [...(task.postponeHistory ?? []), record],
      });
      addTask({
        ...task,
        date: toDate,
        originalScheduledDate: task.originalScheduledDate ?? task.date,
        status: "pending",
        completedAt: undefined,
        evidenceId: undefined,
        actualSeconds: 0,
        postponeHistory: [...(task.postponeHistory ?? []), record],
      });
    }
    notify("success", copy ? "已复制到新日期。" : "任务已延期。");
  };

  const handleSaveReflection = (reflection: DailyReflection) => saveReflection(reflection);

  const handleSaveSettings = (next: AppSettings) => {
    replaceDatabase({ ...database, settings: next });
  };

  if (!settings.onboarded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-slate-50 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 dark:text-slate-100">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
          <Card className="w-full text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white">
              <BookOpenCheck size={34} />
            </div>
            <h1 className="mt-6 text-3xl font-black sm:text-4xl">每日自学打卡</h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
              这是一个给中学生使用的每日自学任务管理与打卡网站。所有数据只保存在当前浏览器，本项目没有后端，不同设备之间不会自动同步，需要通过导出和导入数据完成任务传递。
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button onClick={() => finishOnboarding("demo")} className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 text-left transition hover:-translate-y-1 hover:shadow-soft dark:border-indigo-900 dark:bg-indigo-500/15">
                <Sparkles className="text-indigo-500" size={28} />
                <h2 className="mt-4 text-xl font-black">使用示例数据</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">预置数学、英语、语文和运动任务，方便马上查看页面效果。</p>
              </button>
              <button onClick={() => finishOnboarding("blank")} className="rounded-3xl border border-slate-100 bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <CheckCircle2 className="text-emerald-500" size={28} />
                <h2 className="mt-4 text-xl font-black">从空白开始</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">不添加任何初始任务，进入后由管理模式自行安排。</p>
              </button>
            </div>
            <div className="mt-6"><Button variant="ghost" onClick={() => replaceDatabase({ ...database, settings: { ...settings, onboarded: true } })}>稍后再说，直接进入</Button></div>
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
          timerState={timerState}
          sessions={studySessions}
          evidences={evidences}
          reflections={reflections}
          onComplete={handleComplete}
          onUndo={handleUndo}
          onStart={handleStart}
          onPause={(task) => pauseTimer(task.id)}
          onResetTimer={(task) => resetTimer(task.id)}
          onEvidence={(task) => { setCompleteAfterEvidence(false); setEvidenceTarget(task); }}
          onPostpone={handlePostpone}
          onAbandon={(task) => { updateTask(task.id, { status: "abandoned" }); notify("info", "已标记为放弃。"); }}
          onRestore={(task) => { updateTask(task.id, { status: task.date < getTodayString() ? "overdue" : "pending" }); notify("success", "任务已恢复。"); }}
          onSaveReflection={handleSaveReflection}
          onGoAdmin={() => setPage("admin")}
          notify={notify}
        />
      )}
      {page === "calendar" && <CalendarPage tasks={tasks} settings={settings} reflections={reflections} />}
      {page === "statistics" && <StatisticsPage tasks={tasks} reflections={reflections} />}
      {page === "admin" && (
        <AdminPage
          database={database}
          settings={settings}
          onAddTask={addTask}
          onAddTasks={addTasks}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onCopyDay={copyDay}
          onReplaceTasks={replaceTasks}
          onMergeTasks={mergeTasks}
          onSaveTemplate={saveTemplate}
          onDeleteTemplate={deleteTemplate}
          onGenerateRecurring={generateRecurringTasks}
          onReplaceDatabase={replaceDatabase}
          onUpdateSettings={handleSaveSettings}
          notify={notify}
        />
      )}
      {page === "settings" && <SettingsPage settings={settings} onSave={handleSaveSettings} notify={notify} />}
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
