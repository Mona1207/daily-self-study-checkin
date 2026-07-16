import {
  AppDatabase,
  AppSettings,
  CURRENT_DATA_VERSION,
  DataSnapshot,
  EvidenceImage,
  ExportData,
  RecurringTaskTemplate,
  StudyTask,
  TaskEvidence,
} from "../types/task";
import { defaultSettings, migrateData, normalizeTask } from "./migrations";

export const APP_DB_STORAGE_KEY = "self-study-app-db-v2";
export const LEGACY_TASKS_STORAGE_KEY = "self-study-tasks";
export const LEGACY_SETTINGS_STORAGE_KEY = "self-study-settings";
export const SNAPSHOT_STORAGE_KEY = "self-study-snapshots-v2";
export const EXPORT_VERSION = CURRENT_DATA_VERSION;

const IMAGE_DB_NAME = "self-study-evidence-images";
const IMAGE_STORE = "images";

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
    return fallback;
  }
};

const writeJson = <T,>(key: string, value: T): void => {
  if (!canUseStorage()) throw new Error("当前浏览器不支持 localStorage，无法保存数据。");
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("保存失败，请检查浏览器存储空间是否已满。");
  }
};

export const createEmptyDatabase = (): AppDatabase => ({
  version: CURRENT_DATA_VERSION,
  updatedAt: new Date().toISOString(),
  tasks: [],
  recurringTemplates: [],
  reflections: [],
  evidences: [],
  settings: defaultSettings(),
});

const loadRawDatabase = (): unknown => {
  const current = readJson<unknown | null>(APP_DB_STORAGE_KEY, null);
  if (current) return current;
  const legacyTasks = readJson<StudyTask[]>(LEGACY_TASKS_STORAGE_KEY, []);
  const legacySettings = readJson<Partial<AppSettings>>(LEGACY_SETTINGS_STORAGE_KEY, {});
  if (legacyTasks.length || Object.keys(legacySettings).length) {
    return { tasks: legacyTasks, settings: legacySettings };
  }
  return createEmptyDatabase();
};

export const saveSnapshot = (reason: string, data = getDatabase()): void => {
  const snapshots = readJson<DataSnapshot[]>(SNAPSHOT_STORAGE_KEY, []);
  const next = [
    { id: crypto.randomUUID(), createdAt: new Date().toISOString(), reason, data },
    ...snapshots,
  ].slice(0, 3);
  writeJson(SNAPSHOT_STORAGE_KEY, next);
};

export const getSnapshots = (): DataSnapshot[] => readJson<DataSnapshot[]>(SNAPSHOT_STORAGE_KEY, []);

export const clearSnapshots = (): void => writeJson(SNAPSHOT_STORAGE_KEY, []);

export const restoreSnapshot = (id?: string): AppDatabase => {
  const snapshots = getSnapshots();
  const snapshot = id ? snapshots.find((item) => item.id === id) : snapshots[0];
  if (!snapshot) throw new Error("没有可恢复的本地快照。");
  saveDatabase(snapshot.data, false);
  return snapshot.data;
};

export const getDatabase = (): AppDatabase => {
  const raw = loadRawDatabase();
  const migrated = migrateData(raw);
  const rawVersion = typeof raw === "object" && raw && "version" in raw ? Number((raw as { version?: unknown }).version) : 1;
  if (rawVersion !== CURRENT_DATA_VERSION || !readJson<unknown | null>(APP_DB_STORAGE_KEY, null)) {
    try {
      saveSnapshot("升级前自动快照", migrated);
      saveDatabase(migrated, false);
    } catch {
      // The app can still run with migrated in-memory data. UI operations will surface save errors.
    }
  }
  return applyOverdue(migrated);
};

export const saveDatabase = (database: AppDatabase, snapshot = true): void => {
  if (snapshot) {
    try {
      const current = readJson<AppDatabase | null>(APP_DB_STORAGE_KEY, null);
      if (current) saveSnapshot("数据修改前快照", current);
    } catch {
      // Snapshot failure should not block a normal save.
    }
  }
  writeJson(APP_DB_STORAGE_KEY, { ...database, version: CURRENT_DATA_VERSION, updatedAt: new Date().toISOString() });
};

export const applyOverdue = (database: AppDatabase): AppDatabase => {
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;
  const tasks = database.tasks.map((task) => {
    if (task.status === "pending" && task.date < today) {
      changed = true;
      return { ...task, status: "overdue" as const, completed: false, updatedAt: new Date().toISOString() };
    }
    return { ...task, completed: task.status === "completed" };
  });
  const next = { ...database, tasks };
  if (changed) {
    try {
      saveDatabase(next, false);
    } catch {
      return next;
    }
  }
  return next;
};

const updateDatabase = (updater: (database: AppDatabase) => AppDatabase): AppDatabase => {
  const next = updater(getDatabase());
  saveDatabase(next);
  return next;
};

export const getTasks = (): StudyTask[] => getDatabase().tasks;

export const saveTasks = (tasks: StudyTask[]): void => {
  const unique = new Map<string, StudyTask>();
  tasks.map(normalizeTask).forEach((task) => unique.set(task.id, { ...task, completed: task.status === "completed" }));
  updateDatabase((database) => ({ ...database, tasks: Array.from(unique.values()) }));
};

export const getSettings = (): AppSettings => getDatabase().settings;

export const saveSettings = (settings: AppSettings): void => {
  updateDatabase((database) => ({ ...database, settings }));
};

export const getRecurringTemplates = (): RecurringTaskTemplate[] => getDatabase().recurringTemplates;

export const saveRecurringTemplates = (recurringTemplates: RecurringTaskTemplate[]): void => {
  updateDatabase((database) => ({ ...database, recurringTemplates }));
};

export const getEvidences = (): TaskEvidence[] => getDatabase().evidences;

export const saveEvidences = (evidences: TaskEvidence[]): void => {
  updateDatabase((database) => ({ ...database, evidences }));
};

export const getReflections = () => getDatabase().reflections;

export const saveReflections = (reflections: AppDatabase["reflections"]): void => {
  updateDatabase((database) => ({ ...database, reflections }));
};

export const validateExportData = (value: unknown): ExportData => {
  const migrated = migrateData(value);
  return {
    version: migrated.version,
    exportedAt: new Date().toISOString(),
    tasks: migrated.tasks,
    settings: migrated.settings,
    recurringTemplates: migrated.recurringTemplates,
    reflections: migrated.reflections,
    evidences: migrated.evidences,
  };
};

export const importDatabase = (incoming: unknown, mode: "replace" | "merge"): { database: AppDatabase; imported: number; skipped: number; errors: number } => {
  const migrated = migrateData(incoming);
  const current = getDatabase();
  if (mode === "replace") {
    saveDatabase(migrated);
    return { database: migrated, imported: migrated.tasks.length, skipped: 0, errors: 0 };
  }
  const taskMap = new Map(current.tasks.map((task) => [task.id, task]));
  let imported = 0;
  let skipped = 0;
  migrated.tasks.forEach((task) => {
    if (taskMap.has(task.id)) skipped += 1;
    else imported += 1;
    taskMap.set(task.id, task);
  });
  const next: AppDatabase = {
    ...current,
    tasks: Array.from(taskMap.values()),
    recurringTemplates: [...current.recurringTemplates, ...migrated.recurringTemplates.filter((item) => !current.recurringTemplates.some((old) => old.id === item.id))],
    reflections: [...current.reflections.filter((item) => !migrated.reflections.some((nextItem) => nextItem.date === item.date)), ...migrated.reflections],
    evidences: [...current.evidences.filter((item) => !migrated.evidences.some((nextItem) => nextItem.id === item.id)), ...migrated.evidences],
    settings: { ...current.settings, ...migrated.settings, onboarded: true },
  };
  saveDatabase(next);
  return { database: next, imported, skipped, errors: 0 };
};

export const exportTasks = (): ExportData => {
  const database = getDatabase();
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: database.tasks,
    settings: database.settings,
    recurringTemplates: database.recurringTemplates,
    reflections: database.reflections,
    evidences: database.evidences,
  };
};

const openImageDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
        reject(new Error("当前浏览器不支持 IndexedDB，无法保存图片记录。"));
      return;
    }
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE, { keyPath: "id" });
    };
    request.onerror = () => reject(new Error("IndexedDB 打开失败，请检查浏览器隐私设置。"));
    request.onsuccess = () => resolve(request.result);
  });

const imageTransaction = async <T,>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE, mode);
    const request = action(transaction.objectStore(IMAGE_STORE));
    request.onerror = () => reject(new Error("图片记录保存或读取失败，可能是存储空间不足。"));
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(new Error("图片记录保存或读取失败，可能是存储空间不足。"));
    };
  });
};

export const saveEvidenceImage = async (image: EvidenceImage): Promise<void> => {
  await imageTransaction("readwrite", (store) => store.put(image));
};

export const getEvidenceImage = async (id: string): Promise<EvidenceImage | undefined> => {
  return imageTransaction<EvidenceImage | undefined>("readonly", (store) => store.get(id));
};

export const deleteEvidenceImage = async (id: string): Promise<void> => {
  await imageTransaction("readwrite", (store) => store.delete(id));
};

export const listEvidenceImages = async (): Promise<EvidenceImage[]> => {
  return imageTransaction<EvidenceImage[]>("readonly", (store) => store.getAll());
};
