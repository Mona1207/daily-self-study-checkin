import { StudyTask, TaskTimerState } from "../types/task";

export const MAX_SESSION_SECONDS = 6 * 60 * 60;

export const secondsBetween = (startIso?: string, end = new Date()): number => {
  if (!startIso) return 0;
  const diff = Math.floor((end.getTime() - new Date(startIso).getTime()) / 1000);
  return Math.max(0, Math.min(diff, MAX_SESSION_SECONDS));
};

export const getDisplayedSeconds = (task: StudyTask, timer?: TaskTimerState): number => {
  const base = Math.max(0, task.actualSeconds ?? 0);
  if (!timer || timer.taskId !== task.id) return base;
  const runningExtra = timer.running ? secondsBetween(timer.startedAt) : 0;
  return Math.max(0, timer.accumulatedSeconds + runningExtra);
};

export const formatDuration = (seconds = 0): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  if (hours > 0) return `${hours}小时${String(minutes).padStart(2, "0")}分`;
  if (minutes > 0) return `${minutes}分${String(rest).padStart(2, "0")}秒`;
  return `${rest}秒`;
};

export const isTimerCrossDay = (timer?: TaskTimerState): boolean => {
  if (!timer?.running || !timer.startedAt) return false;
  return timer.startedAt.slice(0, 10) !== new Date().toISOString().slice(0, 10);
};
