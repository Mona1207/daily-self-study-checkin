export type TaskPriority = "none" | "low" | "medium" | "high";
export type Priority = "low" | "medium" | "high";

export type Subject = "工作" | "学习" | "生活" | "运动" | "阅读" | "健康" | "购物" | "个人" | "其他" | "语文" | "数学" | "英语" | "物理" | "化学" | "地理" | "历史" | "生物" | "政治";

export type TaskStatus = "pending" | "completed" | "overdue" | "postponed" | "cancelled";

export type EvidenceRequirement = "none" | "text" | "number" | "image" | "text_and_image";

export type RecurrenceType = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "interval";

export type DailyMood = "great" | "good" | "normal" | "difficult" | "adjust";

export interface PostponeRecord {
  fromDate: string;
  toDate: string;
  postponedAt: string;
  reason?: string;
}

export interface StudyTask {
  id: string;
  date: string;
  startTime?: string;
  dueTime?: string;
  originalScheduledDate?: string;
  originalDate?: string;
  title: string;
  subject: Subject;
  categoryId?: string;
  description?: string;
  estimatedMinutes?: number;
  priority: Priority;
  status: TaskStatus;
  evidenceRequirement: EvidenceRequirement;
  evidenceId?: string;
  recurringTemplateId?: string;
  postponeHistory?: PostponeRecord[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Legacy compatibility. New code should read/write status.
   */
  completed?: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface DailyTask extends StudyTask {
  subtasks?: Subtask[];
  recurrenceId?: string;
  reminderIds?: number[];
}

export interface TaskCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: string;
}

export interface RecurrenceRule {
  type: RecurrenceType;
  startDate: string;
  endDate?: string;
  weekdays?: number[];
  intervalDays?: number;
  monthlyDay?: number;
}

export interface RecurringTaskTemplate {
  id: string;
  title: string;
  subject: Subject;
  description?: string;
  estimatedMinutes?: number;
  priority: Priority;
  evidenceRequirement: EvidenceRequirement;
  recurrence: RecurrenceRule;
  enabled: boolean;
  autoGenerate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskEvidence {
  id: string;
  taskId: string;
  text?: string;
  numberValue?: number;
  numberLabel?: string;
  imageIds?: string[];
  submittedAt: string;
  updatedAt: string;
}

export interface EvidenceImage {
  id: string;
  taskId: string;
  evidenceId: string;
  name: string;
  type: string;
  blob: Blob;
  createdAt: string;
}

export interface DailyReflection {
  id: string;
  date: string;
  mood: DailyMood;
  bestPart?: string;
  hardestTask?: string;
  learned?: string;
  improvement?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  studentName: string;
  userName?: string;
  adminPasswordHash: string;
  dailyTarget: number;
  animationsEnabled: boolean;
  showEstimatedTime: boolean;
  darkMode: boolean;
  defaultRecurringGenerateDays: number;
  requireAdminPasswordEverySession: boolean;
  lastBackupAt?: string;
  onboarded: boolean;
  publishedTasksVersion?: string;
  categories?: TaskCategory[];
  /**
   * Legacy compatibility. These aliases are kept so older local JSON can still hydrate.
   */
  adminPassword?: string;
  dailyGoal?: number;
  enableAnimations?: boolean;
}

export interface AppDatabase {
  version: number;
  updatedAt: string;
  tasks: StudyTask[];
  recurringTemplates: RecurringTaskTemplate[];
  reflections: DailyReflection[];
  evidences: TaskEvidence[];
  settings: AppSettings;
}

export interface DataSnapshot {
  id: string;
  createdAt: string;
  reason: string;
  data: AppDatabase;
}

export interface ExportData {
  version: number | string;
  exportedAt: string;
  tasks: StudyTask[];
  settings: Partial<AppSettings>;
  recurringTemplates?: RecurringTaskTemplate[];
  reflections?: DailyReflection[];
  evidences?: TaskEvidence[];
}

export const SUBJECTS: Subject[] = ["工作", "学习", "生活", "运动", "阅读", "健康", "购物", "个人", "其他"];

export const DEFAULT_CATEGORIES: TaskCategory[] = SUBJECTS.map((name, index) => ({
  id: `category-${name}`,
  name,
  icon: ["briefcase", "book", "home", "activity", "bookmark", "heart", "shopping-bag", "user", "circle"][index],
  color: ["#E8EEFF", "#EDF7F1", "#F2F4F7", "#FFF2DF", "#F0ECFF", "#E8F6F4", "#FFF0F0", "#EEF2F7", "#F4F4F5"][index],
  order: index,
  createdAt: "2026-07-16T00:00:00.000+08:00",
}));

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "待完成",
  completed: "已完成",
  overdue: "已逾期",
  postponed: "已延期",
  cancelled: "已取消",
};

export const EVIDENCE_LABEL: Record<EvidenceRequirement, string> = {
  none: "不填写",
  text: "添加文字",
  number: "添加数量",
  image: "添加图片",
  text_and_image: "文字和图片",
};

export const MOOD_LABEL: Record<DailyMood, string> = {
  great: "很顺利",
  good: "正常",
  normal: "有点忙",
  difficult: "状态一般",
  adjust: "需要调整",
};

export const CURRENT_DATA_VERSION = 3;
