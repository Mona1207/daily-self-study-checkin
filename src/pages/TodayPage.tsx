import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, Plus, SlidersHorizontal } from "lucide-react";
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
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
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
        <button className="min-h-11 w-full text-sm font-medium text-[var(--color-brand)]" onClick={() => setShowAll((value) => !value)}>
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
  const [quickTitle, setQuickTitle] = useState("");
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

  const submitInlineQuick = (event: FormEvent) => {
    event.preventDefault();
    const title = quickTitle.trim();
    if (!title) return notify("error", "先写下任务名称。");
    onAddTask({
      title,
      date: today,
      allDay: true,
      subject: "工作",
      priority: "medium",
      evidenceRequirement: "none",
      sortOrder: Date.now(),
    });
    setQuickTitle("");
    notify("success", "任务已添加。");
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
    <div className="space-y-4 pb-24">
      <header className="flex items-start justify-between gap-4">
        <div>
          <button className="text-left" onClick={onGoCalendar}>
            <div className="text-[28px] font-bold leading-tight">{todayDate.getMonth() + 1}月{todayDate.getDate()}日 <span className="text-base font-medium text-[var(--color-text-secondary)]">{getWeekdayName(todayDate)}</span></div>
          </button>
          <p className="mt-1 text-[13px] leading-[18px] text-[var(--color-text-secondary)]">{getGreeting()} · 今天 {summary.total} 项 · 已完成 {summary.completed} 项</p>
        </div>
        <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shadow-[var(--shadow-float)]" onClick={() => setQuickOpen(true)} aria-label="添加任务">
          <Plus size={21} />
        </button>
      </header>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        {summary.total === 0 ? (
          <p className="text-[15px] leading-[22px] text-[var(--color-text-secondary)]">今天还没有安排任务</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px] font-medium leading-[18px] text-[var(--color-text-secondary)]">今日进度</div>
                <div className="mt-0.5 text-[17px] font-semibold">{summary.completed} / {summary.total}</div>
              </div>
              <div className="text-[28px] font-semibold leading-none text-[var(--color-text)]">{percent}%</div>
            </div>
            <div className="mt-3"><ProgressBar percent={percent} label="" /></div>
          </>
        )}
      </section>

      <form className="flex h-12 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3" onSubmit={submitInlineQuick}>
        <Plus size={18} className="shrink-0 text-[var(--color-brand)]" />
        <input
          className="min-w-0 flex-1 bg-transparent text-[15px] leading-[22px] outline-none placeholder:text-[var(--color-text-muted)]"
          value={quickTitle}
          onChange={(event) => setQuickTitle(event.target.value)}
          placeholder="添加今天要做的事..."
          aria-label="快速添加今天任务"
        />
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]" onClick={() => setQuickOpen(true)} aria-label="更多设置">
          <SlidersHorizontal size={18} />
        </button>
      </form>

      {summary.total === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <CalendarDays className="text-[var(--color-text-muted)]" size={30} strokeWidth={1.6} />
          <p className="mt-3 text-[15px] font-medium">今天还没有任务</p>
          <button className="mt-2 min-h-10 px-2 text-sm font-medium text-[var(--color-brand)]" onClick={() => setQuickOpen(true)}>添加第一项任务</button>
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
