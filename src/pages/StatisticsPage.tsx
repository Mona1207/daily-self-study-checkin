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
  const trendValues = daily.map((item) => ({
    date: item.date,
    total: item.total,
    completed: item.completed,
    value: trendMode === "count" ? item.completed : getCompletionPercent(item),
  }));
  const trendMax = trendMode === "count" ? Math.max(1, ...trendValues.map((item) => item.value)) : 100;
  const chartWidth = 320;
  const chartHeight = 160;
  const chartPadX = 18;
  const chartPadY = 18;
  const chartPoints = trendValues.map((item, index) => {
    const x = chartPadX + (index / Math.max(1, trendValues.length - 1)) * (chartWidth - chartPadX * 2);
    const y = chartHeight - chartPadY - (item.value / trendMax) * (chartHeight - chartPadY * 2);
    return { ...item, x, y };
  });
  const chartPath = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
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
        <h1 className="mt-1 text-[28px] font-bold">任务统计</h1>
      </div>

      <div className="flex h-10 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-1">
        {(Object.keys(rangeLabel) as RangeKey[]).map((key) => (
          <button
            key={key}
            className={`min-w-0 flex-1 rounded-[8px] px-2 text-[13px] font-medium ${range === key ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-secondary)]"}`}
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

      {hasData ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[13px] leading-[18px] text-[var(--color-text-secondary)]">{rangeLabel[range]}完成率</div>
              <div className="mt-1 text-[28px] font-semibold leading-9">{completionRate}%</div>
              <div className="mt-1 text-[13px] leading-[18px] text-[var(--color-text-secondary)]">完成 {completed} / {accountable} 项</div>
            </div>
            <div className="flex h-16 w-28 items-end gap-1" aria-label={`${rangeLabel[range]}趋势`}>
              {daily.slice(-12).map((item) => (
                <span key={item.date} className="flex-1 rounded-full bg-[var(--color-brand)]/25" style={{ height: `${Math.max(8, getCompletionPercent(item) || (item.completed ? 18 : 0))}%` }} />
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 border-t border-[var(--color-border)] pt-3 text-center">
            <div><div className="text-[17px] font-semibold">{completed}</div><div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">完成</div></div>
            <div><div className="text-[17px] font-semibold">{onTimeCompleted}</div><div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">按时</div></div>
            <div><div className="text-[17px] font-semibold">{streak}</div><div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">连续天</div></div>
          </div>
        </section>
      ) : (
        <section className="py-12 text-center text-sm text-[var(--color-text-secondary)]">完成任务后，这里会生成你的执行趋势。</section>
      )}

      <CollapsibleSection id="statistics-trend" title="完成趋势" subtitle={hasData ? `${rangeLabel[range]} · ${trendMode === "count" ? "完成数量" : "完成率"}` : undefined} defaultExpanded>
        <div className="mb-3 flex rounded-[10px] bg-[var(--color-surface-muted)] p-1">
          {(["count", "rate"] as const).map((mode) => (
            <button key={mode} className={`min-h-9 flex-1 rounded-[8px] text-sm font-semibold ${trendMode === mode ? "bg-[var(--color-surface)] text-[var(--color-brand)] shadow-sm" : "text-[var(--color-text-secondary)]"}`} onClick={() => setTrendMode(mode)}>
              {mode === "count" ? "完成数量" : "完成率"}
            </button>
          ))}
        </div>
        {!hasData ? (
          <p className="text-sm text-[var(--color-text-secondary)]">完成任务后，这里会生成你的执行趋势。</p>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <svg className="h-48 w-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${rangeLabel[range]}完成趋势折线图`}>
              {[0, 0.5, 1].map((ratio) => (
                <g key={ratio}>
                  <line
                    x1={chartPadX}
                    x2={chartWidth - chartPadX}
                    y1={chartPadY + ratio * (chartHeight - chartPadY * 2)}
                    y2={chartPadY + ratio * (chartHeight - chartPadY * 2)}
                    stroke="currentColor"
                    className="text-[var(--color-border)]"
                    strokeWidth="1"
                  />
                </g>
              ))}
              <polyline points={chartPath} fill="none" stroke="var(--color-brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {chartPoints.map((point) => (
                <g key={point.date}>
                  <circle cx={point.x} cy={point.y} r="4" fill="var(--color-surface)" stroke="var(--color-brand)" strokeWidth="2.5" />
                  {trendValues.length <= 14 && (
                    <text x={point.x} y={chartHeight - 2} textAnchor="middle" className="fill-[var(--color-text-secondary)] text-[10px]">
                      {point.date.slice(5)}
                    </text>
                  )}
                </g>
              ))}
            </svg>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--color-text-secondary)] sm:grid-cols-4">
              {chartPoints.slice(-4).map((point) => (
                <button key={point.date} className="rounded-[8px] bg-[var(--color-surface-muted)] px-2 py-2 text-left" onClick={() => onGoDate?.(point.date)}>
                  <span className="block font-semibold text-[var(--color-text)]">{point.date.slice(5)}</span>
                  <span>{trendMode === "count" ? `${point.completed} 项完成` : `${point.value}% 完成率`}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection id="statistics-categories" title="分类统计" count={bySubject.length} defaultExpanded={false}>
        {bySubject.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)]">还没有分类数据。完成任务后会显示各分类的完成率。</p> : (
          <div className="space-y-2">
            {bySubject.slice(0, 5).map((item) => (
              <div key={item.subject} className="py-2 text-sm">
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
          <div className="border-b border-[var(--color-border)] py-2">已完成：{completed}</div>
          <div className="border-b border-[var(--color-border)] py-2">未完成：{Math.max(0, accountable - completed)}</div>
          <div className="border-b border-[var(--color-border)] py-2">已逾期：{statusCounts.overdue}</div>
          <div className="border-b border-[var(--color-border)] py-2">已取消：{statusCounts.cancelled}</div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="statistics-daily-detail" title="每日完成明细" defaultExpanded={false}>
        <div className="space-y-2">
          {daily.map((item) => (
            <button key={item.date} className="flex min-h-11 w-full items-center justify-between border-b border-[var(--color-border)] py-2 text-left text-sm last:border-b-0" onClick={() => onGoDate?.(item.date)}>
              <span>{item.date}</span>
              <span>{item.completed}/{item.total} · {getCompletionPercent(item)}%</span>
            </button>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
