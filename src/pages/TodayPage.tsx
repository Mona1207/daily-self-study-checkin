import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { AppSettings, DailyReflection, EvidenceRequirement, Priority, StudySession, StudyTask, TaskEvidence, TaskTimerState, SUBJECTS, Subject } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Modal } from "../components/common/Modal";
import { ProgressBar } from "../components/common/ProgressBar";
import { ReflectionPanel } from "../components/reflection/ReflectionPanel";
import { TaskCard } from "../components/tasks/TaskCard";
import { addDays, formatChineseDate, getGreeting, getTodayString, getWeekdayName, toDateString } from "../utils/date";
import { getCompletionPercent, summarizeDay } from "../utils/statistics";
import { getNextTaskRecommendation } from "../utils/recommendations";
import { sortTasks } from "../utils/taskSort";

type NewTaskInput = Omit<StudyTask, "id" | "createdAt" | "updatedAt" | "status" | "completed" | "actualSeconds"> &
  Partial<Pick<StudyTask, "status" | "actualSeconds" | "evidenceRequirement">>;

interface TodayPageProps {
  tasks: StudyTask[];
  settings: AppSettings;
  timerState?: TaskTimerState;
  sessions: StudySession[];
  evidences: TaskEvidence[];
  reflections: DailyReflection[];
  onAddTask: (task: NewTaskInput) => void;
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
  onGoCalendar: () => void;
  notify: (type: "success" | "error" | "info", message: string) => void;
}

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-[#E9EBEF] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4F6EF7] focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950";

const priorityOptions: Array<{ value: Priority; label: string }> = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

export function TodayPage({
  tasks,
  settings,
  timerState,
  sessions,
  evidences,
  reflections,
  onAddTask,
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
  onGoCalendar,
  notify,
}: TodayPageProps) {
  const today = getTodayString();
  const todayDate = new Date();
  const [quickOpen, setQuickOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
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

  const todayTasks = tasks.filter((task) => task.date === today && task.status !== "postponed" && task.status !== "cancelled" && task.status !== "abandoned");
  const overdueTasks = tasks.filter((task) => task.date < today && (task.status === "overdue" || task.status === "pending" || task.status === "in_progress"));
  const allVisible = [...overdueTasks, ...todayTasks.filter((task) => !overdueTasks.some((item) => item.id === task.id))];
  const summary = summarizeDay(tasks, today);
  const percent = getCompletionPercent(summary);
  const recommendation = getNextTaskRecommendation(allVisible, today, timerState);

  const grouped = useMemo(() => {
    const running = sortTasks(allVisible.filter((task) => task.status === "in_progress"));
    const overdue = sortTasks(allVisible.filter((task) => task.status === "overdue" || task.date < today));
    const pending = sortTasks(allVisible.filter((task) => task.status === "pending" && task.date >= today));
    const completed = sortTasks(allVisible.filter((task) => task.status === "completed"));
    return { running, overdue, pending, completed };
  }, [allVisible, today]);

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

  const renderGroup = (title: string, list: StudyTask[], collapsed = false) => {
    if (!list.length) return null;
    const open = collapsed ? completedOpen : true;
    return (
      <section className="space-y-2">
        <button className="flex w-full items-center justify-between py-1 text-left" onClick={() => collapsed && setCompletedOpen((value) => !value)}>
          <h2 className="text-[15px] font-semibold text-[#1F2329] dark:text-slate-100">{title} {collapsed ? list.length : ""}</h2>
          {collapsed ? (open ? <ChevronUp size={18} /> : <ChevronDown size={18} />) : null}
        </button>
        {open && (
          <div className="space-y-2">
            {list.map((task) => (
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
                onPostpone={(item) => onPostpone(item, toDateString(addDays(new Date(), 1)))}
                onAbandon={onAbandon}
                onRestore={onRestore}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[22px] font-semibold">{todayDate.getMonth() + 1}月{todayDate.getDate()}日</div>
          <div className="mt-1 text-sm text-[#6B7280]">{getWeekdayName(todayDate)}</div>
          <p className="mt-3 text-sm text-[#6B7280]">
            {summary.total === 0 ? `${getGreeting()}，今天还没有安排` : summary.pending === 0 ? "今天的安排已经全部完成" : `${getGreeting()}，今天有${summary.total}件事要完成`}
          </p>
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

      <Card>
        <h2 className="text-base font-semibold">今日进度</h2>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <div className="text-[28px] font-semibold">{summary.completed} / {summary.total}</div>
            <div className="mt-1 text-sm text-[#6B7280]">已完成，还有 {Math.max(0, summary.pending)} 项</div>
          </div>
          <div className="text-lg font-semibold text-[#4F6EF7]">{percent}%</div>
        </div>
        <div className="mt-4">
          <ProgressBar percent={percent} label="" />
        </div>
      </Card>

      {recommendation.task ? (
        <Card>
          <p className="text-sm font-semibold text-[#4F6EF7]">接下来</p>
          <div className="mt-2 text-base font-semibold">{recommendation.task.title}</div>
          <div className="mt-1 text-sm text-[#6B7280]">
            {recommendation.task.subject} {recommendation.task.estimatedMinutes ? `· 预计${recommendation.task.estimatedMinutes}分钟` : ""}
          </div>
          <p className="mt-3 text-sm text-[#6B7280]">{recommendation.reason}</p>
          <Button className="mt-4" onClick={() => onStart(recommendation.task!)}>开始</Button>
        </Card>
      ) : (
        <Card>
          <div className="text-base font-semibold">今天还没有安排任务</div>
          <p className="mt-1 text-sm text-[#6B7280]">添加一件今天要完成的事吧</p>
          <Button className="mt-4" icon={<Plus size={18} />} onClick={() => setQuickOpen(true)}>添加任务</Button>
        </Card>
      )}

      <div className="space-y-5">
        {renderGroup("进行中", grouped.running)}
        {renderGroup("已逾期", grouped.overdue)}
        {renderGroup("待完成", grouped.pending)}
        {renderGroup("已完成", grouped.completed, true)}
      </div>

      <ReflectionPanel reflections={reflections} onSave={onSaveReflection} notify={notify} />

      <button className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#4F6EF7] text-white shadow-lg sm:hidden" onClick={() => setQuickOpen(true)} aria-label="快速添加">
        <Plus size={26} />
      </button>

      <Modal title="添加任务" open={quickOpen} onClose={() => setQuickOpen(false)}>
        <form className="space-y-4" onSubmit={submitQuickTask}>
          <label className="text-sm font-semibold">
            任务名称
            <input autoFocus className={`${inputClass} mt-1`} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="写下要完成的事" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold">日期<input className={`${inputClass} mt-1`} type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
            <label className="text-sm font-semibold">时间<input className={`${inputClass} mt-1`} type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label>
            <label className="text-sm font-semibold">分类<select className={`${inputClass} mt-1`} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value as Subject })}>{SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
          </div>
          <button type="button" className="text-sm font-semibold text-[#4F6EF7]" onClick={() => setAdvancedOpen((value) => !value)}>
            {advancedOpen ? "收起更多设置" : "更多设置"}
          </button>
          {advancedOpen && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2">任务说明<textarea className={`${inputClass} mt-1 min-h-24`} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <label className="text-sm font-semibold">预计时间<input className={`${inputClass} mt-1`} type="number" min="0" value={draft.estimatedMinutes} onChange={(event) => setDraft({ ...draft, estimatedMinutes: event.target.value })} /></label>
              <label className="text-sm font-semibold">优先级<select className={`${inputClass} mt-1`} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>{priorityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="text-sm font-semibold sm:col-span-2">完成记录<select className={`${inputClass} mt-1`} value={draft.evidenceRequirement} onChange={(event) => setDraft({ ...draft, evidenceRequirement: event.target.value as EvidenceRequirement })}><option value="none">不填写</option><option value="text">文字</option><option value="image">图片</option><option value="text_and_image">文字和图片</option></select></label>
            </div>
          )}
          <Button className="w-full">保存任务</Button>
        </form>
      </Modal>
    </div>
  );
}
