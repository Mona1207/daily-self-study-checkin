import { StudyTask } from "../types/task";
import { addDays, getCurrentWeekRange, getTodayString, parseLocalDate, toDateString } from "./date";

export interface DaySummary {
  date: string;
  total: number;
  completed: number;
  pending: number;
  minutes: number;
  status: "none" | "all" | "partial" | "empty";
}

export const summarizeDay = (tasks: StudyTask[], date: string): DaySummary => {
  const dayTasks = tasks.filter((task) => task.date === date);
  const completed = dayTasks.filter((task) => task.completed).length;
  const minutes = dayTasks
    .filter((task) => task.completed)
    .reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);

  let status: DaySummary["status"] = "empty";
  if (dayTasks.length > 0 && completed === dayTasks.length) status = "all";
  if (dayTasks.length > 0 && completed > 0 && completed < dayTasks.length) status = "partial";
  if (dayTasks.length > 0 && completed === 0) status = "none";

  return {
    date,
    total: dayTasks.length,
    completed,
    pending: dayTasks.length - completed,
    minutes,
    status,
  };
};

export const getCompletionPercent = (summary: DaySummary): number => {
  if (summary.total === 0) return 0;
  return Math.round((summary.completed / summary.total) * 100);
};

export const calculateStreak = (tasks: StudyTask[], fromDate = getTodayString()): number => {
  const taskDates = Array.from(new Set(tasks.map((task) => task.date))).sort((a, b) => b.localeCompare(a));
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

    if (summary.completed === summary.total) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }

    break;
  }

  return streak;
};

export const getHistoryCompletedTotal = (tasks: StudyTask[]): number => {
  return tasks.filter((task) => task.completed).length;
};

export const getWeekCompletedCount = (tasks: StudyTask[]): number => {
  const { start, end } = getCurrentWeekRange();
  return tasks.filter((task) => {
    const day = parseLocalDate(task.date);
    return task.completed && day >= start && day <= end;
  }).length;
};

export const getMonthCompletedCount = (tasks: StudyTask[]): number => {
  const now = new Date();
  return tasks.filter((task) => {
    const day = parseLocalDate(task.date);
    return task.completed && day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth();
  }).length;
};

export const getSubjectCompletedCounts = (tasks: StudyTask[]): Record<string, number> => {
  return tasks.reduce<Record<string, number>>((acc, task) => {
    if (!task.completed) return acc;
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
