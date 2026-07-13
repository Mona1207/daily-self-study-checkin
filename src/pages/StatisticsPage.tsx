import { BarChart3, CalendarDays, CheckCircle2, Flame, Trophy } from "lucide-react";
import { StudyTask, SUBJECTS } from "../types/task";
import { Card } from "../components/common/Card";
import { ProgressBar } from "../components/common/ProgressBar";
import {
  calculateStreak,
  getHistoryCompletedTotal,
  getMonthCompletedCount,
  getRecentSevenDays,
  getSubjectCompletedCounts,
  getWeekCompletedCount,
} from "../utils/statistics";
import { parseLocalDate } from "../utils/date";

interface StatisticsPageProps {
  tasks: StudyTask[];
}

export function StatisticsPage({ tasks }: StatisticsPageProps) {
  const weekCompleted = getWeekCompletedCount(tasks);
  const monthCompleted = getMonthCompletedCount(tasks);
  const streak = calculateStreak(tasks);
  const totalCompleted = getHistoryCompletedTotal(tasks);
  const subjectCounts = getSubjectCompletedCounts(tasks);
  const maxSubject = Math.max(1, ...Object.values(subjectCounts));
  const recentDays = getRecentSevenDays(tasks);
  const maxRecent = Math.max(1, ...recentDays.map((day) => day.completed));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">数据从本地任务记录自动计算</p>
        <h1 className="mt-1 text-3xl font-black">学习统计</h1>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CalendarDays className="text-sky-500" size={28} />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">本周完成任务</p>
          <p className="mt-1 text-3xl font-black">{weekCompleted}</p>
        </Card>
        <Card>
          <BarChart3 className="text-indigo-500" size={28} />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">本月完成任务</p>
          <p className="mt-1 text-3xl font-black">{monthCompleted}</p>
        </Card>
        <Card>
          <Flame className="text-orange-500" size={28} />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">连续完成全部任务</p>
          <p className="mt-1 text-3xl font-black">{streak} 天</p>
        </Card>
        <Card>
          <Trophy className="text-emerald-500" size={28} />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">历史总完成任务</p>
          <p className="mt-1 text-3xl font-black">{totalCompleted}</p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">各科目完成数量</h2>
          <div className="mt-5 space-y-4">
            {SUBJECTS.map((subject) => {
              const count = subjectCounts[subject] ?? 0;
              return (
                <div key={subject}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold">{subject}</span>
                    <span className="text-slate-500 dark:text-slate-400">{count} 项</span>
                  </div>
                  <ProgressBar percent={Math.round((count / maxSubject) * 100)} label="" />
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
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-44 w-full items-end justify-center rounded-2xl bg-slate-50 p-2 dark:bg-slate-800">
                    <div
                      className="w-full max-w-9 rounded-t-xl bg-gradient-to-t from-indigo-500 to-sky-400 transition-all"
                      style={{ height: `${height}%` }}
                      title={`${day.date} 完成 ${day.completed} 项`}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {date.getMonth() + 1}/{date.getDate()}
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <CheckCircle2 size={12} />
                    {day.completed}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
