import { StudyTask, TaskTimerState } from "../types/task";
import { getDisplayedSeconds } from "./timer";

export interface TaskRecommendation {
  task?: StudyTask;
  reason: string;
}

export const getNextTaskRecommendation = (tasks: StudyTask[], today: string, timer?: TaskTimerState): TaskRecommendation => {
  const active = tasks.filter((task) => task.status !== "completed" && task.status !== "abandoned" && task.status !== "postponed");
  const overdue = active.filter((task) => task.date < today || task.status === "overdue");
  if (overdue.length) return { task: overdue.sort((a, b) => a.date.localeCompare(b.date))[0], reason: "这是一个逾期任务，建议优先处理" };

  const running = active.find((task) => timer?.taskId === task.id || getDisplayedSeconds(task, timer) > 0);
  if (running) return { task: running, reason: "你已经开始了这个任务" };

  const todayPending = active.filter((task) => task.date === today);
  if (!todayPending.length) {
    const todayTotal = tasks.filter((task) => task.date === today).length;
    return { reason: todayTotal ? "今天的任务已经全部完成，可以记录今天或提前查看明天的计划。" : "今天还没有安排任务。" };
  }

  const high = todayPending.find((task) => task.priority === "high");
  if (high) return { task: high, reason: "这是今天的高优先级任务" };

  const short = [...todayPending].sort((a, b) => (a.estimatedMinutes ?? 999) - (b.estimatedMinutes ?? 999))[0];
  if (short?.estimatedMinutes && short.estimatedMinutes <= 25) return { task: short, reason: `预计${short.estimatedMinutes}分钟，可以先快速完成` };

  return { task: todayPending[0], reason: "从这一项开始，今天的节奏会更容易建立" };
};
