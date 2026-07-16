import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Save } from "lucide-react";
import { AppSettings, DailyReflection, StudyTask, Subject, SUBJECTS } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Modal } from "../components/common/Modal";
import { TaskCard } from "../components/tasks/TaskCard";
import { formatChineseDate, getMonthDays, getTodayString, isSameMonth, toDateString } from "../utils/date";
import { summarizeDay } from "../utils/statistics";
import { sortTasks } from "../utils/taskSort";

type NewCalendarTask = Omit<StudyTask, "id" | "createdAt" | "updatedAt" | "status" | "completed" | "actualSeconds"> &
  Partial<Pick<StudyTask, "status" | "actualSeconds" | "evidenceRequirement">>;

interface CalendarPageProps {
  tasks: StudyTask[];
  settings: AppSettings;
  reflections?: DailyReflection[];
  onAddTask?: (task: NewCalendarTask) => StudyTask;
}

const dotClass = {
  all: "bg-emerald-500",
  partial: "bg-orange-400",
  none: "bg-slate-400",
  empty: "",
};

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-[#E9EBEF] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4F6EF7] focus:ring-4 focus:ring-[#4F6EF7]/10 dark:border-slate-700 dark:bg-slate-950";

export function CalendarPage({ tasks, settings, reflections = [], onAddTask }: CalendarPageProps) {
  const today = getTodayString();
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [addOpen, setAddOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickSubject, setQuickSubject] = useState<Subject>("工作");
  const [quickMinutes, setQuickMinutes] = useState("");
  const days = useMemo(() => getMonthDays(monthCursor.getFullYear(), monthCursor.getMonth()), [monthCursor]);
  const selectedSummary = summarizeDay(tasks, selectedDate);
  const selectedTasks = sortTasks(tasks.filter((task) => task.date === selectedDate));

  const changeMonth = (offset: number) => {
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1));
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
    <div className="space-y-6 pb-24">
      <div>
        <p className="text-sm font-semibold text-[#4F6EF7]">月历视图</p>
        <h1 className="mt-1 text-[22px] font-semibold">任务日历</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <Button variant="secondary" icon={<ChevronLeft size={18} />} onClick={() => changeMonth(-1)}>
              上月
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-semibold">
                {monthCursor.getFullYear()}年{monthCursor.getMonth() + 1}月
              </h2>
              <button className="mt-1 text-sm text-[#4F6EF7]" onClick={() => { setMonthCursor(new Date()); setSelectedDate(today); }}>返回今天</button>
            </div>
            <Button variant="secondary" icon={<ChevronRight size={18} />} onClick={() => changeMonth(1)}>
              下月
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
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
                  onClick={() => setSelectedDate(dateString)}
                  className={`flex aspect-square min-h-12 flex-col items-center justify-center rounded-2xl text-sm font-bold transition ${
                    active
                      ? "bg-[#4F6EF7] text-white shadow-md"
                      : "bg-slate-50 hover:bg-[#EEF2FF] dark:bg-slate-800 dark:hover:bg-slate-700"
                  } ${muted && !active ? "text-slate-300 dark:text-slate-600" : ""}`}
                >
                  <span>{day.getDate()}</span>
                  {summary.status !== "empty" && (
                    <span
                      className={`mt-1 h-2 w-2 rounded-full ${dotClass[summary.status]} ${active ? "ring-2 ring-white" : ""}`}
                    />
                  )}
                  {reflected && <span className="mt-1 rounded-full bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] text-[#4F6EF7] dark:bg-indigo-500/20 dark:text-indigo-200">回顾</span>}
                  {current && <span className="mt-1 text-[10px] font-semibold">今天</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-500" />全部完成</span>
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-orange-400" />部分完成</span>
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-slate-400" />没有完成</span>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#4F6EF7]">{formatChineseDate(new Date(selectedDate))}</p>
                <h2 className="mt-1 text-lg font-semibold">当天任务</h2>
              </div>
              {onAddTask && <Button variant="secondary" icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>添加</Button>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-[12px] bg-slate-50 p-3 dark:bg-slate-800">
                <div className="text-2xl font-semibold">{selectedSummary.total}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">总数</div>
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
              <Card className="text-center text-slate-500 dark:text-slate-300">
                <p className="font-medium text-[#1F2329] dark:text-slate-100">这一天没有任务</p>
                {onAddTask && <Button className="mt-4" icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>添加任务</Button>}
              </Card>
            ) : (
              selectedTasks.map((task) => (
                <TaskCard key={task.id} task={task} showEstimatedTime={settings.showEstimatedTime} compact />
              ))
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
