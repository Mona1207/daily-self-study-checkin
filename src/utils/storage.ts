import { AppSettings, ExportData, StudyTask } from "../types/task";

export const TASKS_STORAGE_KEY = "self-study-tasks";
export const SETTINGS_STORAGE_KEY = "self-study-settings";
export const EXPORT_VERSION = "1.0.0";

export const DEFAULT_SETTINGS: AppSettings = {
  studentName: "张小明",
  dailyGoal: 4,
  adminPassword: "123456",
  enableAnimations: true,
  showEstimatedTime: true,
  darkMode: false,
  onboarded: false,
};

const canUseStorage = (): boolean => {
  try {
    const key = "__study_storage_test__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const readJson = <T,>(key: string, fallback: T): T => {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
};

const writeJson = <T,>(key: string, value: T): void => {
  if (!canUseStorage()) {
    throw new Error("当前浏览器不支持 localStorage，无法保存数据。");
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("保存失败，请检查浏览器存储空间是否已满。");
  }
};

export const normalizeTask = (task: StudyTask): StudyTask => ({
  ...task,
  id: String(task.id || crypto.randomUUID()),
  title: String(task.title || ""),
  date: String(task.date || ""),
  subject: task.subject,
  priority: task.priority ?? "medium",
  completed: Boolean(task.completed),
  createdAt: task.createdAt || new Date().toISOString(),
});

export const getTasks = (): StudyTask[] => {
  const tasks = readJson<StudyTask[]>(TASKS_STORAGE_KEY, []);
  return Array.isArray(tasks) ? tasks.map(normalizeTask).filter((task) => task.date && task.title) : [];
};

export const saveTasks = (tasks: StudyTask[]): void => {
  const unique = new Map<string, StudyTask>();
  tasks.forEach((task) => unique.set(task.id, normalizeTask(task)));
  writeJson(TASKS_STORAGE_KEY, Array.from(unique.values()));
};

export const addTask = (task: Omit<StudyTask, "id" | "createdAt" | "completed" | "completedAt">): StudyTask => {
  const next: StudyTask = {
    ...task,
    id: crypto.randomUUID(),
    completed: false,
    createdAt: new Date().toISOString(),
  };
  saveTasks([...getTasks(), next]);
  return next;
};

export const updateTask = (taskId: string, patch: Partial<StudyTask>): StudyTask[] => {
  const tasks = getTasks().map((task) => (task.id === taskId ? { ...task, ...patch } : task));
  saveTasks(tasks);
  return tasks;
};

export const deleteTask = (taskId: string): StudyTask[] => {
  const tasks = getTasks().filter((task) => task.id !== taskId);
  saveTasks(tasks);
  return tasks;
};

export const getSettings = (): AppSettings => {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<AppSettings>>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS) };
};

export const saveSettings = (settings: AppSettings): void => {
  writeJson(SETTINGS_STORAGE_KEY, settings);
};

export const validateExportData = (value: unknown): ExportData => {
  if (!value || typeof value !== "object") {
    throw new Error("导入文件格式错误：根数据必须是对象。");
  }
  const data = value as ExportData;
  if (!Array.isArray(data.tasks)) {
    throw new Error("导入文件格式错误：tasks 必须是数组。");
  }
  if (!data.settings || typeof data.settings !== "object") {
    throw new Error("导入文件格式错误：缺少 settings。");
  }
  return data;
};

export const importTasks = (incoming: StudyTask[], mode: "replace" | "merge"): StudyTask[] => {
  const normalized = incoming.map(normalizeTask).filter((task) => task.date && task.title);
  if (mode === "replace") {
    saveTasks(normalized);
    return normalized;
  }

  const map = new Map<string, StudyTask>();
  getTasks().forEach((task) => map.set(task.id, task));
  normalized.forEach((task) => map.set(task.id, task));
  const merged = Array.from(map.values());
  saveTasks(merged);
  return merged;
};

export const exportTasks = (): ExportData => ({
  version: EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  tasks: getTasks(),
  settings: getSettings(),
});
