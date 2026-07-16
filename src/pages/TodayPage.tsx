import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, Plus, Save } from "lucide-react";
import { AppSettings, DailyReflection, EvidenceRequirement, Priority, StudyTask, TaskEvidence, SUBJECTS, Subject } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { CollapsibleSection } from "../components/common/CollapsibleSection";
import { Modal } from "../components/common/Modal";
import { ProgressBar } from "../components/common/ProgressBar";
import { ReflectionPanel } from "../components/reflection/ReflectionPanel";
import { TaskCard } from "../components/tasks/TaskCard";
import { addDays, getTodayString, getWeekdayName, toDateString } from "../utils/date";
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
}) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? list : list.slice(0, limit);
  return (
    <div className="space-y-2">
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
        />
      ))}
      {list.length > limit && (
        <button className="min-h-11 text-sm font-semibold text-[#4F6EF7]" onClick={() => setShowAll((value) => !value)}>
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
  const [draft, setDraft] = useState({
    title: "",
    date: today,
    startTime: "",
    dueTime: "",
    subject: "工作" as Subject,
    description: "",
    estimatedMinutes: "",
    priority: "medium" as Priority,
    evidenceRequirement: "none" as EvidenceRequirement,
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
      subject: "工作",
      description: "",
      estimatedMinutes: "",
      priority: "medium",
      evidenceRequirement: "none",
    });
    setAdvancedOpen(false);
  };

  const submitQuickTask = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return notify("error", "先写下任务名称。");
    onAddTask({
      title: draft.title.trim(),
      date: draft.date,
      startTime: draft.startTime || undefined,
      dueTime: draft.dueTime || undefined,
      subject: draft.subject,
      description: draft.description.trim() || undefined,
      estimatedMinutes: draft.estimatedMinutes ? Number(draft.estimatedMinutes) : undefined,
      priority: draft.priority,
      evidenceRequirement: draft.evidenceRequirement,
    });
    notify("success", "任务已添加。");
    setQuickOpen(false);
    resetDraft();
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
  };

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[22px] font-semibold">{todayDate.getMonth() + 1}月{todayDate.getDate()}日 <span className="text-base font-medium text-[#6B7280]">{getWeekdayName(todayDate)}</span></div>
          <p className="mt-2 text-sm text-[#6B7280]">今天{summary.total}项，已完成{summary.completed}项</p>
        </div>
        <div className="flex gap-2">
          <button className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white text-[#4F6EF7] shadow-sm dark:bg-slate-900" onClick={onGoCalendar} aria-label="打开日历">
            <CalendarDays size={20} />
          </button>
          <button className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#4F6EF7] text-white shadow-sm" onClick={() => setQuickOpen(true)} aria-label="添加任务">
            <Plus size={22} />
          </button>
        </div>
      </header>

      <CollapsibleSection id="today-progress" title="今日进度" subtitle={`${summary.completed}/${summary.total} · ${percent}%`} defaultExpanded>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[26px] font-semibold">{summary.completed} / {summary.total}</div>
            <div className="mt-1 text-sm text-[#6B7280]">还有 {Math.max(0, summary.pending)} 项</div>
          </div>
          <div className="text-lg font-semibold text-[#4F6EF7]">{percent}%</div>
        </div>
        <div className="mt-3"><ProgressBar percent={percent} label="" /></div>
      </CollapsibleSection>

      <Card className="p-4">
        <button className="flex w-full items-center justify-between text-left" onClick={() => setQuickOpen(true)}>
          <span>
            <span className="block text-[15px] font-semibold">快速添加</span>
            <span className="mt-1 block text-sm text-[#6B7280]">写下一件今天要完成的事</span>
          </span>
          <Plus className="text-[#4F6EF7]" size={22} />
        </button>
      </Card>

      {summary.total === 0 ? (
        <Card className="p-4 text-center">
          <p className="text-[15px] font-semibold">今天还没有任务</p>
          <Button className="mt-3" icon={<Plus size={18} />} onClick={() => setQuickOpen(true)}>添加一项</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.overdue.length > 0 && (
            <CollapsibleSection id="today-overdue" title="已逾期" count={grouped.overdue.length} defaultExpanded>
              <SectionTasks list={grouped.overdue} limit={3} {...taskListProps} />
            </CollapsibleSection>
          )}
          {grouped.pending.length > 0 && (
            <CollapsibleSection id="today-pending" title="待完成" count={grouped.pending.length} defaultExpanded>
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

      <button className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#4F6EF7] text-white shadow-lg sm:hidden" onClick={() => setQuickOpen(true)} aria-label="快速添加">
        <Plus size={26} />
      </button>

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
              <label className="text-sm font-semibold">起始时间<input className={`${inputClass} mt-1`} type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label>
              <label className="text-sm font-semibold">截止时间<input className={`${inputClass} mt-1`} type="time" value={draft.dueTime} onChange={(event) => setDraft({ ...draft, dueTime: event.target.value })} /></label>
              <label className="text-sm font-semibold">预计时长<input className={`${inputClass} mt-1`} type="number" min="0" value={draft.estimatedMinutes} onChange={(event) => setDraft({ ...draft, estimatedMinutes: event.target.value })} /></label>
              <label className="text-sm font-semibold">优先级<select className={`${inputClass} mt-1`} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>{priorityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="text-sm font-semibold">完成记录要求<select className={`${inputClass} mt-1`} value={draft.evidenceRequirement} onChange={(event) => setDraft({ ...draft, evidenceRequirement: event.target.value as EvidenceRequirement })}><option value="none">不填写</option><option value="text">文字</option><option value="image">图片</option><option value="text_and_image">文字和图片</option></select></label>
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
