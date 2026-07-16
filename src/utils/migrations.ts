import {
  AppDatabase,
  AppSettings,
  CURRENT_DATA_VERSION,
  DailyReflection,
  DEFAULT_CATEGORIES,
  EvidenceRequirement,
  Priority,
  RecurringTaskTemplate,
  StudyTask,
  Subject,
  TaskEvidence,
  TaskStatus,
} from "../types/task";
import { getTodayString } from "./date";

export const hashPassword = (password: string): string => {
  let hash = 5381;
  for (const char of password) hash = (hash * 33) ^ char.charCodeAt(0);
  return `local-v1:${(hash >>> 0).toString(16)}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object");

const asString = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const asNumber = (value: unknown, fallback?: number): number | undefined => {
  const number = typeof value === "number" ? value : typeof value === "string" && value !== "" ? Number(value) : fallback;
  return Number.isFinite(number) ? number : fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === "boolean" ? value : fallback);

const priority = (value: unknown): Priority => (value === "low" || value === "medium" || value === "high" ? value : "medium");

const subject = (value: unknown): Subject => {
  const text = asString(value, "其他");
  return text as Subject;
};

const status = (value: unknown, completed: boolean, date: string): TaskStatus => {
  if (value === "completed" || value === "overdue" || value === "postponed" || value === "cancelled") {
    return value;
  }
  if (value === "abandoned") return "cancelled";
  if (value === "in_progress") return date < getTodayString() ? "overdue" : "pending";
  if (completed) return "completed";
  return date < getTodayString() ? "overdue" : "pending";
};

const evidenceRequirement = (value: unknown): EvidenceRequirement => {
  if (value === "text" || value === "number" || value === "image" || value === "text_and_image") return value;
  return "none";
};

export const defaultSettings = (): AppSettings => ({
  studentName: "张小明",
  userName: "我",
  adminPasswordHash: hashPassword("123456"),
  dailyTarget: 4,
  animationsEnabled: true,
  showEstimatedTime: true,
  darkMode: false,
  defaultRecurringGenerateDays: 30,
  requireAdminPasswordEverySession: true,
  onboarded: false,
  publishedTasksVersion: undefined,
  categories: DEFAULT_CATEGORIES,
});

export const normalizeSettings = (raw: unknown): AppSettings => {
  const base = defaultSettings();
  if (!isRecord(raw)) return base;
  const legacyPassword = asString(raw.adminPassword, "");
  return {
    ...base,
    studentName: asString(raw.studentName, base.studentName),
    userName: asString(raw.userName, asString(raw.studentName, base.userName)),
    adminPasswordHash: asString(raw.adminPasswordHash, legacyPassword ? hashPassword(legacyPassword) : base.adminPasswordHash),
    dailyTarget: asNumber(raw.dailyTarget ?? raw.dailyGoal, base.dailyTarget) ?? base.dailyTarget,
    animationsEnabled: asBoolean(raw.animationsEnabled ?? raw.enableAnimations, base.animationsEnabled),
    showEstimatedTime: asBoolean(raw.showEstimatedTime, base.showEstimatedTime),
    darkMode: asBoolean(raw.darkMode, base.darkMode),
    defaultRecurringGenerateDays: Math.max(1, asNumber(raw.defaultRecurringGenerateDays, base.defaultRecurringGenerateDays) ?? base.defaultRecurringGenerateDays),
    requireAdminPasswordEverySession: asBoolean(raw.requireAdminPasswordEverySession, base.requireAdminPasswordEverySession),
    lastBackupAt: asString(raw.lastBackupAt, undefined as unknown as string) || undefined,
    onboarded: asBoolean(raw.onboarded, base.onboarded),
    publishedTasksVersion: asString(raw.publishedTasksVersion, undefined as unknown as string) || undefined,
    categories: Array.isArray(raw.categories) ? raw.categories as AppSettings["categories"] : base.categories,
  };
};

export const normalizeTask = (raw: unknown): StudyTask => {
  const item = isRecord(raw) ? raw : {};
  const now = new Date().toISOString();
  const date = asString(item.date, getTodayString());
  const completed = asBoolean(item.completed, item.status === "completed");
  const normalized: StudyTask = {
    id: asString(item.id, crypto.randomUUID()),
    date,
    startTime: asString(item.startTime, "") || undefined,
    dueTime: asString(item.dueTime, "") || undefined,
    originalScheduledDate: asString(item.originalScheduledDate, "") || undefined,
    originalDate: asString(item.originalDate ?? item.originalScheduledDate, "") || undefined,
    title: asString(item.title, "未命名任务").trim() || "未命名任务",
    subject: subject(item.subject),
    categoryId: asString(item.categoryId, "") || undefined,
    description: asString(item.description, "") || undefined,
    estimatedMinutes: asNumber(item.estimatedMinutes),
    priority: priority(item.priority),
    status: status(item.status, completed, date),
    evidenceRequirement: evidenceRequirement(item.evidenceRequirement),
    evidenceId: asString(item.evidenceId, "") || undefined,
    recurringTemplateId: asString(item.recurringTemplateId, "") || undefined,
    postponeHistory: Array.isArray(item.postponeHistory) ? (item.postponeHistory as StudyTask["postponeHistory"]) : [],
    completedAt: asString(item.completedAt, "") || undefined,
    createdAt: asString(item.createdAt, now),
    updatedAt: asString(item.updatedAt, now),
  };
  normalized.completed = normalized.status === "completed";
  return normalized;
};

export const normalizeTemplate = (raw: unknown): RecurringTaskTemplate => {
  const item = isRecord(raw) ? raw : {};
  const now = new Date().toISOString();
  const recurrence = isRecord(item.recurrence) ? item.recurrence : {};
  return {
    id: asString(item.id, crypto.randomUUID()),
    title: asString(item.title, "周期任务").trim() || "周期任务",
    subject: subject(item.subject),
    description: asString(item.description, "") || undefined,
    estimatedMinutes: asNumber(item.estimatedMinutes),
    priority: priority(item.priority),
    evidenceRequirement: evidenceRequirement(item.evidenceRequirement),
    recurrence: {
      type:
        recurrence.type === "daily" ||
        recurrence.type === "weekdays" ||
        recurrence.type === "weekly" ||
        recurrence.type === "monthly" ||
        recurrence.type === "interval"
          ? recurrence.type
          : "none",
      startDate: asString(recurrence.startDate, getTodayString()),
      endDate: asString(recurrence.endDate, "") || undefined,
      weekdays: Array.isArray(recurrence.weekdays) ? recurrence.weekdays.map(Number).filter((day) => day >= 0 && day <= 6) : [],
      intervalDays: Math.max(1, asNumber(recurrence.intervalDays, 1) ?? 1),
      monthlyDay: Math.min(31, Math.max(1, asNumber(recurrence.monthlyDay, 1) ?? 1)),
    },
    enabled: asBoolean(item.enabled, true),
    autoGenerate: asBoolean(item.autoGenerate, true),
    createdAt: asString(item.createdAt, now),
    updatedAt: asString(item.updatedAt, now),
  };
};

const normalizeEvidence = (raw: unknown): TaskEvidence => {
  const item = isRecord(raw) ? raw : {};
  const now = new Date().toISOString();
  return {
    id: asString(item.id, crypto.randomUUID()),
    taskId: asString(item.taskId, ""),
    text: asString(item.text, "") || undefined,
    numberValue: asNumber(item.numberValue),
    numberLabel: asString(item.numberLabel, "") || undefined,
    imageIds: Array.isArray(item.imageIds) ? item.imageIds.map(String) : [],
    submittedAt: asString(item.submittedAt, now),
    updatedAt: asString(item.updatedAt, now),
  };
};

const normalizeReflection = (raw: unknown): DailyReflection => {
  const item = isRecord(raw) ? raw : {};
  const now = new Date().toISOString();
  const mood = item.mood === "great" || item.mood === "good" || item.mood === "normal" || item.mood === "difficult" || item.mood === "adjust" ? item.mood : "normal";
  return {
    id: asString(item.id, crypto.randomUUID()),
    date: asString(item.date, getTodayString()),
    mood,
    bestPart: asString(item.bestPart, "") || undefined,
    hardestTask: asString(item.hardestTask, "") || undefined,
    learned: asString(item.learned, "") || undefined,
    improvement: asString(item.improvement, "") || undefined,
    notes: asString(item.notes, "") || undefined,
    createdAt: asString(item.createdAt, now),
    updatedAt: asString(item.updatedAt, now),
  };
};

export const migrateData = (rawData: unknown): AppDatabase => {
  const raw = isRecord(rawData) ? rawData : {};
  const maybeTasks = Array.isArray(rawData) ? rawData : Array.isArray(raw.tasks) ? raw.tasks : [];
  const dedupedTasks = new Map<string, StudyTask>();
  maybeTasks.map(normalizeTask).forEach((task) => {
    const id = dedupedTasks.has(task.id) ? crypto.randomUUID() : task.id;
    dedupedTasks.set(id, { ...task, id });
  });

  return {
    version: CURRENT_DATA_VERSION,
    updatedAt: new Date().toISOString(),
    tasks: Array.from(dedupedTasks.values()),
    recurringTemplates: Array.isArray(raw.recurringTemplates) ? raw.recurringTemplates.map(normalizeTemplate) : [],
    reflections: Array.isArray(raw.reflections) ? raw.reflections.map(normalizeReflection) : [],
    evidences: Array.isArray(raw.evidences) ? raw.evidences.map(normalizeEvidence).filter((evidence) => evidence.taskId) : [],
    settings: normalizeSettings(raw.settings),
  };
};
