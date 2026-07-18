import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
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

function OptionGrid<T extends string>({
  value,
  options,
  onChange,
  columns = "grid-cols-2 sm:grid-cols-3",
  disabled,
}: {
  value: T;
  options: Array<{ value: T; label: string; helper?: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
  columns?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`min-h-12 rounded-[10px] border px-3 py-2 text-left transition ${
              active
                ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)] hover:border-[var(--color-brand)]"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <span className="flex items-center gap-2 text-[14px] font-semibold">
              {option.icon}
              {option.label}
            </span>
            {option.helper ? <span className="mt-0.5 block text-[12px] leading-4 text-[var(--color-text-secondary)]">{option.helper}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 text-[14px] text-[var(--color-text)] outline-none transition focus:border-[var(--color-brand)] focus:bg-[var(--color-surface)]";

type SettingPanel = "date" | "time" | "subject" | "priority" | "duration" | "reminder" | "repeat" | "evidence" | "content";

export function TaskEditorSheet({ open, mode = "create", task, initialDate, onClose, onCreate, onUpdate, notify }: TaskEditorSheetProps) {
  const initialDraft = useMemo(() => makeDraft(task, initialDate), [initialDate, task]);
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [activeSetting, setActiveSetting] = useState<SettingPanel | null>(null);
  const [saving, setSaving] = useState(false);
  const historyIdRef = useRef<string | null>(null);
  const ignoreNextPopRef = useRef(false);
  const closeStateRef = useRef({ dirty: false, hasContent: false, saving: false });

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft);
    setActiveSetting(null);
    setSaving(false);
  }, [initialDraft, open]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const hasContent = Boolean(draft.title.trim() || draft.description.trim() || draft.subtasks.trim());
  closeStateRef.current = { dirty, hasContent, saving };

  const closeSheet = () => {
    if (historyIdRef.current && window.history.state?.taskEditorSheetId === historyIdRef.current) {
      ignoreNextPopRef.current = true;
      window.history.back();
    }
    historyIdRef.current = null;
    onClose();
  };

  const requestClose = () => {
    if ((dirty || hasContent) && !saving && !window.confirm("已填写的内容还没有保存，确定关闭吗？")) return;
    closeSheet();
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
    closeSheet();
  };

  const title = mode === "edit" ? "编辑任务" : "添加任务";
  const dateValue = draft.date;
  const startValue = draft.allDay || !draft.startTime ? "未设置" : draft.startTime;
  const dueValue = draft.allDay || !draft.dueTime ? "未设置" : draft.dueTime;
  const subtaskCount = parseSubtasks(draft.subtasks, task).length;
  const timeSummary = draft.allDay ? "全天" : [draft.startTime, draft.dueTime].filter(Boolean).join(" - ") || "未设置";
  const contentSummary = `${subtaskCount ? `${subtaskCount} 个子任务` : "无子任务"}${draft.description ? " · 有备注" : ""}`;

  const settingCards: Array<{ key: SettingPanel; label: string; value: string; icon: ReactNode }> = [
    { key: "date", label: "日期", value: draft.date, icon: <CalendarDays size={18} /> },
    { key: "time", label: "时间", value: timeSummary, icon: <Clock3 size={18} /> },
    { key: "subject", label: "分类", value: draft.subject, icon: <Folder size={18} /> },
    { key: "priority", label: "优先级", value: priorityLabels[draft.priority], icon: <Flag size={18} /> },
    { key: "duration", label: "预计时长", value: draft.estimatedMinutes ? `${draft.estimatedMinutes} 分钟` : "未设置", icon: <Timer size={18} /> },
    { key: "reminder", label: "提醒", value: draft.reminderEnabled ? `提前 ${draft.reminderOffset} 分钟` : "关闭", icon: <Bell size={18} /> },
    { key: "repeat", label: "重复", value: repeatLabels[draft.repeatType], icon: <Repeat2 size={18} /> },
    { key: "evidence", label: "完成记录", value: evidenceLabels[draft.evidenceRequirement], icon: <FileText size={18} /> },
    { key: "content", label: "内容", value: contentSummary, icon: <ListChecks size={18} /> },
  ];

  const renderSettingPanel = () => {
    if (!activeSetting) return null;
    return (
      <section className="soft-card rounded-[16px] p-3">
        {activeSetting === "date" && (
          <label className="block text-[13px] font-bold text-[var(--color-text-secondary)]">
            日期
            <input className={`${inputClass} mt-2`} type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} />
          </label>
        )}
        {activeSetting === "time" && (
          <div className="space-y-3">
            <button
              type="button"
              className={`flex min-h-11 w-full items-center justify-between rounded-[10px] border px-3 text-left transition ${
                draft.allDay ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]" : "border-[var(--color-border)] bg-[var(--color-surface-muted)]"
              }`}
              onClick={() => updateDraft({ allDay: !draft.allDay })}
            >
              <span className="flex items-center gap-2 text-[14px] font-semibold"><Clock3 size={17} />全天任务</span>
              <span className={`h-6 w-11 rounded-full p-0.5 transition ${draft.allDay ? "bg-[var(--color-brand)]" : "bg-[var(--color-border)]"}`}>
                <span className={`block h-5 w-5 rounded-full bg-white transition ${draft.allDay ? "translate-x-5" : ""}`} />
              </span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[13px] font-bold text-[var(--color-text-secondary)]">开始<input className={`${inputClass} mt-2`} type="time" value={draft.startTime} disabled={draft.allDay} onChange={(event) => updateDraft({ startTime: event.target.value, allDay: false })} placeholder={startValue} /></label>
              <label className="text-[13px] font-bold text-[var(--color-text-secondary)]">截止<input className={`${inputClass} mt-2`} type="time" value={draft.dueTime} disabled={draft.allDay} onChange={(event) => updateDraft({ dueTime: event.target.value, allDay: false })} placeholder={dueValue} /></label>
            </div>
          </div>
        )}
        {activeSetting === "subject" && <OptionGrid value={draft.subject} options={SUBJECTS.map((subject) => ({ value: subject, label: subject }))} onChange={(subject) => updateDraft({ subject })} columns="grid-cols-3" />}
        {activeSetting === "priority" && (
          <OptionGrid
            value={draft.priority}
            options={[
              { value: "none", label: priorityLabels.none, helper: "不标记" },
              { value: "low", label: priorityLabels.low, helper: "轻松处理" },
              { value: "medium", label: priorityLabels.medium, helper: "正常推进" },
              { value: "high", label: priorityLabels.high, helper: "优先完成" },
            ]}
            onChange={(priority) => updateDraft({ priority })}
            columns="grid-cols-2"
          />
        )}
        {activeSetting === "duration" && (
          <label className="block text-[13px] font-bold text-[var(--color-text-secondary)]">
            预计时长
            <input className={`${inputClass} mt-2`} type="number" min="0" value={draft.estimatedMinutes} onChange={(event) => updateDraft({ estimatedMinutes: event.target.value })} placeholder="分钟" />
          </label>
        )}
        {activeSetting === "reminder" && (
          <div className="space-y-3">
            <button
              type="button"
              className={`flex min-h-11 w-full items-center justify-between rounded-[10px] border px-3 text-left transition ${
                draft.reminderEnabled ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]" : "border-[var(--color-border)] bg-[var(--color-surface-muted)]"
              }`}
              onClick={() => updateDraft({ reminderEnabled: !draft.reminderEnabled })}
            >
              <span className="flex items-center gap-2 text-[14px] font-semibold"><Bell size={17} />提醒</span>
              <span className={`h-6 w-11 rounded-full p-0.5 transition ${draft.reminderEnabled ? "bg-[var(--color-brand)]" : "bg-[var(--color-border)]"}`}>
                <span className={`block h-5 w-5 rounded-full bg-white transition ${draft.reminderEnabled ? "translate-x-5" : ""}`} />
              </span>
            </button>
            <OptionGrid
              value={draft.reminderOffset}
              disabled={!draft.reminderEnabled}
              options={[
                { value: "5", label: "5 分钟" },
                { value: "15", label: "15 分钟" },
                { value: "30", label: "30 分钟" },
                { value: "60", label: "1 小时" },
                { value: "1440", label: "1 天" },
              ]}
              onChange={(reminderOffset) => updateDraft({ reminderOffset })}
              columns="grid-cols-2"
            />
          </div>
        )}
        {activeSetting === "repeat" && <OptionGrid value={draft.repeatType} options={Object.entries(repeatLabels).map(([value, label]) => ({ value: value as RecurrenceType, label }))} onChange={(repeatType) => updateDraft({ repeatType })} columns="grid-cols-2" />}
        {activeSetting === "evidence" && <OptionGrid value={draft.evidenceRequirement} options={Object.entries(evidenceLabels).map(([value, label]) => ({ value: value as EvidenceRequirement, label }))} onChange={(evidenceRequirement) => updateDraft({ evidenceRequirement })} columns="grid-cols-2" />}
        {activeSetting === "content" && (
          <div className="space-y-3">
            <label className="block text-[13px] font-bold text-[var(--color-text-secondary)]">
              子任务
              <textarea className="mt-2 min-h-24 w-full resize-none rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-3 text-[14px] leading-[22px] outline-none focus:border-[var(--color-brand)]" value={draft.subtasks} onChange={(event) => updateDraft({ subtasks: event.target.value })} placeholder="每行一个子任务" />
            </label>
            <label className="block text-[13px] font-bold text-[var(--color-text-secondary)]">
              备注
              <textarea className="mt-2 min-h-24 w-full resize-none rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-3 text-[14px] leading-[22px] outline-none focus:border-[var(--color-brand)]" value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} placeholder="补充说明、链接或注意事项" />
            </label>
          </div>
        )}
      </section>
    );
  };

  useEffect(() => {
    if (!open || historyIdRef.current) return;
    const id = crypto.randomUUID();
    historyIdRef.current = id;
    window.history.pushState({ ...(window.history.state ?? {}), taskEditorSheetId: id }, "");

    const handlePopState = () => {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }
      historyIdRef.current = null;
      const closeState = closeStateRef.current;
      if ((closeState.dirty || closeState.hasContent) && !closeState.saving && !window.confirm("已填写的内容还没有保存，确定关闭吗？")) {
        historyIdRef.current = id;
        window.history.pushState({ ...(window.history.state ?? {}), taskEditorSheetId: id }, "");
        return;
      }
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={requestClose}>
      <form
        className="flex max-h-[100dvh] min-h-[100dvh] w-full max-w-[410px] flex-col bg-[var(--color-page)] shadow-[var(--shadow-float)] sm:max-h-[92dvh] sm:min-h-0 sm:rounded-[24px]"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="morning-illustration shrink-0 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
          <div className="relative z-10 flex h-12 items-center justify-between gap-3">
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[var(--color-text)] hover:bg-white/60 dark:hover:bg-white/10" onClick={requestClose} aria-label="关闭">
            <X size={20} />
          </button>
          <h2 className="text-[21px] font-black text-[var(--color-text)]">{title}</h2>
          <button
            type="submit"
            className="min-h-10 rounded-[12px] px-3 text-[15px] font-bold text-[var(--color-brand)] disabled:text-[var(--color-text-muted)]"
            disabled={!draft.title.trim() || saving}
          >
            {saving ? "保存中" : "保存"}
          </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-4">
            <section className="soft-card rounded-[16px] px-3 py-3">
              <input
                autoFocus
                className="min-h-14 w-full bg-transparent text-[20px] font-semibold leading-7 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="写下要完成的事"
                aria-label="任务名称"
              />
            </section>

            <section>
              <h3 className="mb-2 px-1 text-[13px] font-bold text-[var(--color-text-secondary)]">任务设置</h3>
              <div className="grid grid-cols-2 gap-2">
                {settingCards.map((item) => {
                  const active = activeSetting === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`min-h-[74px] rounded-[14px] border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
                      }`}
                      onClick={() => setActiveSetting(active ? null : item.key)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[var(--color-brand)]">{item.icon}</span>
                        <ChevronDown className={`text-[var(--color-text-muted)] transition-transform ${active ? "rotate-180" : ""}`} size={15} />
                      </span>
                      <span className="mt-2 block text-[14px] font-bold">{item.label}</span>
                      <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">{item.value}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {renderSettingPanel()}
          </div>
        </div>
        <div className="shrink-0 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-2">
          <button
            type="submit"
            className="flex min-h-[52px] w-full items-center justify-center rounded-[16px] bg-[image:var(--brand-gradient)] text-[17px] font-black text-white shadow-[var(--brand-shadow)] disabled:opacity-50"
            disabled={!draft.title.trim() || saving}
          >
            {saving ? "保存中" : "保存任务"}
          </button>
        </div>
      </form>
    </div>
  );
}
