import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppSettings, DailyReflection, StudyTask } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { TaskCard } from "../components/tasks/TaskCard";
import { formatChineseDate, getMonthDays, getTodayString, isSameMonth, toDateString } from "../utils/date";
import { summarizeDay } from "../utils/statistics";
import { sortTasks } from "../utils/taskSort";

interface CalendarPageProps {
  tasks: StudyTask[];
  settings: AppSettings;
  reflections?: DailyReflection[];
}

const dotClass = {
  all: "bg-emerald-500",
  partial: "bg-orange-400",
  none: "bg-slate-400",
  empty: "",
};

export function CalendarPage({ tasks, settings, reflections = [] }: CalendarPageProps) {
  const today = getTodayString();
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const days = useMemo(() => getMonthDays(monthCursor.getFullYear(), monthCursor.getMonth()), [monthCursor]);
  const selectedSummary = summarizeDay(tasks, selectedDate);
  const selectedTasks = sortTasks(tasks.filter((task) => task.date === selectedDate));

  const changeMonth = (offset: number) => {
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">月历视图</p>
        <h1 className="mt-1 text-3xl font-black">学习日历</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <Button variant="secondary" icon={<ChevronLeft size={18} />} onClick={() => changeMonth(-1)}>
              上月
            </Button>
            <div className="text-center">
              <h2 className="text-xl font-black">
                {monthCursor.getFullYear()}年{monthCursor.getMonth() + 1}月
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">点击日期查看任务</p>
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
                      ? "bg-indigo-500 text-white shadow-md"
                      : "bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                  } ${muted && !active ? "text-slate-300 dark:text-slate-600" : ""}`}
                >
                  <span>{day.getDate()}</span>
                  {summary.status !== "empty" && (
                    <span
                      className={`mt-1 h-2 w-2 rounded-full ${dotClass[summary.status]} ${active ? "ring-2 ring-white" : ""}`}
                    />
                  )}
                  {reflected && <span className="mt-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">总结</span>}
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
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">{formatChineseDate(new Date(selectedDate))}</p>
            <h2 className="mt-1 text-xl font-black">当天任务概览</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                <div className="text-2xl font-black">{selectedSummary.total}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">总数</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                <div className="text-2xl font-black">{selectedSummary.completed}</div>
                <div className="text-xs">完成</div>
              </div>
              <div className="rounded-2xl bg-orange-50 p-3 text-orange-600 dark:bg-orange-500/15 dark:text-orange-200">
                <div className="text-2xl font-black">{selectedSummary.pending}</div>
                <div className="text-xs">未完成</div>
              </div>
            </div>
          </Card>
          <div className="space-y-3">
            {selectedTasks.length === 0 ? (
              <Card className="text-center text-slate-500 dark:text-slate-300">这一天还没有安排任务。</Card>
            ) : (
              selectedTasks.map((task) => (
                <TaskCard key={task.id} task={task} showEstimatedTime={settings.showEstimatedTime} compact />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
