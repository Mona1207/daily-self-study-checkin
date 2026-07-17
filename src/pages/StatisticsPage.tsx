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
  onGoDate?: (date: string) => void;
}

type RangeKey = "7" | "30" | "month" | "custom";

const rangeLabel: Record<RangeKey, string> = {
  "7": "近7天",
  "30": "近30天",
  month: "本月",
  custom: "自定义",
};

export function StatisticsPage({ tasks, onGoDate }: StatisticsPageProps) {
  const [range, setRange] = useState<RangeKey>("7");
  const [trendMode, setTrendMode] = useState<"count" | "rate">("count");
  const [customStart, setCustomStart] = useState(toDateString(addDays(new Date(), -6)));
  const [customEnd, setCustomEnd] = useState(getTodayString());

  const days = useMemo(() => {
    const today = new Date();
    if (range === "custom") {
      const start = customStart <= customEnd ? customStart : customEnd;
      const end = customStart <= customEnd ? customEnd : customStart;
      const length = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
      return Array.from({ length: Math.max(1, Math.min(366, length)) }, (_, index) => toDateString(addDays(new Date(start), index)));
    }
    if (range === "month") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const length = Math.floor((today.getTime() - first.getTime()) / 86400000) + 1;
      return Array.from({ length }, (_, index) => toDateString(addDays(first, index)));
    }
    const length = Number(range);
    return Array.from({ length }, (_, index) => toDateString(addDays(today, index - length + 1)));
  }, [customEnd, customStart, range]);

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

  const hasData = daily.some((item) => item.total > 0);

  return (
    <div className="space-y-4 pb-24">
      <div>
        <p className="text-sm font-semibold text-[var(--color-brand)]">任务完成情况</p>
        <h1 className="mt-1 text-[28px] font-bold">任务统计</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(rangeLabel) as RangeKey[]).map((key) => (
          <button
            key={key}
            className={`min-h-10 shrink-0 rounded-[10px] px-4 text-sm font-semibold ${range === key ? "bg-[var(--color-brand)] text-white" : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]"}`}
            onClick={() => setRange(key)}
          >
            {rangeLabel[key]}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <input className="min-h-11 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
          <input className="min-h-11 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3 shadow-none"><div className="text-2xl font-semibold">{completed}</div><div className="mt-1 text-xs text-[var(--color-text-secondary)]">完成任务数</div></Card>
        <Card className="p-3 shadow-none"><div className="text-2xl font-semibold">{completionRate}%</div><div className="mt-1 text-xs text-[var(--color-text-secondary)]">完成率</div></Card>
        <Card className="p-3 shadow-none"><div className="text-2xl font-semibold">{onTimeRate}%</div><div className="mt-1 text-xs text-[var(--color-text-secondary)]">按时完成率</div></Card>
        <Card className="p-3 shadow-none"><div className="text-2xl font-semibold">{streak}</div><div className="mt-1 text-xs text-[var(--color-text-secondary)]">连续完成天数</div></Card>
      </div>

      <CollapsibleSection id="statistics-trend" title="完成趋势" subtitle={hasData ? `${rangeLabel[range]} · ${trendMode === "count" ? "完成数量" : "完成率"}` : undefined} defaultExpanded>
        <div className="mb-3 flex rounded-[10px] bg-[var(--color-surface-muted)] p-1">
          {(["count", "rate"] as const).map((mode) => (
            <button key={mode} className={`min-h-9 flex-1 rounded-[8px] text-sm font-semibold ${trendMode === mode ? "bg-[var(--color-surface)] text-[var(--color-brand)] shadow-sm" : "text-[var(--color-text-secondary)]"}`} onClick={() => setTrendMode(mode)}>
              {mode === "count" ? "完成数量" : "完成率"}
            </button>
          ))}
        </div>
        {!hasData ? (
          <p className="text-sm text-[var(--color-text-secondary)]">完成几项任务后，这里会生成你的趋势。</p>
        ) : (
          <div className="space-y-3">
            {daily.map((item) => (
              <div key={item.date}>
                <div className="mb-1 flex justify-between text-xs text-[var(--color-text-secondary)]"><span>{item.date.slice(5)}</span><span>{item.completed}/{item.total}</span></div>
                <ProgressBar percent={trendMode === "count" ? Math.round((item.completed / maxCompleted) * 100) : getCompletionPercent(item)} label="" />
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection id="statistics-categories" title="分类统计" count={bySubject.length} defaultExpanded={false}>
        {bySubject.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)]">还没有分类数据。完成任务后会显示各分类的完成率。</p> : (
          <div className="space-y-2">
            {bySubject.slice(0, 5).map((item) => (
              <div key={item.subject} className="rounded-[10px] bg-[var(--color-surface-muted)] p-3 text-sm">
                <div className="mb-2 flex items-center justify-between"><span>{item.subject}</span><span className="text-[var(--color-text-secondary)]">完成 {item.completed} / {item.total}</span></div>
                <ProgressBar percent={item.total ? Math.round((item.completed / item.total) * 100) : 0} label="" />
              </div>
            ))}
            {bySubject.length > 5 ? <p className="text-xs text-[var(--color-text-secondary)]">已显示前五个分类。</p> : null}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection id="statistics-status" title="任务状态" defaultExpanded={false}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[10px] bg-[var(--color-surface-muted)] p-3">已完成：{completed}</div>
          <div className="rounded-[10px] bg-[var(--color-surface-muted)] p-3">未完成：{Math.max(0, accountable - completed)}</div>
          <div className="rounded-[10px] bg-[var(--color-surface-muted)] p-3">已逾期：{statusCounts.overdue}</div>
          <div className="rounded-[10px] bg-[var(--color-surface-muted)] p-3">已取消：{statusCounts.cancelled}</div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="statistics-daily-detail" title="每日完成明细" defaultExpanded={false}>
        <div className="space-y-2">
          {daily.map((item) => (
            <button key={item.date} className="flex min-h-11 w-full items-center justify-between rounded-[10px] bg-[var(--color-surface-muted)] p-3 text-left text-sm" onClick={() => onGoDate?.(item.date)}>
              <span>{item.date}</span>
              <span>{item.completed}/{item.total} · {getCompletionPercent(item)}%</span>
            </button>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
