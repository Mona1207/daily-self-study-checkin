import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Save } from "lucide-react";
import { AppSettings, DailyReflection, StudyTask, Subject, SUBJECTS } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { CollapsibleSection } from "../components/common/CollapsibleSection";
import { Modal } from "../components/common/Modal";
import { TaskCard } from "../components/tasks/TaskCard";
import { formatChineseDate, getMonthDays, getTodayString, isSameMonth, toDateString } from "../utils/date";
import { summarizeDay } from "../utils/statistics";
import { sortTasks } from "../utils/taskSort";

type NewCalendarTask = Omit<StudyTask, "id" | "createdAt" | "updatedAt" | "status" | "completed"> &
  Partial<Pick<StudyTask, "status" | "evidenceRequirement">>;

interface CalendarPageProps {
  tasks: StudyTask[];
  settings: AppSettings;
  reflections?: DailyReflection[];
  onAddTask?: (task: NewCalendarTask) => StudyTask;
  onUpdateTask?: (task: StudyTask, patch: Partial<StudyTask>) => void;
  onDeleteTask?: (task: StudyTask) => void;
  onComplete?: (task: StudyTask) => void;
  onUndo?: (task: StudyTask) => void;
}

const dotClass = {
  all: "bg-emerald-500",
  partial: "bg-orange-400",
  none: "bg-slate-400",
  empty: "",
};

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-[#E9EBEF] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4F6EF7] focus:ring-4 focus:ring-[#4F6EF7]/10 dark:border-slate-700 dark:bg-slate-950";

export function CalendarPage({ tasks, settings, reflections = [], onAddTask, onUpdateTask, onDeleteTask, onComplete, onUndo }: CalendarPageProps) {
  const today = getTodayString();
  const taskAreaRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [addOpen, setAddOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickSubject, setQuickSubject] = useState<Subject>("工作");
  const [quickMinutes, setQuickMinutes] = useState("");
  const days = useMemo(() => getMonthDays(monthCursor.getFullYear(), monthCursor.getMonth()), [monthCursor]);
  const selectedSummary = summarizeDay(tasks, selectedDate);
  const selectedTasks = sortTasks(tasks.filter((task) => task.date === selectedDate));
  const grouped = useMemo(() => ({
    overdue: selectedTasks.filter((task) => task.status === "overdue"),
    pending: selectedTasks.filter((task) => task.status === "pending"),
    completed: selectedTasks.filter((task) => task.status === "completed"),
    other: selectedTasks.filter((task) => task.status === "postponed" || task.status === "cancelled"),
  }), [selectedTasks]);

  const changeMonth = (offset: number) => {
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1));
  };

  const selectDate = (dateString: string) => {
    setSelectedDate(dateString);
    requestAnimationFrame(() => taskAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const addTask = () => {
    const title = quickTitle.trim();
    if (!title || !onAddTask) return;
    onAddTask({
      date: selectedDate,
      title,
      subject: quickSubject,
      priority: "medium",
      estimatedMinutes: Number(quickMinutes) || undefined,
      evidenceRequirement: "none",
      postponeHistory: [],
    });
    setQuickTitle("");
    setQuickMinutes("");
    setAddOpen(false);
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <p className="text-sm font-semibold text-[var(--color-brand)]">月历视图</p>
        <h1 className="mt-1 text-[28px] font-bold">任务日历</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card
          onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const diff = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(diff) > 80) changeMonth(diff > 0 ? -1 : 1);
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--color-border)]" onClick={() => changeMonth(-1)} aria-label="上个月">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold">
                {monthCursor.getFullYear()}年{monthCursor.getMonth() + 1}月
              </h2>
              {(toDateString(monthCursor).slice(0, 7) !== today.slice(0, 7) || selectedDate !== today) && (
                <button className="mt-1 text-sm text-[var(--color-brand)]" onClick={() => { setMonthCursor(new Date()); selectDate(today); }}>返回今天</button>
              )}
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--color-border)]" onClick={() => changeMonth(1)} aria-label="下个月">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[var(--color-text-secondary)]">
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateString = toDateString(day);
              const summary = summarizeDay(tasks, dateString);
              const reflected = reflections.some((reflection) => reflection.date === dateString);
              const active = selectedDate === dateString;
              const current = today === dateString;
              const muted = !isSameMonth(day, monthCursor.getFullYear(), monthCursor.getMonth());
              return (
                <button
                  key={dateString}
                  onClick={() => selectDate(dateString)}
                  className={`flex aspect-square min-h-10 flex-col items-center justify-center rounded-[12px] text-sm font-bold transition ${
                    active
                      ? "bg-[var(--color-brand)] text-white"
                      : current
                        ? "border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                        : "bg-[var(--color-surface-muted)] hover:bg-[var(--color-brand-soft)]"
                  } ${muted && !active ? "opacity-40" : ""}`}
                  aria-label={`${dateString}，${summary.total}项任务，完成${summary.completed}项`}
                >
                  <span>{day.getDate()}</span>
                  {summary.status !== "empty" && (
                    <span
                      className={`mt-1 h-2 w-2 rounded-full ${dotClass[summary.status]} ${active ? "ring-2 ring-white" : ""}`}
                    />
                  )}
                  {reflected && <span className="mt-0.5 h-1 w-1 rounded-full bg-[var(--color-brand)]" aria-label="有记录" />}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-500" />全部完成</span>
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-orange-400" />部分完成</span>
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-slate-400" />没有完成</span>
          </div>
        </Card>

        <div className="space-y-3" ref={taskAreaRef}>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-brand)]">{formatChineseDate(new Date(selectedDate))}</p>
                <h2 className="mt-1 text-lg font-semibold">当天任务</h2>
              </div>
              {onAddTask && <Button variant="secondary" icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>添加</Button>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[12px] bg-[var(--color-surface-muted)] p-3">
                <div className="text-2xl font-semibold">{selectedSummary.total}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">总数</div>
              </div>
              <div className="rounded-[12px] bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                <div className="text-2xl font-semibold">{selectedSummary.completed}</div>
                <div className="text-xs">完成</div>
              </div>
              <div className="rounded-[12px] bg-orange-50 p-3 text-orange-600 dark:bg-orange-500/15 dark:text-orange-200">
                <div className="text-2xl font-semibold">{selectedSummary.pending}</div>
                <div className="text-xs">未完成</div>
              </div>
            </div>
          </Card>
          <div className="space-y-3">
            {selectedTasks.length === 0 ? (
              <Card className="text-center text-[var(--color-text-secondary)]">
                <p className="font-medium text-[var(--color-text)]">这一天没有任务</p>
                {onAddTask && <Button className="mt-4" icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>添加任务</Button>}
              </Card>
            ) : (
              <>
                {grouped.overdue.length > 0 && (
                  <CollapsibleSection id="calendar-overdue" title="已逾期" count={grouped.overdue.length} defaultExpanded>
                    <div className="space-y-2">{grouped.overdue.map((task) => <TaskCard key={task.id} task={task} showEstimatedTime={settings.showEstimatedTime} compact onUpdate={onUpdateTask} onComplete={onComplete} onUndo={onUndo} onDelete={onDeleteTask} />)}</div>
                  </CollapsibleSection>
                )}
                {grouped.pending.length > 0 && (
                  <CollapsibleSection id="calendar-pending" title="待完成" count={grouped.pending.length} defaultExpanded>
                    <div className="space-y-2">{grouped.pending.map((task) => <TaskCard key={task.id} task={task} showEstimatedTime={settings.showEstimatedTime} compact onUpdate={onUpdateTask} onComplete={onComplete} onUndo={onUndo} onDelete={onDeleteTask} />)}</div>
                  </CollapsibleSection>
                )}
                {grouped.completed.length > 0 && (
                  <CollapsibleSection id="calendar-completed" title="已完成" count={grouped.completed.length} defaultExpanded={false}>
                    <div className="space-y-2">{grouped.completed.map((task) => <TaskCard key={task.id} task={task} showEstimatedTime={settings.showEstimatedTime} compact onUpdate={onUpdateTask} onComplete={onComplete} onUndo={onUndo} onDelete={onDeleteTask} />)}</div>
                  </CollapsibleSection>
                )}
                {grouped.other.length > 0 && (
                  <CollapsibleSection id="calendar-other" title="已延期和已取消" count={grouped.other.length} defaultExpanded={false}>
                    <div className="space-y-2">{grouped.other.map((task) => <TaskCard key={task.id} task={task} showEstimatedTime={settings.showEstimatedTime} compact onUpdate={onUpdateTask} onComplete={onComplete} onUndo={onUndo} onDelete={onDeleteTask} />)}</div>
                  </CollapsibleSection>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Modal title="添加任务" open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <label className="block text-sm font-semibold">
            任务名称
            <input className={`${inputClass} mt-1`} autoFocus value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="这一天要做什么" />
          </label>
          <label className="block text-sm font-semibold">
            日期
            <input className={`${inputClass} mt-1`} type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              分类
              <select className={`${inputClass} mt-1`} value={quickSubject} onChange={(event) => setQuickSubject(event.target.value as Subject)}>
                {SUBJECTS.map((subject) => <option key={subject}>{subject}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              预计分钟
              <input className={`${inputClass} mt-1`} type="number" min="0" value={quickMinutes} onChange={(event) => setQuickMinutes(event.target.value)} />
            </label>
          </div>
          <Button className="w-full" icon={<Save size={18} />} onClick={addTask} disabled={!quickTitle.trim()}>保存任务</Button>
        </div>
      </Modal>
    </div>
  );
}
