import { useMemo, useState } from "react";
import { CalendarCheck2, CheckCircle2, Flame, ListTodo, PartyPopper } from "lucide-react";
import { AppSettings, StudyTask } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ProgressBar } from "../components/common/ProgressBar";
import { TaskCard } from "../components/tasks/TaskCard";
import { TaskFilter, TaskFilters } from "../components/tasks/TaskFilters";
import { formatChineseDate, getGreeting, getTodayString, getWeekdayName } from "../utils/date";
import { calculateStreak, getCompletionPercent, summarizeDay } from "../utils/statistics";
import { sortTasks } from "../utils/taskSort";

interface TodayPageProps {
  tasks: StudyTask[];
  settings: AppSettings;
  onComplete: (task: StudyTask) => void;
  onUndo: (task: StudyTask) => void;
  onGoAdmin: () => void;
}

const getEncouragement = (percent: number, total: number): string => {
  if (total === 0) return "今天也要向目标前进一步！";
  if (percent === 100) return "恭喜你，今天的学习任务全部完成！";
  if (percent >= 60) return "已经完成大半了，保持这个节奏！";
  if (percent > 0) return "开了一个好头，继续加油！";
  return "今天也要向目标前进一步！";
};

export function TodayPage({ tasks, settings, onComplete, onUndo, onGoAdmin }: TodayPageProps) {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const today = getTodayString();
  const todayDate = new Date();
  const todayTasks = tasks.filter((task) => task.date === today);
  const summary = summarizeDay(tasks, today);
  const percent = getCompletionPercent(summary);
  const streak = calculateStreak(tasks);
  const displayTasks = useMemo(() => {
    const filtered = todayTasks.filter((task) => {
      if (filter === "pending") return !task.completed;
      if (filter === "done") return task.completed;
      return true;
    });
    return sortTasks(filtered);
  }, [filter, todayTasks]);

  if (tasks.length === 0) {
    return (
      <Card className="mx-auto mt-12 max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15">
          <ListTodo size={32} />
        </div>
        <h1 className="mt-5 text-2xl font-black">开始今天的学习计划吧</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-300">暂时还没有学习任务，请前往任务管理页面添加任务。</p>
        <Button className="mt-6" onClick={onGoAdmin}>
          添加第一个任务
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-sky-100 via-indigo-50 to-white p-5 shadow-soft sm:p-7 dark:from-sky-950 dark:via-indigo-950 dark:to-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-200">
              {formatChineseDate(todayDate)} · {getWeekdayName(todayDate)}
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-normal sm:text-4xl">
              {settings.studentName}，{getGreeting()}！
            </h1>
            <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{getEncouragement(percent, summary.total)}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/75 p-4 shadow-sm dark:bg-slate-900/70">
            <Flame className="text-orange-500" size={28} />
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">当前连续打卡</div>
              <div className="text-2xl font-black">{streak} 天</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">今日任务总数</p>
              <p className="mt-2 text-3xl font-black">{summary.total}</p>
            </div>
            <CalendarCheck2 className="text-sky-500" size={30} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">已完成任务数</p>
              <p className="mt-2 text-3xl font-black text-emerald-600">{summary.completed}</p>
            </div>
            <CheckCircle2 className="text-emerald-500" size={30} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">未完成任务数</p>
              <p className="mt-2 text-3xl font-black text-orange-500">{summary.pending}</p>
            </div>
            <ListTodo className="text-orange-500" size={30} />
          </div>
        </Card>
      </section>

      <Card className={summary.total > 0 && percent === 100 && settings.enableAnimations ? "animate-pop" : ""}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black">今日完成进度</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              今日已完成 {summary.completed}/{summary.total} 项任务
            </p>
          </div>
          {summary.total > 0 && percent === 100 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              <PartyPopper size={18} />
              总学习 {summary.minutes} 分钟
            </span>
          )}
        </div>
        <ProgressBar percent={percent} />
      </Card>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black">今日任务列表</h2>
          <TaskFilters value={filter} onChange={setFilter} />
        </div>
        <div className="space-y-4">
          {displayTasks.length === 0 ? (
            <Card className="text-center text-slate-500 dark:text-slate-300">当前筛选下没有任务。</Card>
          ) : (
            displayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                showEstimatedTime={settings.showEstimatedTime}
                onComplete={onComplete}
                onUndo={onUndo}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
