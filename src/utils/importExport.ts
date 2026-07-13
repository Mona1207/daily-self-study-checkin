import { AppSettings, ExportData, StudyTask } from "../types/task";
import { getTodayString } from "./date";
import { EXPORT_VERSION } from "./storage";

export const buildExportData = (tasks: StudyTask[], settings: AppSettings): ExportData => ({
  version: EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  tasks,
  settings,
});

export const downloadJson = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const readJsonFile = async (file: File): Promise<unknown> => {
  const text = await file.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("JSON 解析失败，请检查文件内容是否为有效 JSON。");
  }
};

export const buildTemplateData = (): ExportData => {
  const today = getTodayString();
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: [
      {
        id: "template-task-1",
        date: today,
        title: "示例：完成数学练习",
        subject: "数学",
        description: "这里填写任务说明",
        estimatedMinutes: 30,
        priority: "medium",
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ],
    settings: {
      studentName: "张小明",
      adminPassword: "123456",
      dailyGoal: 4,
      enableAnimations: true,
      showEstimatedTime: true,
      darkMode: false,
      onboarded: true,
    },
  };
};
