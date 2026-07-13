import { StudyTask } from "../types/task";
import { getTodayString } from "../utils/date";

// 示例数据位置：首次使用时选择“使用示例数据”会写入这些任务。
export const createDemoTasks = (): StudyTask[] => {
  const today = getTodayString();
  const now = new Date().toISOString();

  return [
    {
      id: crypto.randomUUID(),
      date: today,
      title: "完成一元一次方程练习 10 道",
      subject: "数学",
      description: "做完后把错题整理到错题本，并标出不熟练的步骤。",
      estimatedMinutes: 35,
      priority: "high",
      completed: false,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      date: today,
      title: "背诵 20 个单词",
      subject: "英语",
      description: "先默写，再用每个新词造一个短句。",
      estimatedMinutes: 20,
      priority: "medium",
      completed: false,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      date: today,
      title: "阅读课外书 30 分钟",
      subject: "语文",
      description: "记录 3 句喜欢的表达，并写一句自己的理解。",
      estimatedMinutes: 30,
      priority: "medium",
      completed: false,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      date: today,
      title: "跳绳 15 分钟",
      subject: "运动",
      description: "学习间隙活动一下，保持精力。",
      estimatedMinutes: 15,
      priority: "low",
      completed: false,
      createdAt: now,
    },
  ];
};
