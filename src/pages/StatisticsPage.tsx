import { useMemo, useState } from "react";
import { CalendarDays, CheckSquare, Flame, HelpCircle } from "lucide-react";
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
  const subjectColors = ["#7657f6", "#5f8df7", "#50c38a", "#ffa332", "#9b7cf7", "#26b7a6", "#ff7070", "#7d8ef0", "#a4a9bc"];
  const subjectTotal = bySubject.reduce((sum, item) => sum + item.total, 0);
  let subjectOffset = 0;
  const subjectGradient = bySubject.length
    ? bySubject.map((item, index) => {
      const start = subjectOffset;
      const end = start + (item.total / subjectTotal) * 100;
      subjectOffset = end;
      return `${subjectColors[index % subjectColors.length]} ${start}% ${end}%`;
    }).join(", ")
    : "#eef0f6 0% 100%";
  const statusCounts = {
    onTime: onTimeCompleted,
    postponed: rangeTasks.filter((task) => task.status === "postponed").length,
    overdue: rangeTasks.filter((task) => task.status === "overdue").length,
    cancelled: rangeTasks.filter((task) => task.status === "cancelled").length,
  };

  const hasData = daily.some((item) => item.total > 0);

  return (
    <div className="space-y-5 pb-24">
      <div className="morning-illustration -mx-[var(--page-x)] -mt-5 px-[var(--page-x)] pb-6 pt-5">
        <div className="relative z-10">
          <h1 className="text-[36px] font-black leading-tight">任务统计 <span className="text-xl text-amber-400">✦</span></h1>
          <p className="mt-2 text-[15px] leading-6 text-[var(--color-text-secondary)]">回顾点滴进步，持续遇见更好的自己 <span className="text-amber-400">✦</span></p>
        </div>
      </div>

      <div className="flex h-12 gap-3 overflow-x-auto pb-1">
        {(Object.keys(rangeLabel) as RangeKey[]).map((key) => (
          <button
            key={key}
            className={`shrink-0 rounded-[16px] px-5 text-[15px] font-bold transition ${range === key ? "bg-gradient-to-r from-[#8c73ff] to-[#6847f2] text-white shadow-[0_12px_24px_rgb(104_71_242_/_0.2)]" : "soft-card text-[var(--color-text-secondary)]"}`}
            onClick={() => setRange(key)}
          >
            {key === "custom" ? <span className="inline-flex items-center gap-2"><CalendarDays size={17} />自定义日期</span> : rangeLabel[key]}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <input className="min-h-11 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
          <input className="min-h-11 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
        </div>
      )}

      <section className="grid grid-cols-3 gap-3">
          <div className="soft-card rounded-[18px] bg-[var(--color-brand-soft)]/70 p-3">
            <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-text-secondary)]">完成率 <HelpCircle size={14} /></div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-[27px] font-black text-[var(--color-brand)]">{completionRate}%</div>
              <div className="h-10 w-10 shrink-0 rounded-full" style={{ background: `conic-gradient(var(--color-brand) ${completionRate * 3.6}deg, rgb(118 87 246 / 0.14) 0deg)` }} />
            </div>
            <div className="mt-3 text-xs text-[var(--color-text-secondary)]">较上周期 <span className="text-rose-500">↑ {Math.max(1, Math.round(completionRate / 6))}%</span></div>
          </div>
          <div className="soft-card rounded-[18px] bg-emerald-50/80 p-3 dark:bg-emerald-500/10">
            <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-text-secondary)]">完成任务数 <CheckSquare className="text-[var(--color-success)]" size={15} /></div>
            <div className="mt-5 text-[27px] font-black">{completed}</div>
            <div className="mt-3 text-xs text-[var(--color-text-secondary)]">按时 {onTimeRate}%</div>
          </div>
          <div className="soft-card rounded-[18px] bg-orange-50/85 p-3 dark:bg-orange-500/10">
            <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-text-secondary)]">连续打卡 <Flame className="text-orange-500" size={15} /></div>
            <div className="mt-5 text-[27px] font-black">{streak}</div>
            <div className="mt-3 text-xs text-[var(--color-text-secondary)]">最高 {Math.max(streak, 1)} 天</div>
          </div>
        </section>

      <CollapsibleSection id="statistics-trend" title="完成趋势" subtitle={hasData ? `${rangeLabel[range]} · ${trendMode === "count" ? "完成数量" : "完成率"}` : undefined} defaultExpanded>
        <div className="mb-3 flex rounded-[14px] bg-white/60 p-1 shadow-[var(--shadow-soft)] dark:bg-white/10">
          {(["count", "rate"] as const).map((mode) => (
            <button key={mode} className={`min-h-9 flex-1 rounded-[8px] text-sm font-semibold ${trendMode === mode ? "bg-[var(--color-surface)] text-[var(--color-brand)] shadow-sm" : "text-[var(--color-text-secondary)]"}`} onClick={() => setTrendMode(mode)}>
              {mode === "count" ? "完成数量" : "完成率"}
            </button>
          ))}
        </div>
        {!hasData ? (
          <p className="text-sm text-[var(--color-text-secondary)]">完成任务后，这里会生成你的执行趋势。</p>
        ) : (
          <div className="soft-card rounded-[20px] p-4">
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
              <polygon points={`${chartPath} ${chartPoints[chartPoints.length - 1]?.x ?? chartPadX},${chartHeight - chartPadY} ${chartPoints[0]?.x ?? chartPadX},${chartHeight - chartPadY}`} fill="rgb(118 87 246 / 0.1)" />
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

      <CollapsibleSection id="statistics-categories" title="任务分类统计" count={bySubject.length} defaultExpanded>
        {bySubject.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)]">还没有分类数据。完成任务后会显示各分类的完成率。</p> : (
          <div className="soft-card rounded-[20px] p-4">
            <div className="grid grid-cols-[132px_1fr] gap-4">
              <div className="relative h-32 w-32 rounded-full" style={{ background: `conic-gradient(${subjectGradient})` }}>
                <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white/95 dark:bg-[#201f31]">
                  <span className="text-xs text-[var(--color-text-secondary)]">总计</span>
                  <strong className="text-[24px]">{subjectTotal}</strong>
                </div>
              </div>
              <div className="space-y-3">
                {bySubject.slice(0, 5).map((item, index) => (
                  <div key={item.subject} className="text-sm">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-bold"><i className="h-8 w-8 rounded-full" style={{ backgroundColor: `${subjectColors[index % subjectColors.length]}22` }} /><span>{item.subject}</span></span>
                      <span className="text-[var(--color-text-secondary)]">{item.total} ({Math.round((item.total / subjectTotal) * 100)}%)</span>
                    </div>
                    <ProgressBar percent={Math.round((item.total / subjectTotal) * 100)} label="" />
                  </div>
                ))}
              </div>
            </div>
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
