import { BarChart3, CalendarDays, CheckCircle2, Flame, Timer, Trophy } from "lucide-react";
import { DailyReflection, MOOD_LABEL, StudyTask, SUBJECTS } from "../types/task";
import { Card } from "../components/common/Card";
import { ProgressBar } from "../components/common/ProgressBar";
import {
  calculateStreak,
  getCompletionPercent,
  getHistoryCompletedTotal,
  getMonthCompletedCount,
  getRecentSevenDays,
  getSubjectStudySeconds,
  getWeekCompletedCount,
  summarizeDay,
} from "../utils/statistics";
import { getCurrentWeekRange, getTodayString, parseLocalDate } from "../utils/date";
import { formatDuration } from "../utils/timer";

interface StatisticsPageProps {
  tasks: StudyTask[];
  reflections?: DailyReflection[];
}

export function StatisticsPage({ tasks, reflections = [] }: StatisticsPageProps) {
  const todaySummary = summarizeDay(tasks, getTodayString());
  const weekCompleted = getWeekCompletedCount(tasks);
  const monthCompleted = getMonthCompletedCount(tasks);
  const streak = calculateStreak(tasks);
  const totalCompleted = getHistoryCompletedTotal(tasks);
  const subjectSeconds = getSubjectStudySeconds(tasks);
  const maxSubject = Math.max(1, ...Object.values(subjectSeconds));
  const recentDays = getRecentSevenDays(tasks);
  const maxRecent = Math.max(1, ...recentDays.map((day) => day.completed));
  const { start, end } = getCurrentWeekRange();
  const weekSeconds = tasks
    .filter((task) => {
      const day = parseLocalDate(task.date);
      return day >= start && day <= end;
    })
    .reduce((sum, task) => sum + (task.actualSeconds ?? 0), 0);
  const monthSeconds = tasks
    .filter((task) => {
      const day = parseLocalDate(task.date);
      const now = new Date();
      return day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth();
    })
    .reduce((sum, task) => sum + (task.actualSeconds ?? 0), 0);
  const makeup = tasks.filter((task) => task.status === "completed" && task.completedAt && task.completedAt.slice(0, 10) > (task.originalScheduledDate ?? task.date)).length;
  const postponed = tasks.filter((task) => task.status === "postponed").length;
  const abandoned = tasks.filter((task) => task.status === "abandoned").length;
  const onTimeCompleted = tasks.filter((task) => task.status === "completed" && (!task.completedAt || task.completedAt.slice(0, 10) <= (task.originalScheduledDate ?? task.date))).length;
  const onTimeRate = totalCompleted ? Math.round((onTimeCompleted / totalCompleted) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">数据从本地任务记录自动计算</p>
        <h1 className="mt-1 text-3xl font-black">学习统计</h1>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CalendarDays className="text-sky-500" size={28} /><p className="mt-4 text-sm text-slate-500">今日完成率</p><p className="mt-1 text-3xl font-black">{getCompletionPercent(todaySummary)}%</p></Card>
        <Card><BarChart3 className="text-indigo-500" size={28} /><p className="mt-4 text-sm text-slate-500">本周完成任务</p><p className="mt-1 text-3xl font-black">{weekCompleted}</p></Card>
        <Card><Flame className="text-orange-500" size={28} /><p className="mt-4 text-sm text-slate-500">连续完成全部任务</p><p className="mt-1 text-3xl font-black">{streak} 天</p></Card>
        <Card><Trophy className="text-emerald-500" size={28} /><p className="mt-4 text-sm text-slate-500">历史总完成任务</p><p className="mt-1 text-3xl font-black">{totalCompleted}</p></Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CheckCircle2 className="text-emerald-500" size={28} /><p className="mt-4 text-sm text-slate-500">按时完成率</p><p className="mt-1 text-3xl font-black">{onTimeRate}%</p></Card>
        <Card><Timer className="text-indigo-500" size={28} /><p className="mt-4 text-sm text-slate-500">本周学习时长</p><p className="mt-1 text-2xl font-black">{formatDuration(weekSeconds)}</p></Card>
        <Card><Timer className="text-sky-500" size={28} /><p className="mt-4 text-sm text-slate-500">本月学习时长</p><p className="mt-1 text-2xl font-black">{formatDuration(monthSeconds)}</p></Card>
        <Card><BarChart3 className="text-rose-500" size={28} /><p className="mt-4 text-sm text-slate-500">补做 / 延期 / 放弃</p><p className="mt-1 text-2xl font-black">{makeup} / {postponed} / {abandoned}</p></Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">各科目实际学习时长</h2>
          <div className="mt-5 space-y-4">
            {SUBJECTS.map((subject) => {
              const seconds = subjectSeconds[subject] ?? 0;
              return (
                <div key={subject}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold">{subject}</span>
                    <span className="text-slate-500 dark:text-slate-400">{formatDuration(seconds)}</span>
                  </div>
                  <ProgressBar percent={Math.round((seconds / maxSubject) * 100)} label="" />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black">最近七天完成情况</h2>
          <div className="mt-6 flex h-64 items-end gap-3">
            {recentDays.map((day) => {
              const date = parseLocalDate(day.date);
              const height = Math.max(8, Math.round((day.completed / maxRecent) * 100));
              const mood = reflections.find((reflection) => reflection.date === day.date)?.mood;
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center rounded-2xl bg-slate-50 p-2 dark:bg-slate-800">
                    <div className="w-full max-w-9 rounded-t-xl bg-gradient-to-t from-indigo-500 to-sky-400 transition-all" style={{ height: `${height}%` }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{date.getMonth() + 1}/{date.getDate()}</div>
                  <div className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><CheckCircle2 size={12} />{day.completed}</div>
                  {mood && <div className="text-[10px] text-indigo-500">{MOOD_LABEL[mood]}</div>}
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <Card>
        <h2 className="text-xl font-black">计划时长与实际时长</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">今日计划：{todaySummary.plannedMinutes} 分钟</div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">今日实际：{formatDuration(todaySummary.actualSeconds)}</div>
        </div>
      </Card>
    </div>
  );
}
