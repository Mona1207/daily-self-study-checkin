import { useMemo, useState } from "react";
import { CalendarCheck2, CheckCircle2, ListTodo, PartyPopper, Sparkles } from "lucide-react";
import { AppSettings, DailyReflection, StudySession, StudyTask, TaskEvidence, TaskTimerState } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Modal } from "../components/common/Modal";
import { ProgressBar } from "../components/common/ProgressBar";
import { TaskCard } from "../components/tasks/TaskCard";
import { TaskFilter, TaskFilters } from "../components/tasks/TaskFilters";
import { ReflectionPanel } from "../components/reflection/ReflectionPanel";
import { formatChineseDate, getGreeting, getTodayString, getWeekdayName } from "../utils/date";
import { getCompletionPercent, summarizeDay } from "../utils/statistics";
import { getNextTaskRecommendation } from "../utils/recommendations";
import { formatDuration } from "../utils/timer";
import { sortTasks } from "../utils/taskSort";

interface TodayPageProps {
  tasks: StudyTask[];
  settings: AppSettings;
  timerState?: TaskTimerState;
  sessions: StudySession[];
  evidences: TaskEvidence[];
  reflections: DailyReflection[];
  onComplete: (task: StudyTask) => void;
  onUndo: (task: StudyTask) => void;
  onStart: (task: StudyTask) => void;
  onPause: (task: StudyTask) => void;
  onResetTimer: (task: StudyTask) => void;
  onEvidence: (task: StudyTask) => void;
  onPostpone: (task: StudyTask, toDate: string, reason?: string, copy?: boolean) => void;
  onAbandon: (task: StudyTask) => void;
  onRestore: (task: StudyTask) => void;
  onSaveReflection: (reflection: DailyReflection) => void;
  onGoAdmin: () => void;
  notify: (type: "success" | "error" | "info", message: string) => void;
}

const getEncouragement = (percent: number, total: number, overdue: number): string => {
  if (overdue > 0) return "有任务延期也没关系，重新安排后继续前进。";
  if (total === 0) return "今天也要向目标前进一步！";
  if (percent === 100) return "今天的计划全部完成，做得很棒！";
  if (percent >= 60) return "已经完成一半了，继续保持！";
  if (percent > 0) return "开了一个好头，继续加油！";
  return "今天也要向目标前进一步！";
};

export function TodayPage({
  tasks,
  settings,
  timerState,
  sessions,
  evidences,
  reflections,
  onComplete,
  onUndo,
  onStart,
  onPause,
  onResetTimer,
  onEvidence,
  onPostpone,
  onAbandon,
  onRestore,
  onSaveReflection,
  onGoAdmin,
  notify,
}: TodayPageProps) {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [postponeTarget, setPostponeTarget] = useState<StudyTask | null>(null);
  const [postponeDate, setPostponeDate] = useState("");
  const [postponeReason, setPostponeReason] = useState("");
  const today = getTodayString();
  const todayDate = new Date();
  const visibleTodayTasks = tasks.filter((task) => task.date === today && task.status !== "postponed");
  const overdueTasks = tasks.filter((task) => task.date < today && (task.status === "overdue" || task.status === "pending" || task.status === "in_progress"));
  const summary = summarizeDay(tasks, today);
  const percent = getCompletionPercent(summary);
  const recommendation = getNextTaskRecommendation(tasks, today, timerState);
  const displayTasks = useMemo(() => {
    const base = [...overdueTasks, ...visibleTodayTasks.filter((task) => !overdueTasks.some((overdue) => overdue.id === task.id))];
    const filtered = base.filter((task) => {
      if (filter === "pending") return task.status !== "completed";
      if (filter === "done") return task.status === "completed";
      return true;
    });
    return sortTasks(filtered);
  }, [filter, overdueTasks, visibleTodayTasks]);

  const openPostpone = (task: StudyTask) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPostponeDate(tomorrow.toISOString().slice(0, 10));
    setPostponeReason("");
    setPostponeTarget(task);
  };

  if (tasks.length === 0) {
    return (
      <Card className="mx-auto mt-12 max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15">
          <ListTodo size={32} />
        </div>
        <h1 className="mt-5 text-2xl font-black">开始今天的学习计划吧</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-300">暂时还没有任务，请去自己添加任务或导入日历文件。</p>
        <Button className="mt-6" onClick={onGoAdmin}>
          添加第一个任务
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-sky-100 via-indigo-50 to-white p-5 shadow-soft sm:p-7 dark:from-sky-950 dark:via-indigo-950 dark:to-slate-900">
        <div>
          <div>
            <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-200">
              {formatChineseDate(todayDate)} · {getWeekdayName(todayDate)}
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-normal sm:text-4xl">
              {settings.studentName}，{getGreeting()}！
            </h1>
            <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{getEncouragement(percent, summary.total, overdueTasks.length)}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Card><CalendarCheck2 className="text-sky-500" size={28} /><p className="mt-3 text-sm text-slate-500">今日任务数</p><p className="text-3xl font-black">{summary.total}</p></Card>
        <Card><CheckCircle2 className="text-emerald-500" size={28} /><p className="mt-3 text-sm text-slate-500">已完成</p><p className="text-3xl font-black text-emerald-600">{summary.completed}</p></Card>
      </section>

      <Card className={summary.total > 0 && percent === 100 && settings.animationsEnabled ? "animate-pop" : ""}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black">今日完成进度</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              今日已完成 {summary.completed}/{summary.total} 项 · 计划 {summary.plannedMinutes} 分钟 · 实际 {formatDuration(summary.actualSeconds)}
            </p>
          </div>
          {summary.total > 0 && percent === 100 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              <PartyPopper size={18} />
              全部完成
            </span>
          )}
        </div>
        <ProgressBar percent={percent} />
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">接下来建议完成</p>
            <h2 className="mt-1 text-xl font-black">{recommendation.task?.title ?? "当前没有待推荐任务"}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{recommendation.reason}</p>
          </div>
          {recommendation.task && (
            <Button icon={<Sparkles size={18} />} onClick={() => onStart(recommendation.task!)}>
              开始学习
            </Button>
          )}
        </div>
      </Card>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black">今日任务列表</h2>
          <TaskFilters value={filter} onChange={setFilter} />
        </div>
        <div className="space-y-4">
          {displayTasks.length === 0 ? (
            <Card className="text-center text-slate-500 dark:text-slate-300">当前筛选下没有任务。</Card>
          ) : (
            displayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                showEstimatedTime={settings.showEstimatedTime}
                timerState={timerState}
                sessions={sessions}
                evidence={evidences.find((item) => item.id === task.evidenceId || item.taskId === task.id)}
                onComplete={onComplete}
                onUndo={onUndo}
                onStart={onStart}
                onPause={onPause}
                onResetTimer={onResetTimer}
                onEvidence={onEvidence}
                onPostpone={openPostpone}
                onAbandon={onAbandon}
                onRestore={onRestore}
              />
            ))
          )}
        </div>
      </section>

      <ReflectionPanel reflections={reflections} emphasized={percent === 100 && summary.total > 0} onSave={onSaveReflection} notify={notify} />

      <Modal title="延期任务" open={Boolean(postponeTarget)} onClose={() => setPostponeTarget(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">将“{postponeTarget?.title}”延期到新的日期。延期到过去日期会被拒绝。</p>
          <input className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="date" value={postponeDate} onChange={(event) => setPostponeDate(event.target.value)} />
          <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={postponeReason} onChange={(event) => setPostponeReason(event.target.value)} placeholder="延期原因，可选" />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setPostponeTarget(null)}>取消</Button>
            <Button
              onClick={() => {
                if (!postponeTarget) return;
                if (postponeDate < today) return notify("error", "不能延期到过去日期。");
                onPostpone(postponeTarget, postponeDate, postponeReason, false);
                setPostponeTarget(null);
              }}
            >
              确认延期
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (!postponeTarget) return;
                if (postponeDate < today) return notify("error", "不能复制到过去日期。");
                onPostpone(postponeTarget, postponeDate, postponeReason, true);
                setPostponeTarget(null);
              }}
            >
              复制到新日期
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
