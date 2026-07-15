export type Priority = "low" | "medium" | "high";

export type Subject = "语文" | "数学" | "英语" | "物理" | "化学" | "地理" | "历史" | "生物" | "政治" | "运动" | "其他";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue" | "postponed" | "abandoned";

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
  originalScheduledDate?: string;
  title: string;
  subject: Subject;
  description?: string;
  estimatedMinutes?: number;
  actualSeconds?: number;
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

export interface StudySession {
  id: string;
  taskId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
}

export interface TaskTimerState {
  taskId: string;
  running: boolean;
  startedAt?: string;
  accumulatedSeconds: number;
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
  studySessions: StudySession[];
  timerState?: TaskTimerState;
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
  studySessions?: StudySession[];
  reflections?: DailyReflection[];
  evidences?: TaskEvidence[];
}

export const SUBJECTS: Subject[] = ["语文", "数学", "英语", "物理", "化学", "地理", "历史", "生物", "政治", "运动", "其他"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "待完成",
  in_progress: "学习中",
  completed: "已完成",
  overdue: "已逾期",
  postponed: "已延期",
  abandoned: "已放弃",
};

export const EVIDENCE_LABEL: Record<EvidenceRequirement, string> = {
  none: "无需证明",
  text: "文字说明",
  number: "完成数量",
  image: "上传图片",
  text_and_image: "文字加图片",
};

export const MOOD_LABEL: Record<DailyMood, string> = {
  great: "很顺利",
  good: "还不错",
  normal: "一般",
  difficult: "有点困难",
  adjust: "需要调整",
};

export const CURRENT_DATA_VERSION = 2;
