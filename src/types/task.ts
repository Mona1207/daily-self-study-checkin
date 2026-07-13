export type Priority = "low" | "medium" | "high";

export type Subject = "语文" | "数学" | "英语" | "物理" | "化学" | "地理" | "运动";

export interface StudyTask {
  id: string;
  date: string;
  title: string;
  subject: Subject;
  description?: string;
  estimatedMinutes?: number;
  priority: Priority;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface AppSettings {
  studentName: string;
  dailyGoal: number;
  adminPassword: string;
  enableAnimations: boolean;
  showEstimatedTime: boolean;
  darkMode: boolean;
  onboarded: boolean;
  publishedTasksVersion?: string;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  tasks: StudyTask[];
  settings: {
    studentName: string;
    adminPassword: string;
  } & Partial<AppSettings>;
}

export const SUBJECTS: Subject[] = ["语文", "数学", "英语", "物理", "化学", "地理", "运动"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};
