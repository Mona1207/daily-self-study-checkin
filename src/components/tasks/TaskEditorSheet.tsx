import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  Bell,
  CalendarDays,
  ChevronDown,
  Clock3,
  FileText,
  Flag,
  Folder,
  ListChecks,
  Repeat2,
  Timer,
  X,
} from "lucide-react";
import { EvidenceRequirement, Priority, RecurrenceType, StudyTask, SUBJECTS, Subject } from "../../types/task";

export type TaskEditorValue = Omit<StudyTask, "id" | "createdAt" | "updatedAt" | "status" | "completed"> &
  Partial<Pick<StudyTask, "status" | "evidenceRequirement">>;

interface TaskEditorSheetProps {
  open: boolean;
  mode?: "create" | "edit";
  task?: StudyTask;
  initialDate?: string;
  onClose: () => void;
  onCreate?: (task: TaskEditorValue) => void;
  onUpdate?: (task: StudyTask, patch: Partial<StudyTask>) => void;
  notify?: (type: "success" | "error" | "info", message: string) => void;
}

interface DraftState {
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  dueTime: string;
  subject: Subject;
  priority: Priority;
  estimatedMinutes: string;
  evidenceRequirement: EvidenceRequirement;
  reminderEnabled: boolean;
  reminderOffset: string;
  repeatType: RecurrenceType;
  subtasks: string;
  description: string;
}

const priorityLabels: Record<Priority, string> = {
  none: "无",
  low: "低",
  medium: "中",
  high: "高",
};

const repeatLabels: Record<RecurrenceType, string> = {
  none: "不重复",
  daily: "每天",
  weekdays: "工作日",
  weekly: "每周",
  monthly: "每月",
  interval: "自定义间隔",
};

const evidenceLabels: Record<EvidenceRequirement, string> = {
  none: "不填写",
  text: "文字",
  number: "数字",
  image: "图片",
  text_and_image: "文字和图片",
};

const makeDraft = (task?: StudyTask, initialDate?: string): DraftState => ({
  title: task?.title ?? "",
  date: task?.date ?? initialDate ?? new Date().toISOString().slice(0, 10),
  allDay: task?.allDay ?? (!task?.startTime && !task?.dueTime),
  startTime: task?.startTime ?? "",
  dueTime: task?.dueTime ?? "",
  subject: task?.subject ?? "工作",
  priority: task?.priority ?? "medium",
  estimatedMinutes: task?.estimatedMinutes?.toString() ?? "",
  evidenceRequirement: task?.evidenceRequirement ?? "none",
  reminderEnabled: task?.reminder?.enabled ?? false,
  reminderOffset: String(task?.reminder?.offsetMinutes ?? 15),
  repeatType: task?.repeatRule?.type ?? "none",
  subtasks: task?.subtasks?.map((item) => `${item.completed ? "[x]" : "[ ]"} ${item.title}`).join("\n") ?? "",
  description: task?.description ?? "",
});

const parseSubtasks = (value: string, oldTask?: StudyTask) => {
  const oldByTitle = new Map((oldTask?.subtasks ?? []).map((item) => [item.title, item]));
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const completed = /^\[x\]/i.test(line);
      const title = line.replace(/^\[(x| )\]\s*/i, "").trim();
      const old = oldByTitle.get(title);
      return { id: old?.id ?? crypto.randomUUID(), title, completed: old?.completed ?? completed };
    })
    .filter((item) => item.title);
};

function FieldRow({
  icon,
  label,
  value,
  children,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <label className="relative flex min-h-12 items-center gap-3 border-b border-[var(--color-border)] px-3 last:border-b-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]">{icon}</span>
      <span className="min-w-0 flex-1 text-[15px] font-medium text-[var(--color-text)]">{label}</span>
      <span className="flex max-w-[52%] items-center gap-1 text-right text-[14px] text-[var(--color-text-secondary)]">
        <span className="truncate">{value}</span>
        <ChevronDown size={15} />
      </span>
      {children}
    </label>
  );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-[13px] font-medium text-[var(--color-text-secondary)]">{title}</h3>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">{children}</div>
    </section>
  );
}

const pickerClass = "absolute inset-0 h-full w-full cursor-pointer opacity-0";

export function TaskEditorSheet({ open, mode = "create", task, initialDate, onClose, onCreate, onUpdate, notify }: TaskEditorSheetProps) {
  const initialDraft = useMemo(() => makeDraft(task, initialDate), [initialDate, task]);
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(Boolean(task?.description));
  const [subtasksOpen, setSubtasksOpen] = useState(Boolean(task?.subtasks?.length));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft);
    setMoreOpen(false);
    setNotesOpen(Boolean(task?.description));
    setSubtasksOpen(Boolean(task?.subtasks?.length));
    setSaving(false);
  }, [initialDraft, open, task?.description, task?.subtasks?.length]);

  if (!open) return null;

  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const hasContent = Boolean(draft.title.trim() || draft.description.trim() || draft.subtasks.trim());

  const requestClose = () => {
    if ((dirty || hasContent) && !saving && !window.confirm("已填写的内容还没有保存，确定关闭吗？")) return;
    onClose();
  };

  const updateDraft = (patch: Partial<DraftState>) => setDraft((current) => ({ ...current, ...patch }));

  const buildPatch = () => {
    const subtasks = parseSubtasks(draft.subtasks, task);
    return {
      title: draft.title.trim(),
      date: draft.date,
      allDay: draft.allDay,
      startTime: draft.allDay ? undefined : draft.startTime || undefined,
      dueTime: draft.allDay ? undefined : draft.dueTime || undefined,
      subject: draft.subject,
      priority: draft.priority,
      estimatedMinutes: draft.estimatedMinutes ? Number(draft.estimatedMinutes) : undefined,
      evidenceRequirement: draft.evidenceRequirement,
      reminder: draft.reminderEnabled ? { enabled: true, type: draft.dueTime ? "due" as const : "start" as const, offsetMinutes: Number(draft.reminderOffset) || 15 } : undefined,
      repeatRule: draft.repeatType === "none" ? undefined : { type: draft.repeatType, startDate: draft.date },
      subtasks,
      description: draft.description.trim() || undefined,
      sortOrder: task?.sortOrder ?? Date.now(),
      postponeHistory: task?.postponeHistory ?? [],
    };
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!draft.title.trim()) {
      notify?.("error", "请输入任务名称。");
      return;
    }
    setSaving(true);
    const patch = buildPatch();
    if (task && mode === "edit") onUpdate?.(task, patch);
    else onCreate?.(patch);
    notify?.("success", mode === "edit" ? "任务已更新。" : "任务已添加。");
    setSaving(false);
    onClose();
  };

  const title = mode === "edit" ? "编辑任务" : "添加任务";
  const dateValue = draft.date;
  const startValue = draft.allDay || !draft.startTime ? "未设置" : draft.startTime;
  const dueValue = draft.allDay || !draft.dueTime ? "未设置" : draft.dueTime;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35" role="dialog" aria-modal="true" onMouseDown={requestClose}>
      <form
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-[20px] bg-[var(--color-page)] shadow-[var(--shadow-float)]"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--color-border)]" />
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4">
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]" onClick={requestClose} aria-label="关闭">
            <X size={20} />
          </button>
          <h2 className="text-[17px] font-semibold text-[var(--color-text)]">{title}</h2>
          <button
            type="submit"
            className="min-h-10 rounded-[10px] px-3 text-[15px] font-medium text-[var(--color-brand)] disabled:text-[var(--color-text-muted)]"
            disabled={!draft.title.trim() || saving}
          >
            {saving ? "保存中" : "保存"}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-5">
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <input
                autoFocus
                className="min-h-14 w-full bg-transparent text-[20px] font-semibold leading-7 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="写下要完成的事"
                aria-label="任务名称"
              />
              <div className="border-t border-[var(--color-border)]">
                <FieldRow icon={<CalendarDays size={18} />} label="日期" value={dateValue}>
                  <input className={pickerClass} type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} />
                </FieldRow>
              </div>
            </section>

            <SectionBlock title="基础设置">
              <FieldRow icon={<Folder size={18} />} label="分类" value={draft.subject}>
                <select className={pickerClass} value={draft.subject} onChange={(event) => updateDraft({ subject: event.target.value as Subject })}>
                  {SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </FieldRow>
              <FieldRow icon={<Flag size={18} />} label="优先级" value={priorityLabels[draft.priority]}>
                <select className={pickerClass} value={draft.priority} onChange={(event) => updateDraft({ priority: event.target.value as Priority })}>
                  {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FieldRow>
            </SectionBlock>

            <SectionBlock title="时间安排">
              <label className="flex min-h-12 items-center gap-3 border-b border-[var(--color-border)] px-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]"><Clock3 size={18} /></span>
                <span className="min-w-0 flex-1 text-[15px] font-medium text-[var(--color-text)]">全天任务</span>
                <input className="accent-[var(--color-brand)]" type="checkbox" checked={draft.allDay} onChange={(event) => updateDraft({ allDay: event.target.checked })} />
              </label>
              <FieldRow icon={<Clock3 size={18} />} label="开始时间" value={startValue}>
                <input className={pickerClass} type="time" value={draft.startTime} disabled={draft.allDay} onChange={(event) => updateDraft({ startTime: event.target.value, allDay: false })} />
              </FieldRow>
              <FieldRow icon={<AlarmClock size={18} />} label="截止时间" value={dueValue}>
                <input className={pickerClass} type="time" value={draft.dueTime} disabled={draft.allDay} onChange={(event) => updateDraft({ dueTime: event.target.value, allDay: false })} />
              </FieldRow>
              <FieldRow icon={<Timer size={18} />} label="预计时长" value={draft.estimatedMinutes ? `${draft.estimatedMinutes} 分钟` : "未设置"}>
                <input className={pickerClass} type="number" min="0" value={draft.estimatedMinutes} onChange={(event) => updateDraft({ estimatedMinutes: event.target.value })} />
              </FieldRow>
            </SectionBlock>

            <section>
              <button type="button" className="flex min-h-11 w-full items-center justify-between px-1 text-left" onClick={() => setMoreOpen((value) => !value)}>
                <span>
                  <span className="block text-[17px] font-semibold text-[var(--color-text)]">更多设置</span>
                  <span className="mt-0.5 block text-[13px] text-[var(--color-text-secondary)]">提醒、重复、子任务和备注</span>
                </span>
                <ChevronDown className={`text-[var(--color-text-muted)] transition-transform ${moreOpen ? "rotate-180" : ""}`} size={18} />
              </button>
              {moreOpen && (
                <div className="mt-2 space-y-4">
                  <SectionBlock title="提醒与重复">
                    <label className="flex min-h-12 items-center gap-3 border-b border-[var(--color-border)] px-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]"><Bell size={18} /></span>
                      <span className="min-w-0 flex-1 text-[15px] font-medium text-[var(--color-text)]">提醒</span>
                      <input className="accent-[var(--color-brand)]" type="checkbox" checked={draft.reminderEnabled} onChange={(event) => updateDraft({ reminderEnabled: event.target.checked })} />
                    </label>
                    <FieldRow icon={<Bell size={18} />} label="提前提醒" value={`${draft.reminderOffset} 分钟`}>
                      <select className={pickerClass} value={draft.reminderOffset} disabled={!draft.reminderEnabled} onChange={(event) => updateDraft({ reminderOffset: event.target.value })}>
                        <option value="5">5 分钟</option>
                        <option value="15">15 分钟</option>
                        <option value="30">30 分钟</option>
                        <option value="60">1 小时</option>
                        <option value="1440">1 天</option>
                      </select>
                    </FieldRow>
                    <FieldRow icon={<Repeat2 size={18} />} label="重复" value={repeatLabels[draft.repeatType]}>
                      <select className={pickerClass} value={draft.repeatType} onChange={(event) => updateDraft({ repeatType: event.target.value as RecurrenceType })}>
                        {Object.entries(repeatLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </FieldRow>
                    <FieldRow icon={<FileText size={18} />} label="完成记录" value={evidenceLabels[draft.evidenceRequirement]}>
                      <select className={pickerClass} value={draft.evidenceRequirement} onChange={(event) => updateDraft({ evidenceRequirement: event.target.value as EvidenceRequirement })}>
                        {Object.entries(evidenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </FieldRow>
                  </SectionBlock>

                  <SectionBlock title="内容">
                    <button type="button" className="flex min-h-12 w-full items-center gap-3 border-b border-[var(--color-border)] px-3 text-left" onClick={() => setSubtasksOpen((value) => !value)}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]"><ListChecks size={18} /></span>
                      <span className="min-w-0 flex-1 text-[15px] font-medium text-[var(--color-text)]">子任务</span>
                      <span className="text-[14px] text-[var(--color-text-secondary)]">{parseSubtasks(draft.subtasks, task).length || "未添加"}</span>
                      <ChevronDown className={`text-[var(--color-text-muted)] transition-transform ${subtasksOpen ? "rotate-180" : ""}`} size={15} />
                    </button>
                    {subtasksOpen && (
                      <textarea
                        className="min-h-24 w-full resize-none border-b border-[var(--color-border)] bg-transparent px-3 py-3 text-[15px] leading-[22px] outline-none placeholder:text-[var(--color-text-muted)]"
                        value={draft.subtasks}
                        onChange={(event) => updateDraft({ subtasks: event.target.value })}
                        placeholder="每行一个子任务"
                      />
                    )}
                    <button type="button" className="flex min-h-12 w-full items-center gap-3 px-3 text-left" onClick={() => setNotesOpen((value) => !value)}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]"><FileText size={18} /></span>
                      <span className="min-w-0 flex-1 text-[15px] font-medium text-[var(--color-text)]">备注</span>
                      <span className="max-w-[42%] truncate text-[14px] text-[var(--color-text-secondary)]">{draft.description || "未填写"}</span>
                      <ChevronDown className={`text-[var(--color-text-muted)] transition-transform ${notesOpen ? "rotate-180" : ""}`} size={15} />
                    </button>
                    {notesOpen && (
                      <textarea
                        className="min-h-24 w-full resize-none bg-transparent px-3 pb-3 text-[15px] leading-[22px] outline-none placeholder:text-[var(--color-text-muted)]"
                        value={draft.description}
                        onChange={(event) => updateDraft({ description: event.target.value })}
                        placeholder="补充说明、链接或注意事项"
                      />
                    )}
                  </SectionBlock>
                </div>
              )}
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
