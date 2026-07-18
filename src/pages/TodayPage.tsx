import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Clock3, Plus } from "lucide-react";
import { AppSettings, DailyReflection, StudyTask, TaskEvidence } from "../types/task";
import { CollapsibleSection } from "../components/common/CollapsibleSection";
import { ProgressBar } from "../components/common/ProgressBar";
import { ReflectionPanel } from "../components/reflection/ReflectionPanel";
import { TaskCard } from "../components/tasks/TaskCard";
import { TaskEditorSheet, TaskEditorValue } from "../components/tasks/TaskEditorSheet";
import { addDays, getGreeting, getTodayString, getWeekdayName, toDateString } from "../utils/date";
import { getCompletionPercent, summarizeDay } from "../utils/statistics";
import { sortTasks } from "../utils/taskSort";

type NewTaskInput = Omit<StudyTask, "id" | "createdAt" | "updatedAt" | "status" | "completed"> &
  Partial<Pick<StudyTask, "status" | "evidenceRequirement">>;

interface TodayPageProps {
  tasks: StudyTask[];
  settings: AppSettings;
  evidences: TaskEvidence[];
  reflections: DailyReflection[];
  onAddTask: (task: NewTaskInput) => StudyTask | void;
  onUpdateTask: (task: StudyTask, patch: Partial<StudyTask>) => void;
  onDeleteTask: (task: StudyTask) => void;
  onComplete: (task: StudyTask) => void;
  onUndo: (task: StudyTask) => void;
  onEvidence: (task: StudyTask) => void;
  onPostpone: (task: StudyTask, toDate: string, reason?: string, copy?: boolean) => void;
  onCancel: (task: StudyTask) => void;
  onRestore: (task: StudyTask) => void;
  onSaveReflection: (reflection: DailyReflection) => void;
  onGoCalendar: () => void;
  notify: (type: "success" | "error" | "info", message: string) => void;
}

const SectionTasks = ({
  list,
  suggestedId,
  settings,
  evidences,
  limit,
  onComplete,
  onUndo,
  onUpdateTask,
  onEvidence,
  onPostpone,
  onMove,
  onCopy,
  onCancel,
  onRestore,
  onDeleteTask,
  onDragStart,
  onDropTask,
}: {
  list: StudyTask[];
  suggestedId?: string;
  settings: AppSettings;
  evidences: TaskEvidence[];
  limit: number;
  onComplete: (task: StudyTask) => void;
  onUndo: (task: StudyTask) => void;
  onUpdateTask: (task: StudyTask, patch: Partial<StudyTask>) => void;
  onEvidence: (task: StudyTask) => void;
  onPostpone: (task: StudyTask) => void;
  onMove: (task: StudyTask, date: string) => void;
  onCopy: (task: StudyTask, date: string) => void;
  onCancel: (task: StudyTask) => void;
  onRestore: (task: StudyTask) => void;
  onDeleteTask: (task: StudyTask) => void;
  onDragStart?: (task: StudyTask) => void;
  onDropTask?: (task: StudyTask) => void;
}) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? list : list.slice(0, limit);
  return (
    <div className="space-y-3 overflow-visible">
      {visible.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          suggested={task.id === suggestedId}
          showEstimatedTime={settings.showEstimatedTime}
          evidence={evidences.find((item) => item.id === task.evidenceId || item.taskId === task.id)}
          onComplete={onComplete}
          onUndo={onUndo}
          onUpdate={onUpdateTask}
          onEvidence={onEvidence}
          onPostpone={onPostpone}
          onMove={onMove}
          onCopy={onCopy}
          onCancel={onCancel}
          onRestore={onRestore}
          onDelete={onDeleteTask}
          onDragStart={onDragStart}
          onDropTask={onDropTask}
        />
      ))}
      {list.length > limit && (
        <button className="min-h-11 w-full rounded-[14px] bg-white/60 text-sm font-semibold text-[var(--color-brand)] shadow-[var(--shadow-soft)] dark:bg-white/10" onClick={() => setShowAll((value) => !value)}>
          {showAll ? `收起到前${limit}项` : `显示剩余${list.length - limit}项`}
        </button>
      )}
    </div>
  );
};

export function TodayPage({
  tasks,
  settings,
  evidences,
  reflections,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onComplete,
  onUndo,
  onEvidence,
  onPostpone,
  onCancel,
  onRestore,
  onSaveReflection,
  onGoCalendar,
  notify,
}: TodayPageProps) {
  const today = getTodayString();
  const todayDate = new Date();
  const [quickOpen, setQuickOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<StudyTask | null>(null);

  const summary = summarizeDay(tasks, today);
  const percent = getCompletionPercent(summary);
  const todayTasks = tasks.filter((task) => task.date === today);

  const grouped = useMemo(() => {
    const overdue = sortTasks(tasks.filter((task) => task.status === "overdue" || (task.status === "pending" && task.date < today)));
    const pending = sortTasks(todayTasks.filter((task) => task.status === "pending"));
    const completed = sortTasks(todayTasks.filter((task) => task.status === "completed"));
    const other = sortTasks(todayTasks.filter((task) => task.status === "postponed" || task.status === "cancelled"));
    const suggested = [...overdue, ...pending].find((task) => task.priority === "high") ?? overdue[0] ?? pending[0];
    return { overdue, pending, completed, other, suggested };
  }, [tasks, today, todayTasks]);

  const createFromEditor = (value: TaskEditorValue) => {
    onAddTask(value);
  };

  const reorderTask = (target: StudyTask) => {
    if (!draggedTask || draggedTask.id === target.id) return;
    const current = sortTasks(todayTasks.filter((task) => task.status === "pending"));
    const from = current.findIndex((task) => task.id === draggedTask.id);
    const to = current.findIndex((task) => task.id === target.id);
    if (from < 0 || to < 0) return;
    const reordered = [...current];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    reordered.forEach((task, index) => onUpdateTask(task, { sortOrder: index + 1 }));
    setDraggedTask(null);
    notify("success", "顺序已更新。");
  };

  const taskListProps = {
    suggestedId: grouped.suggested?.id,
    settings,
    evidences,
    onComplete,
    onUndo,
    onUpdateTask,
    onEvidence,
    onPostpone: (task: StudyTask) => onPostpone(task, toDateString(addDays(new Date(), 1))),
    onMove: (task: StudyTask, date: string) => onPostpone(task, date),
    onCopy: (task: StudyTask, date: string) => onPostpone(task, date, undefined, true),
    onCancel,
    onRestore,
    onDeleteTask,
    onDragStart: setDraggedTask,
    onDropTask: reorderTask,
  };

  return (
    <div className="space-y-4 pb-20">
      <header className="morning-illustration -mx-[var(--page-x)] -mt-4 px-[var(--page-x)] pb-4 pt-4">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-black leading-tight tracking-normal">今日清单 <span className="text-lg text-amber-400">✦</span></h1>
            <button className="mt-3 text-left" onClick={onGoCalendar}>
              <div className="text-[20px] font-black leading-tight">{todayDate.getFullYear()}年{todayDate.getMonth() + 1}月{todayDate.getDate()}日 <span className="text-[18px]">{getWeekdayName(todayDate)}</span></div>
            </button>
            <p className="mt-3 text-[14px] leading-6 text-[var(--color-text-secondary)]">{getGreeting()}，专注当下，成就更好的自己 <span className="text-amber-400">✦</span></p>
          </div>
          <button className="mt-8 flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[image:var(--brand-gradient)] text-white shadow-[var(--brand-shadow)]" onClick={() => setQuickOpen(true)} aria-label="添加任务">
            <Plus size={26} />
          </button>
        </div>
      </header>

      <section className="soft-card -mt-4 grid grid-cols-3 rounded-[18px] px-3 py-3">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]"><ClipboardList size={19} /></span>
          <span><strong className="block text-[21px] leading-6">{summary.total}</strong><span className="whitespace-nowrap text-[11px] text-[var(--color-text-secondary)]">今日任务</span></span>
        </div>
        <div className="flex items-center justify-center gap-2 border-x border-[var(--color-border)] px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]"><CheckCircle2 size={20} /></span>
          <span><strong className="block text-[21px] leading-6">{summary.completed}</strong><span className="whitespace-nowrap text-[11px] text-[var(--color-text-secondary)]">已完成</span></span>
        </div>
        <div className="flex items-center justify-center gap-2 pl-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning-soft)] text-[var(--color-warning)]"><Clock3 size={20} /></span>
          <span><strong className="block text-[21px] leading-6">{Math.max(0, summary.total - summary.completed)}</strong><span className="whitespace-nowrap text-[11px] text-[var(--color-text-secondary)]">未完成</span></span>
        </div>
      </section>

      <section className="soft-card rounded-[16px] px-4 py-3">
        {summary.total === 0 ? (
          <p className="text-[15px] leading-[22px] text-[var(--color-text-secondary)]">今天还没有安排任务</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px] font-semibold leading-[18px] text-[var(--color-text-secondary)]">今日进度</div>
                <div className="mt-0.5 text-[17px] font-bold">{summary.completed} / {summary.total}</div>
              </div>
              <div className="text-[24px] font-black leading-none text-[var(--color-brand)]">{percent}%</div>
            </div>
            <div className="mt-3"><ProgressBar percent={percent} label="" /></div>
          </>
        )}
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-black">今天的任务</h2>
        <button className="text-sm font-semibold text-[var(--color-text-secondary)]" onClick={onGoCalendar}>按时间⌄</button>
      </div>

      {summary.total === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <CalendarDays className="text-[var(--color-text-muted)]" size={30} strokeWidth={1.6} />
          <p className="mt-3 text-[15px] font-medium">今天还没有任务</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.overdue.length > 0 && (
            <CollapsibleSection id="today-overdue" title="已逾期" count={grouped.overdue.length} defaultExpanded>
              <SectionTasks list={grouped.overdue} limit={3} {...taskListProps} />
            </CollapsibleSection>
          )}
          {grouped.pending.length > 0 && (
            <CollapsibleSection id="today-pending" title="今天" count={grouped.pending.length} defaultExpanded>
              <SectionTasks list={grouped.pending} limit={5} {...taskListProps} />
            </CollapsibleSection>
          )}
          {grouped.completed.length > 0 && (
            <CollapsibleSection id="today-completed" title="已完成" count={grouped.completed.length} defaultExpanded={false}>
              <SectionTasks list={grouped.completed} limit={5} {...taskListProps} />
            </CollapsibleSection>
          )}
          {grouped.other.length > 0 && (
            <CollapsibleSection id="today-other" title="其他任务" count={grouped.other.length} defaultExpanded={false}>
              <SectionTasks list={grouped.other} limit={5} {...taskListProps} />
            </CollapsibleSection>
          )}
        </div>
      )}

      <ReflectionPanel reflections={reflections} onSave={onSaveReflection} notify={notify} />

      <TaskEditorSheet
        open={quickOpen}
        mode="create"
        initialDate={today}
        onClose={() => setQuickOpen(false)}
        onCreate={createFromEditor}
        notify={notify}
      />
    </div>
  );
}
