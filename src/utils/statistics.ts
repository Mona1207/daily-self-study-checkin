import { DailyReflection, StudyTask } from "../types/task";
import { addDays, getCurrentWeekRange, getTodayString, parseLocalDate, toDateString } from "./date";

export interface DaySummary {
  date: string;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  postponed: number;
  cancelled: number;
  makeup: number;
  minutes: number;
  plannedMinutes: number;
  status: "none" | "all" | "partial" | "empty";
}

const isCompleted = (task: StudyTask) => task.status === "completed";

export const summarizeDay = (tasks: StudyTask[], date: string): DaySummary => {
  const dayTasks = tasks.filter((task) => (task.originalScheduledDate ?? task.date) === date && task.status !== "postponed");
  const completed = dayTasks.filter(isCompleted).length;
  const overdue = dayTasks.filter((task) => task.status === "overdue").length;
  const postponed = tasks.filter((task) => (task.originalScheduledDate ?? task.date) === date && task.status === "postponed").length;
  const cancelled = dayTasks.filter((task) => task.status === "cancelled").length;
  const makeup = dayTasks.filter((task) => isCompleted(task) && (task.completedAt?.slice(0, 10) ?? task.date) > (task.originalScheduledDate ?? task.date)).length;
  const plannedMinutes = dayTasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);

  let status: DaySummary["status"] = "empty";
  const accountable = dayTasks.filter((task) => task.status !== "cancelled");
  if (accountable.length > 0 && completed === accountable.length) status = "all";
  if (accountable.length > 0 && completed > 0 && completed < accountable.length) status = "partial";
  if (accountable.length > 0 && completed === 0) status = "none";

  return {
    date,
    total: dayTasks.length,
    completed,
    pending: dayTasks.filter((task) => task.status === "pending" || task.status === "overdue").length,
    overdue,
    postponed,
    cancelled,
    makeup,
    minutes: plannedMinutes,
    plannedMinutes,
    status,
  };
};

export const getCompletionPercent = (summary: DaySummary): number => {
  const accountable = summary.total - summary.cancelled;
  if (accountable <= 0) return 0;
  return Math.round((summary.completed / accountable) * 100);
};

export const calculateStreak = (tasks: StudyTask[], fromDate = getTodayString()): number => {
  const taskDates = Array.from(new Set(tasks.map((task) => task.originalScheduledDate ?? task.date))).sort((a, b) => b.localeCompare(a));
  if (taskDates.length === 0) return 0;
  let streak = 0;
  let cursor = parseLocalDate(fromDate);
  const earliest = parseLocalDate(taskDates[taskDates.length - 1]);
  while (cursor >= earliest) {
    const date = toDateString(cursor);
    const summary = summarizeDay(tasks, date);
    if (summary.total === 0) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (summary.status === "all") {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    break;
  }
  return streak;
};

export const getHistoryCompletedTotal = (tasks: StudyTask[]): number => tasks.filter(isCompleted).length;

export const getWeekCompletedCount = (tasks: StudyTask[]): number => {
  const { start, end } = getCurrentWeekRange();
  return tasks.filter((task) => {
    const day = parseLocalDate(task.date);
    return isCompleted(task) && day >= start && day <= end;
  }).length;
};

export const getMonthCompletedCount = (tasks: StudyTask[]): number => {
  const now = new Date();
  return tasks.filter((task) => {
    const day = parseLocalDate(task.date);
    return isCompleted(task) && day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth();
  }).length;
};

export const getSubjectCompletedCounts = (tasks: StudyTask[]): Record<string, number> => {
  return tasks.reduce<Record<string, number>>((acc, task) => {
    if (!isCompleted(task)) return acc;
    acc[task.subject] = (acc[task.subject] ?? 0) + 1;
    return acc;
  }, {});
};

export const getRecentSevenDays = (tasks: StudyTask[]): DaySummary[] => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = toDateString(addDays(today, index - 6));
    return summarizeDay(tasks, date);
  });
};

export const getReflectionForDate = (reflections: DailyReflection[], date: string) => reflections.find((reflection) => reflection.date === date);
