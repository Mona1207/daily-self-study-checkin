import { useCallback, useMemo, useState } from "react";
import {
  AppDatabase,
  DailyReflection,
  RecurringTaskTemplate,
  StudySession,
  StudyTask,
  TaskEvidence,
  TaskTimerState,
} from "../types/task";
import * as storage from "../utils/storage";
import { normalizeTask } from "../utils/migrations";
import { generateTasksFromTemplates } from "../utils/recurrence";
import { secondsBetween } from "../utils/timer";

type NewTaskInput = Omit<StudyTask, "id" | "createdAt" | "updatedAt" | "status" | "completed" | "actualSeconds"> &
  Partial<Pick<StudyTask, "status" | "actualSeconds" | "evidenceRequirement">>;

const nowIso = () => new Date().toISOString();

export const useTasks = () => {
  const [database, setDatabaseState] = useState<AppDatabase>(() => storage.getDatabase());

  const persist = useCallback((next: AppDatabase) => {
    storage.saveDatabase(next);
    setDatabaseState(storage.applyOverdue(next));
  }, []);

  const refreshAll = useCallback(() => setDatabaseState(storage.getDatabase()), []);

  const updateDatabase = useCallback(
    (updater: (database: AppDatabase) => AppDatabase) => {
      const next = updater(database);
      persist(next);
      return next;
    },
    [database, persist],
  );

  const replaceDatabase = useCallback(
    (next: AppDatabase) => {
      persist(next);
    },
    [persist],
  );

  const replaceTasks = useCallback(
    (tasks: StudyTask[]) => updateDatabase((db) => ({ ...db, tasks: tasks.map(normalizeTask) })),
    [updateDatabase],
  );

  const addTask = useCallback(
    (task: NewTaskInput) => {
      const now = nowIso();
      const next = normalizeTask({
        ...task,
        id: crypto.randomUUID(),
        status: task.status ?? "pending",
        actualSeconds: task.actualSeconds ?? 0,
        evidenceRequirement: task.evidenceRequirement ?? "none",
        createdAt: now,
        updatedAt: now,
      });
      updateDatabase((db) => ({ ...db, tasks: [...db.tasks, next] }));
      return next;
    },
    [updateDatabase],
  );

  const addTasks = useCallback(
    (newTasks: NewTaskInput[]) => {
      const now = nowIso();
      const created = newTasks.map((task) =>
        normalizeTask({
          ...task,
          id: crypto.randomUUID(),
          status: task.status ?? "pending",
          actualSeconds: task.actualSeconds ?? 0,
          evidenceRequirement: task.evidenceRequirement ?? "none",
          createdAt: now,
          updatedAt: now,
        }),
      );
      updateDatabase((db) => ({ ...db, tasks: [...db.tasks, ...created] }));
      return created.length;
    },
    [updateDatabase],
  );

  const updateTask = useCallback(
    (taskId: string, patch: Partial<StudyTask>) => {
      updateDatabase((db) => ({
        ...db,
        tasks: db.tasks.map((task) =>
          task.id === taskId
            ? normalizeTask({ ...task, ...patch, completed: patch.status ? patch.status === "completed" : task.status === "completed", updatedAt: nowIso() })
            : task,
        ),
      }));
    },
    [updateDatabase],
  );

  const deleteTask = useCallback(
    (taskId: string) => updateDatabase((db) => ({ ...db, tasks: db.tasks.filter((task) => task.id !== taskId) })),
    [updateDatabase],
  );

  const mergeTasks = useCallback(
    (incoming: StudyTask[]) => {
      const map = new Map(database.tasks.map((task) => [task.id, task]));
      incoming.map(normalizeTask).forEach((task) => map.set(task.id, task));
      updateDatabase((db) => ({ ...db, tasks: Array.from(map.values()) }));
      return map.size;
    },
    [database.tasks, updateDatabase],
  );

  const copyDay = useCallback(
    (fromDate: string, toDate: string) => {
      const source = database.tasks.filter((task) => task.date === fromDate);
      const now = nowIso();
      const copied = source.map((task) =>
        normalizeTask({
          ...task,
          id: crypto.randomUUID(),
          date: toDate,
          originalScheduledDate: task.originalScheduledDate ?? task.date,
          status: "pending",
          completed: false,
          completedAt: undefined,
          actualSeconds: 0,
          evidenceId: undefined,
          createdAt: now,
          updatedAt: now,
        }),
      );
      updateDatabase((db) => ({ ...db, tasks: [...db.tasks, ...copied] }));
      return copied.length;
    },
    [database.tasks, updateDatabase],
  );

  const saveTemplate = useCallback(
    (template: RecurringTaskTemplate) => {
      updateDatabase((db) => {
        const exists = db.recurringTemplates.some((item) => item.id === template.id);
        return {
          ...db,
          recurringTemplates: exists
            ? db.recurringTemplates.map((item) => (item.id === template.id ? { ...template, updatedAt: nowIso() } : item))
            : [...db.recurringTemplates, template],
        };
      });
    },
    [updateDatabase],
  );

  const deleteTemplate = useCallback(
    (templateId: string, deleteFutureInstances = false) => {
      updateDatabase((db) => ({
        ...db,
        recurringTemplates: db.recurringTemplates.filter((item) => item.id !== templateId),
        tasks: deleteFutureInstances
          ? db.tasks.filter((task) => task.recurringTemplateId !== templateId || task.status === "completed" || task.date < new Date().toISOString().slice(0, 10))
          : db.tasks,
      }));
    },
    [updateDatabase],
  );

  const generateRecurringTasks = useCallback(() => {
    const result = generateTasksFromTemplates(database.tasks, database.recurringTemplates, database.settings.defaultRecurringGenerateDays);
    if (result.created > 0) updateDatabase((db) => ({ ...db, tasks: result.tasks }));
    return result.created;
  }, [database.recurringTemplates, database.settings.defaultRecurringGenerateDays, database.tasks, updateDatabase]);

  const saveEvidence = useCallback(
    (evidence: TaskEvidence) => {
      updateDatabase((db) => {
        const exists = db.evidences.some((item) => item.id === evidence.id);
        return {
          ...db,
          evidences: exists ? db.evidences.map((item) => (item.id === evidence.id ? evidence : item)) : [...db.evidences, evidence],
          tasks: db.tasks.map((task) => (task.id === evidence.taskId ? { ...task, evidenceId: evidence.id, updatedAt: nowIso() } : task)),
        };
      });
    },
    [updateDatabase],
  );

  const saveReflection = useCallback(
    (reflection: DailyReflection) => {
      updateDatabase((db) => ({
        ...db,
        reflections: [...db.reflections.filter((item) => item.date !== reflection.date), reflection],
      }));
    },
    [updateDatabase],
  );

  const setTimerState = useCallback(
    (timerState?: TaskTimerState) => updateDatabase((db) => ({ ...db, timerState })),
    [updateDatabase],
  );

  const addSession = useCallback(
    (session: StudySession) => updateDatabase((db) => ({ ...db, studySessions: [...db.studySessions, session] })),
    [updateDatabase],
  );

  const startTimer = useCallback(
    (task: StudyTask, forcePauseExisting = false) => {
      const current = database.timerState;
      if (current?.running && current.taskId !== task.id && !forcePauseExisting) {
        throw new Error("已有任务正在计时。");
      }
      updateDatabase((db) => {
        let tasks = db.tasks;
        const sessions = [...db.studySessions];
        if (db.timerState?.running && db.timerState.taskId !== task.id) {
          const elapsed = secondsBetween(db.timerState.startedAt);
          tasks = tasks.map((item) => (item.id === db.timerState?.taskId ? { ...item, actualSeconds: db.timerState.accumulatedSeconds + elapsed, updatedAt: nowIso() } : item));
          sessions.push({
            id: crypto.randomUUID(),
            taskId: db.timerState.taskId,
            startedAt: db.timerState.startedAt ?? nowIso(),
            endedAt: nowIso(),
            durationSeconds: elapsed,
          });
        }
        const target = tasks.find((item) => item.id === task.id);
        return {
          ...db,
          studySessions: sessions,
          tasks: tasks.map((item) => (item.id === task.id ? { ...item, status: item.status === "completed" ? "completed" : "in_progress", updatedAt: nowIso() } : item)),
          timerState: {
            taskId: task.id,
            running: true,
            startedAt: nowIso(),
            accumulatedSeconds: Math.max(0, target?.actualSeconds ?? 0),
          },
        };
      });
    },
    [database.timerState, updateDatabase],
  );

  const pauseTimer = useCallback(
    (taskId: string) => {
      updateDatabase((db) => {
        if (!db.timerState || db.timerState.taskId !== taskId) return db;
        const elapsed = db.timerState.running ? secondsBetween(db.timerState.startedAt) : 0;
        const total = Math.max(0, db.timerState.accumulatedSeconds + elapsed);
        return {
          ...db,
          tasks: db.tasks.map((task) => (task.id === taskId ? { ...task, actualSeconds: total, status: task.status === "completed" ? "completed" : "pending", updatedAt: nowIso() } : task)),
          studySessions: db.timerState.running
            ? [
                ...db.studySessions,
                {
                  id: crypto.randomUUID(),
                  taskId,
                  startedAt: db.timerState.startedAt ?? nowIso(),
                  endedAt: nowIso(),
                  durationSeconds: elapsed,
                },
              ]
            : db.studySessions,
          timerState: { taskId, running: false, accumulatedSeconds: total },
        };
      });
    },
    [updateDatabase],
  );

  const resetTimer = useCallback(
    (taskId: string) => {
      updateDatabase((db) => ({
        ...db,
        tasks: db.tasks.map((task) => (task.id === taskId ? { ...task, actualSeconds: 0, updatedAt: nowIso() } : task)),
        studySessions: db.studySessions.filter((session) => session.taskId !== taskId),
        timerState: db.timerState?.taskId === taskId ? undefined : db.timerState,
      }));
    },
    [updateDatabase],
  );

  return useMemo(
    () => ({
      database,
      tasks: database.tasks,
      settings: database.settings,
      recurringTemplates: database.recurringTemplates,
      studySessions: database.studySessions,
      timerState: database.timerState,
      evidences: database.evidences,
      reflections: database.reflections,
      addTask,
      addTasks,
      updateTask,
      deleteTask,
      replaceTasks,
      mergeTasks,
      copyDay,
      saveTemplate,
      deleteTemplate,
      generateRecurringTasks,
      saveEvidence,
      saveReflection,
      setTimerState,
      addSession,
      startTimer,
      pauseTimer,
      resetTimer,
      replaceDatabase,
      refreshAll,
    }),
    [
      addSession,
      addTask,
      addTasks,
      copyDay,
      database,
      deleteTask,
      deleteTemplate,
      generateRecurringTasks,
      mergeTasks,
      pauseTimer,
      refreshAll,
      replaceDatabase,
      replaceTasks,
      resetTimer,
      saveEvidence,
      saveReflection,
      saveTemplate,
      setTimerState,
      startTimer,
      updateTask,
    ],
  );
};
