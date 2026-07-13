import { StudyTask } from "../types/task";

const priorityRank = {
  high: 3,
  medium: 2,
  low: 1,
};

export const sortTasks = (tasks: StudyTask[]): StudyTask[] => {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (priorityRank[a.priority] !== priorityRank[b.priority]) return priorityRank[b.priority] - priorityRank[a.priority];
    return a.createdAt.localeCompare(b.createdAt);
  });
};
