import { StudyTask } from "../types/task";
import { getTodayString } from "../utils/date";

export const createDemoTasks = (): StudyTask[] => {
  const today = getTodayString();
  const now = new Date().toISOString();

  return [
    {
      id: crypto.randomUUID(),
      date: today,
      dueTime: "10:30",
      title: "整理今天最重要的三件事",
      subject: "工作",
      description: "把需要优先处理的事项列清楚，先完成最关键的一项。",
      estimatedMinutes: 20,
      priority: "high",
      status: "pending",
      evidenceRequirement: "none",
      postponeHistory: [],
      completed: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      date: today,
      title: "处理一个重要待办事项",
      subject: "个人",
      description: "选一件真正重要的事，处理完后直接勾选完成。",
      estimatedMinutes: 45,
      priority: "medium",
      status: "pending",
      evidenceRequirement: "text",
      postponeHistory: [],
      completed: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      date: today,
      title: "阅读 30 分钟",
      subject: "阅读",
      description: "读完后简单记一句今天有用的内容。",
      estimatedMinutes: 30,
      priority: "medium",
      status: "pending",
      evidenceRequirement: "text",
      postponeHistory: [],
      completed: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      date: today,
      title: "活动身体 15 分钟",
      subject: "运动",
      description: "散步、拉伸或简单训练都可以。",
      estimatedMinutes: 15,
      priority: "low",
      status: "pending",
      evidenceRequirement: "none",
      postponeHistory: [],
      completed: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
};
