import { addDays, parseLocalDate, toDateString } from "./date";
import { RecurringTaskTemplate, StudyTask } from "../types/task";

export const shouldGenerateOnDate = (template: RecurringTaskTemplate, date: string): boolean => {
  const { recurrence } = template;
  if (!template.enabled || recurrence.type === "none") return false;
  if (date < recurrence.startDate) return false;
  if (recurrence.endDate && date > recurrence.endDate) return false;

  const day = parseLocalDate(date);
  if (recurrence.type === "daily") return true;
  if (recurrence.type === "weekdays") return day.getDay() >= 1 && day.getDay() <= 5;
  if (recurrence.type === "weekly") return Boolean(recurrence.weekdays?.includes(day.getDay()));
  if (recurrence.type === "monthly") return day.getDate() === (recurrence.monthlyDay ?? parseLocalDate(recurrence.startDate).getDate());
  if (recurrence.type === "interval") {
    const start = parseLocalDate(recurrence.startDate);
    const diffDays = Math.floor((day.getTime() - start.getTime()) / 86400000);
    return diffDays >= 0 && diffDays % Math.max(1, recurrence.intervalDays ?? 1) === 0;
  }
  return false;
};

export const generateTasksFromTemplates = (
  tasks: StudyTask[],
  templates: RecurringTaskTemplate[],
  days: number,
  fromDate = new Date(),
): { tasks: StudyTask[]; created: number } => {
  const now = new Date().toISOString();
  const existing = new Set(tasks.filter((task) => task.recurringTemplateId).map((task) => `${task.recurringTemplateId}:${task.originalScheduledDate ?? task.date}`));
  const generated: StudyTask[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const date = toDateString(addDays(fromDate, offset));
    templates.forEach((template) => {
      if (!template.autoGenerate || !shouldGenerateOnDate(template, date)) return;
      const key = `${template.id}:${date}`;
      if (existing.has(key)) return;
      existing.add(key);
      generated.push({
        id: crypto.randomUUID(),
        date,
        originalScheduledDate: date,
        title: template.title,
        subject: template.subject,
        description: template.description,
        estimatedMinutes: template.estimatedMinutes,
        actualSeconds: 0,
        priority: template.priority,
        status: "pending",
        evidenceRequirement: template.evidenceRequirement,
        recurringTemplateId: template.id,
        postponeHistory: [],
        createdAt: now,
        updatedAt: now,
        completed: false,
      });
    });
  }

  return { tasks: [...tasks, ...generated], created: generated.length };
};

export const recurrenceLabel = (template: RecurringTaskTemplate): string => {
  const rule = template.recurrence;
  if (rule.type === "daily") return "每天重复";
  if (rule.type === "weekdays") return "每个工作日";
  if (rule.type === "weekly") {
    const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `每周 ${rule.weekdays?.map((day) => names[day]).join("、") || "未选择"}`;
  }
  if (rule.type === "monthly") return `每月 ${rule.monthlyDay ?? 1} 日`;
  if (rule.type === "interval") return `每隔 ${rule.intervalDays ?? 1} 天`;
  return "不重复";
};
