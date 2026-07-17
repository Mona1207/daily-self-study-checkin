import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, Plus, Save, SlidersHorizontal } from "lucide-react";
import { AppSettings, DailyReflection, EvidenceRequirement, Priority, StudyTask, TaskEvidence, SUBJECTS, Subject } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { CollapsibleSection } from "../components/common/CollapsibleSection";
import { Modal } from "../components/common/Modal";
import { ProgressBar } from "../components/common/ProgressBar";
import { ReflectionPanel } from "../components/reflection/ReflectionPanel";
import { TaskCard } from "../components/tasks/TaskCard";
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

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-[#E9EBEF] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4F6EF7] focus:ring-4 focus:ring-[#4F6EF7]/10 dark:border-slate-700 dark:bg-slate-950";

const priorityOptions: Array<{ value: Priority; label: string }> = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [draggedTask, setDraggedTask] = useState<StudyTask | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    date: today,
    startTime: "",
    dueTime: "",
    allDay: true,
    subject: "工作" as Subject,
    description: "",
    estimatedMinutes: "",
    priority: "medium" as Priority,
    evidenceRequirement: "none" as EvidenceRequirement,
    subtasks: "",
    reminderEnabled: false,
    reminderOffset: "15",
  });

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

  const resetDraft = () => {
    setDraft({
      title: "",
      date: today,
      startTime: "",
      dueTime: "",
      allDay: true,
      subject: "工作",
      description: "",
      estimatedMinutes: "",
      priority: "medium",
      evidenceRequirement: "none",
      subtasks: "",
      reminderEnabled: false,
      reminderOffset: "15",
    });
    setAdvancedOpen(false);
  };

  const submitQuickTask = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return notify("error", "先写下任务名称。");
    onAddTask({
      title: draft.title.trim(),
      date: draft.date,
      startTime: draft.allDay ? undefined : draft.startTime || undefined,
      dueTime: draft.allDay ? undefined : draft.dueTime || undefined,
      allDay: draft.allDay,
      subject: draft.subject,
      description: draft.description.trim() || undefined,
      estimatedMinutes: draft.estimatedMinutes ? Number(draft.estimatedMinutes) : undefined,
      priority: draft.priority,
      evidenceRequirement: draft.evidenceRequirement,
      subtasks: draft.subtasks
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((title) => ({ id: crypto.randomUUID(), title, completed: false })),
      reminder: draft.reminderEnabled ? { enabled: true, type: draft.dueTime ? "due" : "start", offsetMinutes: Number(draft.reminderOffset) || 15 } : undefined,
      sortOrder: Date.now(),
    });
    notify("success", "任务已添加。");
    setQuickOpen(false);
    resetDraft();
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

      <Modal title="添加任务" open={quickOpen} onClose={() => setQuickOpen(false)}>
        <form className="space-y-4 pb-1" onSubmit={submitQuickTask}>
          <label className="text-sm font-semibold">
            任务名称
            <input autoFocus className={`${inputClass} mt-1`} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="写下要完成的事" />
          </label>
          <label className="text-sm font-semibold">
            日期
            <input className={`${inputClass} mt-1`} type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
          </label>
          <button type="button" className="min-h-11 text-sm font-semibold text-[#4F6EF7]" onClick={() => setAdvancedOpen((value) => !value)}>
            {advancedOpen ? "收起时间、分类或更多设置" : "添加时间、分类或更多设置"}
          </button>
          {advancedOpen && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">分类<select className={`${inputClass} mt-1`} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value as Subject })}>{SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
              <label className="flex items-center justify-between rounded-[10px] border border-[#E9EBEF] px-3 py-2 text-sm font-semibold dark:border-slate-700">全天任务<input type="checkbox" checked={draft.allDay} onChange={(event) => setDraft({ ...draft, allDay: event.target.checked })} /></label>
              <label className="text-sm font-semibold">起始时间<input className={`${inputClass} mt-1`} type="time" value={draft.startTime} disabled={draft.allDay} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label>
              <label className="text-sm font-semibold">截止时间<input className={`${inputClass} mt-1`} type="time" value={draft.dueTime} disabled={draft.allDay} onChange={(event) => setDraft({ ...draft, dueTime: event.target.value })} /></label>
              <label className="text-sm font-semibold">预计时长<input className={`${inputClass} mt-1`} type="number" min="0" value={draft.estimatedMinutes} onChange={(event) => setDraft({ ...draft, estimatedMinutes: event.target.value })} /></label>
              <label className="text-sm font-semibold">优先级<select className={`${inputClass} mt-1`} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}><option value="none">无</option>{priorityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="text-sm font-semibold">完成记录要求<select className={`${inputClass} mt-1`} value={draft.evidenceRequirement} onChange={(event) => setDraft({ ...draft, evidenceRequirement: event.target.value as EvidenceRequirement })}><option value="none">不填写</option><option value="text">文字</option><option value="image">图片</option><option value="text_and_image">文字和图片</option></select></label>
              <label className="flex items-center justify-between rounded-[10px] border border-[#E9EBEF] px-3 py-2 text-sm font-semibold dark:border-slate-700">提醒<input type="checkbox" checked={draft.reminderEnabled} onChange={(event) => setDraft({ ...draft, reminderEnabled: event.target.checked })} /></label>
              <label className="text-sm font-semibold">提前提醒<select className={`${inputClass} mt-1`} value={draft.reminderOffset} disabled={!draft.reminderEnabled} onChange={(event) => setDraft({ ...draft, reminderOffset: event.target.value })}><option value="5">5分钟</option><option value="15">15分钟</option><option value="30">30分钟</option><option value="60">1小时</option><option value="1440">1天</option></select></label>
              <label className="text-sm font-semibold sm:col-span-2">子任务<textarea className={`${inputClass} mt-1 min-h-20`} value={draft.subtasks} onChange={(event) => setDraft({ ...draft, subtasks: event.target.value })} placeholder="每行一个子任务" /></label>
              <label className="text-sm font-semibold sm:col-span-2">任务说明<textarea className={`${inputClass} mt-1 min-h-24`} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            </div>
          )}
          <div className="sticky bottom-0 bg-white pt-2 dark:bg-slate-900">
            <Button className="w-full" icon={<Save size={18} />}>保存任务</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
