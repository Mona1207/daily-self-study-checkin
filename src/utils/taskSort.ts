import { StudyTask } from "../types/task";

const priorityRank = {
  high: 3,
  medium: 2,
  low: 1,
};

export const sortTasks = (tasks: StudyTask[]): StudyTask[] => {
  return [...tasks].sort((a, b) => {
    const statusRank = (task: StudyTask) => {
      if (task.status === "overdue") return 0;
      if (task.status === "in_progress") return 1;
      if (task.status === "pending") return 2;
      if (task.status === "postponed") return 3;
      if (task.status === "abandoned") return 4;
      return 5;
    };
    if (statusRank(a) !== statusRank(b)) return statusRank(a) - statusRank(b);
    if (priorityRank[a.priority] !== priorityRank[b.priority]) return priorityRank[b.priority] - priorityRank[a.priority];
    return a.createdAt.localeCompare(b.createdAt);
  });
};
