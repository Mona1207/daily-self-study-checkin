import { useState } from "react";
import { BarChart3, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { DailyReflection, StudyTask, SUBJECTS } from "../types/task";
import { Card } from "../components/common/Card";
import { ProgressBar } from "../components/common/ProgressBar";
import { getCompletionPercent, getSubjectStudySeconds, getWeekCompletedCount, summarizeDay } from "../utils/statistics";
import { getTodayString } from "../utils/date";
import { formatDuration } from "../utils/timer";

interface StatisticsPageProps {
  tasks: StudyTask[];
  reflections?: DailyReflection[];
}

export function StatisticsPage({ tasks }: StatisticsPageProps) {
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const todaySummary = summarizeDay(tasks, getTodayString());
  const weekCompleted = getWeekCompletedCount(tasks);
  const subjectSeconds = getSubjectStudySeconds(tasks);
  const maxSubject = Math.max(1, ...Object.values(subjectSeconds));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">数据从本地任务记录自动计算</p>
        <h1 className="mt-1 text-3xl font-black">任务统计</h1>
      </div>

      <section className="grid grid-cols-2 gap-4">
        <Card>
          <CalendarDays className="text-sky-500" size={28} />
          <p className="mt-4 text-sm text-slate-500">今日完成率</p>
          <p className="mt-1 text-3xl font-black">{getCompletionPercent(todaySummary)}%</p>
        </Card>
        <Card>
          <BarChart3 className="text-indigo-500" size={28} />
          <p className="mt-4 text-sm text-slate-500">本周完成任务</p>
          <p className="mt-1 text-3xl font-black">{weekCompleted}</p>
        </Card>
      </section>

      <Card>
        <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setSubjectsOpen((value) => !value)}>
          <div>
            <h2 className="text-xl font-black">各分类专注时长</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">点一下查看每个分类的专注时长，再点一下收起来。</p>
          </div>
          {subjectsOpen ? <ChevronUp className="text-slate-400" size={22} /> : <ChevronDown className="text-slate-400" size={22} />}
        </button>

        {subjectsOpen && (
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
        )}
      </Card>
    </div>
  );
}
