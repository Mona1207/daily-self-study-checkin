import { StudyTask } from "../types/task";

export const PUBLISHED_TASKS_VERSION = "2026-07-13-v1";

// 已发布任务位置：更新这个列表并提升 PUBLISHED_TASKS_VERSION 后，网站会把新任务合并到本地数据。
export const publishedTasks: StudyTask[] = [
  {
    id: "published-2026-07-13-chinese-guancanghai",
    date: "2026-07-13",
    title: "复习《观沧海》古文",
    subject: "语文",
    description: "熟读课文，复习重点字词、句意和作者情感。",
    estimatedMinutes: 25,
    priority: "medium",
    completed: false,
    createdAt: "2026-07-13T00:00:00.000+08:00",
  },
  {
    id: "published-2026-07-13-math-gaokao-choice-fill",
    date: "2026-07-13",
    title: "2026 年高考数学选择前六道、填空前两道",
    subject: "数学",
    description: "完成选择题前 6 道和填空题前 2 道，做完后标记错题原因。",
    estimatedMinutes: 50,
    priority: "high",
    completed: false,
    createdAt: "2026-07-13T00:00:00.000+08:00",
  },
  {
    id: "published-2026-07-13-english-a-words",
    date: "2026-07-13",
    title: "a 开头 3500 核心词复习",
    subject: "英语",
    description: "复习 3500 核心词中 a 开头词汇，重点记忆拼写、词义和常见搭配。",
    estimatedMinutes: 35,
    priority: "medium",
    completed: false,
    createdAt: "2026-07-13T00:00:00.000+08:00",
  },
];
