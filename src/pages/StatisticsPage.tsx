import { useMemo, useState } from "react";
import { DailyReflection, StudyTask, SUBJECTS } from "../types/task";
import { Card } from "../components/common/Card";
import { CollapsibleSection } from "../components/common/CollapsibleSection";
import { ProgressBar } from "../components/common/ProgressBar";
import { addDays, getTodayString, toDateString } from "../utils/date";
import { calculateStreak, getCompletionPercent, summarizeDay } from "../utils/statistics";

interface StatisticsPageProps {
  tasks: StudyTask[];
  reflections?: DailyReflection[];
}

type RangeKey = "7" | "30" | "month";

const rangeLabel: Record<RangeKey, string> = {
  "7": "近7天",
  "30": "近30天",
  month: "本月",
};

export function StatisticsPage({ tasks }: StatisticsPageProps) {
  const [range, setRange] = useState<RangeKey>("7");

  const days = useMemo(() => {
    const today = new Date();
    if (range === "month") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const length = Math.floor((today.getTime() - first.getTime()) / 86400000) + 1;
      return Array.from({ length }, (_, index) => toDateString(addDays(first, index)));
    }
    const length = Number(range);
    return Array.from({ length }, (_, index) => toDateString(addDays(today, index - length + 1)));
  }, [range]);

  const rangeTasks = tasks.filter((task) => days.includes(task.originalScheduledDate ?? task.date));
  const completed = rangeTasks.filter((task) => task.status === "completed").length;
  const accountable = rangeTasks.filter((task) => task.status !== "cancelled").length;
  const completionRate = accountable ? Math.round((completed / accountable) * 100) : 0;
  const onTimeCompleted = rangeTasks.filter((task) => task.status === "completed" && (!task.completedAt || task.completedAt.slice(0, 10) <= (task.originalScheduledDate ?? task.date))).length;
  const onTimeRate = completed ? Math.round((onTimeCompleted / completed) * 100) : 0;
  const streak = calculateStreak(tasks);
  const daily = days.map((date) => summarizeDay(tasks, date));
  const maxCompleted = Math.max(1, ...daily.map((item) => item.completed));
  const bySubject = SUBJECTS.map((subject) => ({
    subject,
    total: rangeTasks.filter((task) => task.subject === subject).length,
    completed: rangeTasks.filter((task) => task.subject === subject && task.status === "completed").length,
  })).filter((item) => item.total > 0);
  const statusCounts = {
    onTime: onTimeCompleted,
    postponed: rangeTasks.filter((task) => task.status === "postponed").length,
    overdue: rangeTasks.filter((task) => task.status === "overdue").length,
    cancelled: rangeTasks.filter((task) => task.status === "cancelled").length,
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <p className="text-sm font-semibold text-[#4F6EF7]">任务完成情况</p>
        <h1 className="mt-1 text-[22px] font-semibold">任务统计</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(rangeLabel) as RangeKey[]).map((key) => (
          <button
            key={key}
            className={`min-h-10 shrink-0 rounded-[10px] px-4 text-sm font-semibold ${range === key ? "bg-[#4F6EF7] text-white" : "bg-white text-[#6B7280] ring-1 ring-[#E9EBEF] dark:bg-slate-900 dark:ring-slate-800"}`}
            onClick={() => setRange(key)}
          >
            {rangeLabel[key]}
          </button>
        ))}
      </div>

      <CollapsibleSection id="statistics-overview" title="概览" subtitle={`${rangeLabel[range]} · 完成${completed}项`} defaultExpanded>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 shadow-none"><div className="text-2xl font-semibold">{completed}</div><div className="mt-1 text-xs text-[#6B7280]">完成任务数</div></Card>
          <Card className="p-3 shadow-none"><div className="text-2xl font-semibold">{completionRate}%</div><div className="mt-1 text-xs text-[#6B7280]">完成率</div></Card>
          <Card className="p-3 shadow-none"><div className="text-2xl font-semibold">{onTimeRate}%</div><div className="mt-1 text-xs text-[#6B7280]">按时完成率</div></Card>
          <Card className="p-3 shadow-none"><div className="text-2xl font-semibold">{streak}</div><div className="mt-1 text-xs text-[#6B7280]">连续完成天数</div></Card>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="statistics-trend" title="完成趋势" defaultExpanded={false}>
        {daily.every((item) => item.total === 0) ? (
          <p className="text-sm text-[#6B7280]">完成一些任务后，这里会出现趋势。</p>
        ) : (
          <div className="space-y-3">
            {daily.map((item) => (
              <div key={item.date}>
                <div className="mb-1 flex justify-between text-xs text-[#6B7280]"><span>{item.date.slice(5)}</span><span>{item.completed}/{item.total}</span></div>
                <ProgressBar percent={Math.round((item.completed / maxCompleted) * 100)} label="" />
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection id="statistics-categories" title="分类统计" count={bySubject.length} defaultExpanded={false}>
        {bySubject.length === 0 ? <p className="text-sm text-[#6B7280]">还没有分类数据。</p> : (
          <div className="space-y-2">
            {bySubject.map((item) => (
              <div key={item.subject} className="flex items-center justify-between rounded-[10px] bg-[#F6F7F9] p-3 text-sm dark:bg-slate-800">
                <span>{item.subject}</span>
                <span className="text-[#6B7280]">完成 {item.completed} / {item.total}</span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection id="statistics-status" title="任务状态" defaultExpanded={false}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[10px] bg-[#F6F7F9] p-3 dark:bg-slate-800">按时完成：{statusCounts.onTime}</div>
          <div className="rounded-[10px] bg-[#F6F7F9] p-3 dark:bg-slate-800">延期：{statusCounts.postponed}</div>
          <div className="rounded-[10px] bg-[#F6F7F9] p-3 dark:bg-slate-800">逾期：{statusCounts.overdue}</div>
          <div className="rounded-[10px] bg-[#F6F7F9] p-3 dark:bg-slate-800">已取消：{statusCounts.cancelled}</div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="statistics-daily-detail" title="每日完成明细" defaultExpanded={false}>
        <div className="space-y-2">
          {daily.map((item) => (
            <div key={item.date} className="flex items-center justify-between rounded-[10px] bg-[#F6F7F9] p-3 text-sm dark:bg-slate-800">
              <span>{item.date}</span>
              <span>{item.completed}/{item.total} · {getCompletionPercent(item)}%</span>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
