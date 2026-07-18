import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Frown, Laugh, Meh, Plus, Smile, SmilePlus } from "lucide-react";
import { AppSettings, DailyMood, DailyReflection, StudyTask } from "../types/task";
import { Card } from "../components/common/Card";
import { CollapsibleSection } from "../components/common/CollapsibleSection";
import { ReflectionPanel } from "../components/reflection/ReflectionPanel";
import { TaskCard } from "../components/tasks/TaskCard";
import { TaskEditorSheet, TaskEditorValue } from "../components/tasks/TaskEditorSheet";
import { formatChineseDate, getMonthDays, getTodayString, isSameMonth, toDateString } from "../utils/date";
import { summarizeDay } from "../utils/statistics";
import { sortTasks } from "../utils/taskSort";

type NewCalendarTask = Omit<StudyTask, "id" | "createdAt" | "updatedAt" | "status" | "completed"> &
  Partial<Pick<StudyTask, "status" | "evidenceRequirement">>;

interface CalendarPageProps {
  tasks: StudyTask[];
  settings: AppSettings;
  reflections?: DailyReflection[];
  initialDate?: string;
  onAddTask?: (task: NewCalendarTask) => StudyTask;
  onUpdateTask?: (task: StudyTask, patch: Partial<StudyTask>) => void;
  onDeleteTask?: (task: StudyTask) => void;
  onComplete?: (task: StudyTask) => void;
  onUndo?: (task: StudyTask) => void;
  onSaveReflection?: (reflection: DailyReflection) => void;
  notify?: (type: "success" | "error" | "info", message: string) => void;
}

const dotClass = {
  all: "bg-emerald-500",
  partial: "bg-orange-400",
  none: "bg-slate-400",
  empty: "",
};

const moodIcons: Record<DailyMood, typeof Smile> = {
  great: Laugh,
  good: SmilePlus,
  normal: Smile,
  difficult: Meh,
  adjust: Frown,
};

const moodClass: Record<DailyMood, string> = {
  great: "text-emerald-500",
  good: "text-sky-500",
  normal: "text-amber-500",
  difficult: "text-orange-500",
  adjust: "text-rose-500",
};

export function CalendarPage({ tasks, settings, reflections = [], initialDate, onAddTask, onUpdateTask, onDeleteTask, onComplete, onUndo, onSaveReflection, notify }: CalendarPageProps) {
  const today = getTodayString();
  const taskAreaRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today);
  const [addOpen, setAddOpen] = useState(false);
  const days = useMemo(() => getMonthDays(monthCursor.getFullYear(), monthCursor.getMonth()), [monthCursor]);
  const selectedSummary = summarizeDay(tasks, selectedDate);
  const selectedTasks = sortTasks(tasks.filter((task) => task.date === selectedDate));
  const grouped = useMemo(() => ({
    overdue: selectedTasks.filter((task) => task.status === "overdue"),
    pending: selectedTasks.filter((task) => task.status === "pending"),
    completed: selectedTasks.filter((task) => task.status === "completed"),
    other: selectedTasks.filter((task) => task.status === "postponed" || task.status === "cancelled"),
  }), [selectedTasks]);

  useEffect(() => {
    if (!initialDate) return;
    setSelectedDate(initialDate);
    setMonthCursor(new Date(initialDate));
  }, [initialDate]);

  const changeMonth = (offset: number) => {
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1));
  };

  const selectDate = (dateString: string) => {
    setSelectedDate(dateString);
    requestAnimationFrame(() => taskAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const addTask = (value: TaskEditorValue) => {
    onAddTask?.({ ...value, date: value.date || selectedDate });
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="morning-illustration -mx-[var(--page-x)] -mt-4 px-[var(--page-x)] pb-5 pt-4">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
          <h1 className="text-[28px] font-black leading-tight">日历 <span className="text-base text-amber-400">✦</span></h1>
            <p className="mt-2 text-[14px] leading-6 text-[var(--color-text-secondary)]">回顾每一天，见证成长的足迹 <span className="text-amber-400">✦</span></p>
          </div>
        </div>
      </div>

      <div className="-mt-5 grid gap-4">
        <Card
          className="rounded-[16px] p-2"
          onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const diff = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(diff) > 80) changeMonth(diff > 0 ? -1 : 1);
          }}
        >
          <div className="mb-1 flex h-8 items-center justify-between gap-3">
            <button className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]" onClick={() => changeMonth(-1)} aria-label="上个月">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="text-[18px] font-black">
                {monthCursor.getFullYear()}年{monthCursor.getMonth() + 1}月
              </h2>
              {(toDateString(monthCursor).slice(0, 7) !== today.slice(0, 7) || selectedDate !== today) && (
                <button className="mt-1 text-sm text-[var(--color-brand)]" onClick={() => { setMonthCursor(new Date()); selectDate(today); }}>返回今天</button>
              )}
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]" onClick={() => changeMonth(1)} aria-label="下个月">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[12px] font-medium text-[var(--color-text-secondary)]">
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <div key={day} className="py-0.5">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dateString = toDateString(day);
              const summary = summarizeDay(tasks, dateString);
              const reflection = reflections.find((item) => item.date === dateString);
              const MoodIcon = reflection ? moodIcons[reflection.mood] : null;
              const active = selectedDate === dateString;
              const current = today === dateString;
              const muted = !isSameMonth(day, monthCursor.getFullYear(), monthCursor.getMonth());
              return (
                <button
                  key={dateString}
                  onClick={() => selectDate(dateString)}
                  className={`mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-[10px] text-[13px] font-semibold transition ${
                    active
                      ? "bg-[image:var(--brand-gradient)] text-white shadow-[var(--brand-shadow)]"
                      : current
                        ? "border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                        : "bg-transparent hover:bg-[var(--color-surface-muted)]"
                  } ${muted && !active ? "opacity-40" : ""}`}
                  aria-label={`${dateString}，${summary.total}项任务，完成${summary.completed}项`}
                >
                  <span>{day.getDate()}</span>
                  {summary.status !== "empty" && (
                    <span
                      className={`mt-0.5 h-1.5 w-1.5 rounded-full ${dotClass[summary.status]} ${active ? "ring-2 ring-white" : ""}`}
                    />
                  )}
                  {reflection && MoodIcon && <MoodIcon className={`mt-0.5 ${active ? "text-white" : moodClass[reflection.mood]}`} size={13} strokeWidth={2.3} aria-label="有小记" />}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-500" />全部完成</span>
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-orange-400" />部分完成</span>
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-slate-400" />没有完成</span>
            <span className="inline-flex items-center gap-2"><Smile size={13} />有小记</span>
          </div>
        </Card>

        <div className="space-y-4" ref={taskAreaRef}>
          <div className="soft-card rounded-[18px] p-3">
            <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="min-w-0 text-[15px] leading-[22px]">
              <span className="font-black">{formatChineseDate(new Date(selectedDate))}</span>
              <span className="ml-2 rounded-[9px] bg-[var(--color-brand-soft)] px-2 py-1 text-[12px] font-semibold text-[var(--color-brand)]">{selectedDate === today ? "今天" : "已选择"}</span>
            </div>
            {onAddTask && <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-white" onClick={() => setAddOpen(true)} aria-label="添加任务"><Plus size={18} /></button>}
            </div>
            <div className="mt-2 grid grid-cols-3 rounded-[14px] bg-white/70 px-3 py-2.5 text-center dark:bg-white/10">
              <div><div className="text-[20px] font-black">{selectedSummary.total}</div><div className="text-xs text-[var(--color-text-secondary)]">总任务</div></div>
              <div className="border-x border-[var(--color-border)]"><div className="text-[20px] font-black text-[var(--color-success)]">{selectedSummary.completed}</div><div className="text-xs text-[var(--color-text-secondary)]">已完成</div></div>
              <div><div className="text-[20px] font-black text-[var(--color-warning)]">{Math.max(0, selectedSummary.total - selectedSummary.completed)}</div><div className="text-xs text-[var(--color-text-secondary)]">未完成</div></div>
            </div>
          </div>
          {onSaveReflection && notify && <ReflectionPanel date={selectedDate} reflections={reflections} onSave={onSaveReflection} notify={notify} />}
          <div className="space-y-3">
            {selectedTasks.length === 0 ? (
              <div className="py-10 text-center text-[var(--color-text-secondary)]">
                <p className="font-medium text-[var(--color-text)]">这一天没有任务</p>
              </div>
            ) : (
              <>
                {grouped.overdue.length > 0 && (
                  <CollapsibleSection id="calendar-overdue" title="已逾期" count={grouped.overdue.length} defaultExpanded>
                    <div className="space-y-3 overflow-visible">{grouped.overdue.map((task) => <TaskCard key={task.id} task={task} showEstimatedTime={settings.showEstimatedTime} compact onUpdate={onUpdateTask} onComplete={onComplete} onUndo={onUndo} onDelete={onDeleteTask} />)}</div>
                  </CollapsibleSection>
                )}
                {grouped.pending.length > 0 && (
                  <CollapsibleSection id="calendar-pending" title="待完成" count={grouped.pending.length} defaultExpanded>
                    <div className="space-y-3 overflow-visible">{grouped.pending.map((task) => <TaskCard key={task.id} task={task} showEstimatedTime={settings.showEstimatedTime} compact onUpdate={onUpdateTask} onComplete={onComplete} onUndo={onUndo} onDelete={onDeleteTask} />)}</div>
                  </CollapsibleSection>
                )}
                {grouped.completed.length > 0 && (
                  <CollapsibleSection id="calendar-completed" title="已完成" count={grouped.completed.length} defaultExpanded={false}>
                    <div className="space-y-3 overflow-visible">{grouped.completed.map((task) => <TaskCard key={task.id} task={task} showEstimatedTime={settings.showEstimatedTime} compact onUpdate={onUpdateTask} onComplete={onComplete} onUndo={onUndo} onDelete={onDeleteTask} />)}</div>
                  </CollapsibleSection>
                )}
                {grouped.other.length > 0 && (
                  <CollapsibleSection id="calendar-other" title="已延期和已取消" count={grouped.other.length} defaultExpanded={false}>
                    <div className="space-y-3 overflow-visible">{grouped.other.map((task) => <TaskCard key={task.id} task={task} showEstimatedTime={settings.showEstimatedTime} compact onUpdate={onUpdateTask} onComplete={onComplete} onUndo={onUndo} onDelete={onDeleteTask} />)}</div>
                  </CollapsibleSection>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <TaskEditorSheet
        open={addOpen}
        mode="create"
        initialDate={selectedDate}
        onClose={() => setAddOpen(false)}
        onCreate={addTask}
      />
    </div>
  );
}
