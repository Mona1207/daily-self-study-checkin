import { AppDatabase, AppSettings, ExportData, StudyTask } from "../types/task";
import { getTodayString } from "./date";
import { EXPORT_VERSION } from "./storage";

export const buildExportData = (databaseOrTasks: AppDatabase | StudyTask[], settings?: AppSettings): ExportData => {
  if (Array.isArray(databaseOrTasks)) {
    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      tasks: databaseOrTasks,
      settings: settings ?? {},
    };
  }
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: databaseOrTasks.tasks,
    settings: databaseOrTasks.settings,
    recurringTemplates: databaseOrTasks.recurringTemplates,
    studySessions: databaseOrTasks.studySessions,
    reflections: databaseOrTasks.reflections,
    evidences: databaseOrTasks.evidences,
  };
};

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
  const now = new Date().toISOString();
  return {
    version: EXPORT_VERSION,
    exportedAt: now,
    tasks: [
      {
        id: "template-task-1",
        date: today,
        title: "示例：整理项目资料",
        subject: "工作",
        description: "这里填写任务说明",
        estimatedMinutes: 30,
        actualSeconds: 0,
        priority: "medium",
        status: "pending",
        evidenceRequirement: "text",
        postponeHistory: [],
        createdAt: now,
        updatedAt: now,
        completed: false,
      },
    ],
    settings: {
      studentName: "我",
      userName: "我",
      dailyTarget: 4,
      animationsEnabled: true,
      showEstimatedTime: true,
      darkMode: false,
      onboarded: true,
      defaultRecurringGenerateDays: 30,
      requireAdminPasswordEverySession: true,
    },
  };
};
