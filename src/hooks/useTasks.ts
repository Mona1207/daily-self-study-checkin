import { useCallback, useMemo, useState } from "react";
import { StudyTask } from "../types/task";
import * as storage from "../utils/storage";

export const useTasks = () => {
  const [tasks, setTasks] = useState<StudyTask[]>(() => storage.getTasks());

  const persist = useCallback((nextTasks: StudyTask[]) => {
    storage.saveTasks(nextTasks);
    setTasks(nextTasks);
  }, []);

  const addOne = useCallback(
    (task: Omit<StudyTask, "id" | "createdAt" | "completed" | "completedAt">) => {
      const next: StudyTask = {
        ...task,
        id: crypto.randomUUID(),
        completed: false,
        createdAt: new Date().toISOString(),
      };
      persist([...tasks, next]);
      return next;
    },
    [persist, tasks],
  );

  const addMany = useCallback(
    (newTasks: Omit<StudyTask, "id" | "createdAt" | "completed" | "completedAt">[]) => {
      const now = new Date().toISOString();
      const created = newTasks.map<StudyTask>((task) => ({
        ...task,
        id: crypto.randomUUID(),
        completed: false,
        createdAt: now,
      }));
      persist([...tasks, ...created]);
      return created.length;
    },
    [persist, tasks],
  );

  const updateOne = useCallback(
    (taskId: string, patch: Partial<StudyTask>) => {
      persist(tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
    },
    [persist, tasks],
  );

  const removeOne = useCallback(
    (taskId: string) => {
      persist(tasks.filter((task) => task.id !== taskId));
    },
    [persist, tasks],
  );

  const replaceAll = useCallback(
    (nextTasks: StudyTask[]) => {
      persist(nextTasks);
    },
    [persist],
  );

  const mergeTasks = useCallback(
    (incoming: StudyTask[]) => {
      const map = new Map<string, StudyTask>();
      tasks.forEach((task) => map.set(task.id, task));
      incoming.forEach((task) => map.set(task.id, task));
      const merged = Array.from(map.values());
      persist(merged);
      return merged.length;
    },
    [persist, tasks],
  );

  const copyDay = useCallback(
    (fromDate: string, toDate: string) => {
      const source = tasks.filter((task) => task.date === fromDate);
      const copied = source.map<StudyTask>((task) => ({
        ...task,
        id: crypto.randomUUID(),
        date: toDate,
        completed: false,
        completedAt: undefined,
        createdAt: new Date().toISOString(),
      }));
      persist([...tasks, ...copied]);
      return copied.length;
    },
    [persist, tasks],
  );

  return useMemo(
    () => ({
      tasks,
      addTask: addOne,
      addTasks: addMany,
      updateTask: updateOne,
      deleteTask: removeOne,
      replaceTasks: replaceAll,
      mergeTasks,
      copyDay,
      refreshTasks: () => setTasks(storage.getTasks()),
    }),
    [addMany, addOne, copyDay, mergeTasks, removeOne, replaceAll, tasks, updateOne],
  );
};
