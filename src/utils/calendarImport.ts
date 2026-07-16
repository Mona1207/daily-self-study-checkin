import { Priority, StudyTask, Subject } from "../types/task";

export type ImportedCalendarTask = Omit<StudyTask, "id" | "createdAt" | "updatedAt" | "status" | "completed"> &
  Partial<Pick<StudyTask, "status" | "evidenceRequirement">>;

const unfoldIcs = (text: string): string[] => text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");

const cleanIcsValue = (value: string): string =>
  value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();

const dateFromIcs = (value: string): string | null => {
  const match = value.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
};

const inferPriority = (text: string): Priority => {
  if (/重要|紧急|高优先级|high/i.test(text)) return "high";
  if (/低优先级|不急|low/i.test(text)) return "low";
  return "medium";
};

const inferSubject = (text: string): Subject => {
  const subjects: Subject[] = ["语文", "数学", "英语", "物理", "化学", "地理", "历史", "生物", "政治", "运动"];
  return subjects.find((subject) => text.includes(subject)) ?? "其他";
};

export const parseIcsTasks = (content: string): ImportedCalendarTask[] => {
  const lines = unfoldIcs(content);
  const tasks: ImportedCalendarTask[] = [];
  let event: Record<string, string> | null = null;

  lines.forEach((line) => {
    if (line.trim() === "BEGIN:VEVENT") {
      event = {};
      return;
    }
    if (line.trim() === "END:VEVENT") {
      if (event) {
        const title = cleanIcsValue(event.SUMMARY ?? "");
        const date = dateFromIcs(event.DTSTART ?? event["DTSTART;VALUE=DATE"] ?? "");
        if (title && date) {
          const description = cleanIcsValue(event.DESCRIPTION ?? "");
          tasks.push({
            date,
            title,
            subject: inferSubject(`${title} ${description}`),
            description: description || undefined,
            priority: inferPriority(`${title} ${description}`),
            evidenceRequirement: "none",
          });
        }
      }
      event = null;
      return;
    }
    if (!event) return;
    const separator = line.indexOf(":");
    if (separator === -1) return;
    const rawKey = line.slice(0, separator);
    const value = line.slice(separator + 1);
    const key = rawKey.split(";")[0];
    if (key === "SUMMARY" || key === "DESCRIPTION" || key === "DTSTART") event[key] = value;
    if (rawKey === "DTSTART;VALUE=DATE") event[rawKey] = value;
  });

  return tasks;
};

export const parseCsvCalendarTasks = (content: string): ImportedCalendarTask[] => {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()))
    .filter(([date, title]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Boolean(title))
    .map(([date, title, subject, priority]) => ({
      date,
      title,
      subject: (subject || inferSubject(title)) as Subject,
      priority: priority === "high" || priority === "low" || priority === "medium" ? priority : inferPriority(title),
      evidenceRequirement: "none",
    }));
};

export const parseCalendarFile = async (file: File): Promise<ImportedCalendarTask[]> => {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith(".ics")) return parseIcsTasks(text);
  if (file.name.toLowerCase().endsWith(".csv")) return parseCsvCalendarTasks(text);
  throw new Error("只支持导入 .ics 日历文件，或 date,title,subject,priority 格式的 .csv 文件。");
};
