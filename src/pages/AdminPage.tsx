import { ChangeEvent, FormEvent, ReactNode, useMemo, useRef, useState } from "react";
import { CalendarPlus, ChevronDown, ChevronUp, Copy, Download, Edit3, FileArchive, FileJson, LockKeyhole, Plus, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import {
  AppDatabase,
  AppSettings,
  EVIDENCE_LABEL,
  EvidenceRequirement,
  Priority,
  RecurringTaskTemplate,
  RecurrenceType,
  StudyTask,
  Subject,
  SUBJECTS,
} from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Modal } from "../components/common/Modal";
import { getTodayString } from "../utils/date";
import { buildExportData, buildTemplateData, downloadJson, readJsonFile } from "../utils/importExport";
import { hashPassword } from "../utils/migrations";
import { recurrenceLabel } from "../utils/recurrence";
import { clearSnapshots, getSnapshots, importDatabase, restoreSnapshot, validateExportData } from "../utils/storage";
import { exportFullBackupZip, readFullBackupZip, restoreBackupImages } from "../utils/backup";
import { parseCalendarFile } from "../utils/calendarImport";
import { sortTasks } from "../utils/taskSort";

type Notify = (type: "success" | "error" | "info", message: string) => void;
type AdminTab = "dashboard" | "tasks" | "recurring" | "records" | "evidence" | "data" | "settings";

interface AdminPageProps {
  database: AppDatabase;
  settings: AppSettings;
  onAddTask: (task: TaskInput) => void;
  onAddTasks: (tasks: TaskInput[]) => number;
  onUpdateTask: (taskId: string, patch: Partial<StudyTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onCopyDay: (fromDate: string, toDate: string) => number;
  onReplaceTasks: (tasks: StudyTask[]) => void;
  onMergeTasks: (tasks: StudyTask[]) => number;
  onSaveTemplate: (template: RecurringTaskTemplate) => void;
  onDeleteTemplate: (templateId: string, deleteFuture: boolean) => void;
  onGenerateRecurring: () => number;
  onReplaceDatabase: (database: AppDatabase) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  notify: Notify;
}

type TaskInput = Omit<StudyTask, "id" | "createdAt" | "updatedAt" | "status" | "completed" | "actualSeconds"> &
  Partial<Pick<StudyTask, "status" | "actualSeconds" | "evidenceRequirement">>;

interface TaskDraft {
  date: string;
  title: string;
  subject: Subject;
  description: string;
  estimatedMinutes: string;
  priority: Priority;
  evidenceRequirement: EvidenceRequirement;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-500/20";

const priorities: Array<{ value: Priority; label: string }> = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

const recurrenceTypes: Array<{ value: RecurrenceType; label: string }> = [
  { value: "none", label: "不重复" },
  { value: "daily", label: "每天重复" },
  { value: "weekdays", label: "每个工作日" },
  { value: "weekly", label: "每周指定星期" },
  { value: "monthly", label: "每月指定日期" },
  { value: "interval", label: "自定义间隔天数" },
];

const emptyDraft = (date = getTodayString()): TaskDraft => ({
  date,
  title: "",
  subject: "数学",
  description: "",
  estimatedMinutes: "30",
  priority: "medium",
  evidenceRequirement: "none",
});

const draftToTask = (draft: TaskDraft): TaskInput => ({
  date: draft.date,
  title: draft.title.trim(),
  subject: draft.subject,
  description: draft.description.trim() || undefined,
  estimatedMinutes: draft.estimatedMinutes === "" ? undefined : Number(draft.estimatedMinutes),
  priority: draft.priority,
  evidenceRequirement: draft.evidenceRequirement,
});

const validateDraft = (draft: TaskDraft): string | null => {
  if (!draft.date) return "日期不能为空。";
  if (!draft.title.trim()) return "任务标题不能为空。";
  if (draft.estimatedMinutes !== "" && Number(draft.estimatedMinutes) < 0) return "预计时间不能为负数。";
  return null;
};

function DraftFields({ draft, onChange }: { draft: TaskDraft; onChange: (draft: TaskDraft) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">日期<input className={`${inputClass} mt-1`} type="date" value={draft.date} onChange={(e) => onChange({ ...draft, date: e.target.value })} /></label>
      <label className="text-sm font-semibold">科目<select className={`${inputClass} mt-1`} value={draft.subject} onChange={(e) => onChange({ ...draft, subject: e.target.value as Subject })}>{SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
      <label className="text-sm font-semibold sm:col-span-2">任务标题<input className={`${inputClass} mt-1`} value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} placeholder="例如：完成函数练习 10 题" /></label>
      <label className="text-sm font-semibold sm:col-span-2">详细说明<textarea className={`${inputClass} mt-1 min-h-24`} value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} /></label>
      <label className="text-sm font-semibold">预计学习分钟数<input className={`${inputClass} mt-1`} type="number" min="0" value={draft.estimatedMinutes} onChange={(e) => onChange({ ...draft, estimatedMinutes: e.target.value })} /></label>
      <label className="text-sm font-semibold">优先级<select className={`${inputClass} mt-1`} value={draft.priority} onChange={(e) => onChange({ ...draft, priority: e.target.value as Priority })}>{priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select></label>
      <label className="text-sm font-semibold sm:col-span-2">完成证明要求<select className={`${inputClass} mt-1`} value={draft.evidenceRequirement} onChange={(e) => onChange({ ...draft, evidenceRequirement: e.target.value as EvidenceRequirement })}>{Object.entries(EVIDENCE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
  );
}

function CollapsibleAdminCard({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={onToggle}>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {open ? <ChevronUp className="shrink-0 text-slate-400" size={22} /> : <ChevronDown className="shrink-0 text-slate-400" size={22} />}
      </button>
      {open && <div className="mt-5">{children}</div>}
    </Card>
  );
}

const templateToDraft = (template?: RecurringTaskTemplate): RecurringTaskTemplate => {
  const now = new Date().toISOString();
  return template ?? {
    id: crypto.randomUUID(),
    title: "",
    subject: "数学",
    description: "",
    estimatedMinutes: 30,
    priority: "medium",
    evidenceRequirement: "none",
    recurrence: { type: "weekdays", startDate: getTodayString(), weekdays: [1, 2, 3, 4, 5], intervalDays: 1, monthlyDay: 1 },
    enabled: true,
    autoGenerate: true,
    createdAt: now,
    updatedAt: now,
  };
};

export function AdminPage({
  database,
  settings,
  onAddTask,
  onAddTasks,
  onUpdateTask,
  onDeleteTask,
  onCopyDay,
  onReplaceTasks,
  onMergeTasks,
  onSaveTemplate,
  onDeleteTemplate,
  onGenerateRecurring,
  onReplaceDatabase,
  onUpdateSettings,
  notify,
}: AdminPageProps) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("self-study-admin-unlocked") === "1" && !settings.requireAdminPasswordEverySession);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<AdminTab>("tasks");
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft());
  const [batchRows, setBatchRows] = useState<TaskDraft[]>([emptyDraft()]);
  const [editing, setEditing] = useState<StudyTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudyTask | null>(null);
  const [copyFrom, setCopyFrom] = useState(getTodayString());
  const [copyTo, setCopyTo] = useState(getTodayString());
  const [templateDraft, setTemplateDraft] = useState<RecurringTaskTemplate>(templateToDraft());
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<RecurringTaskTemplate | null>(null);
  const [pendingImport, setPendingImport] = useState<unknown | null>(null);
  const [settingsDraft, setSettingsDraft] = useState(settings);
  const [openTaskSections, setOpenTaskSections] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLInputElement>(null);

  const selectedTasks = useMemo(() => sortTasks(database.tasks.filter((task) => task.date === selectedDate)), [selectedDate, database.tasks]);
  const completedCount = database.tasks.filter((task) => task.status === "completed").length;
  const evidenceTasks = database.tasks.filter((task) => task.evidenceRequirement !== "none");
  const snapshots = getSnapshots();

  const toggleTaskSection = (key: string) => {
    setOpenTaskSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    if (hashPassword(password) === settings.adminPasswordHash) {
      setUnlocked(true);
      sessionStorage.setItem("self-study-admin-unlocked", "1");
      notify("success", "已进入任务添加页面。");
    } else {
      notify("error", "管理密码不正确。");
    }
  };

  const submitSingle = (event: FormEvent) => {
    event.preventDefault();
    const error = validateDraft(draft);
    if (error) return notify("error", error);
    onAddTask(draftToTask(draft));
    notify("success", "任务添加成功。");
    setDraft(emptyDraft(draft.date));
  };

  const submitBatch = () => {
    for (const row of batchRows) {
      const error = validateDraft(row);
      if (error) return notify("error", `批量任务中存在错误：${error}`);
    }
    const count = onAddTasks(batchRows.map(draftToTask));
    notify("success", `已批量添加 ${count} 个任务。`);
    setBatchRows([emptyDraft(selectedDate)]);
  };

  const saveEditing = () => {
    if (!editing) return;
    if (!editing.title.trim()) return notify("error", "任务标题不能为空。");
    onUpdateTask(editing.id, editing);
    setEditing(null);
    notify("success", "任务已更新。");
  };

  const exportAll = () => {
    downloadJson(buildExportData(database), `study-data-${getTodayString()}.json`);
    notify("success", "JSON 数据已导出。");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const json = await readJsonFile(file);
      validateExportData(json);
      setPendingImport(json);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "导入失败。");
    } finally {
      event.target.value = "";
    }
  };

  const finishImport = (mode: "replace" | "merge") => {
    if (!pendingImport) return;
    try {
      const result = importDatabase(pendingImport, mode);
      onReplaceDatabase(result.database);
      notify("success", `导入完成：成功 ${result.imported}，跳过 ${result.skipped}，错误 ${result.errors}。`);
      setPendingImport(null);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "导入失败，现有数据未覆盖。");
    }
  };

  const handleZipImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { data, images } = await readFullBackupZip(file);
      const result = importDatabase(data, "replace");
      await restoreBackupImages(images);
      onReplaceDatabase(result.database);
      notify("success", `完整备份已导入，恢复 ${images.length} 张图片。`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "完整备份导入失败。");
    } finally {
      event.target.value = "";
    }
  };

  const handleCalendarImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const importedTasks = await parseCalendarFile(file);
      if (importedTasks.length === 0) return notify("info", "这个日历文件里没有识别到可导入的任务。");
      const count = onAddTasks(importedTasks);
      notify("success", `已从日历文件导入 ${count} 个任务。`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "日历文件导入失败。");
    } finally {
      event.target.value = "";
    }
  };

  if (!unlocked) {
    return (
      <Card className="mx-auto mt-12 max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15"><LockKeyhole size={28} /></div>
        <h1 className="mt-5 text-center text-2xl font-black">自己添加任务或导入日历文件</h1>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">请输入本地管理密码。默认密码为 123456。本地密码只用于防误操作，不提供真正的安全保护。</p>
        <form className="mt-6 space-y-4" onSubmit={submitPassword}>
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="管理密码" />
          <Button className="w-full" icon={<LockKeyhole size={18} />}>进入管理</Button>
        </form>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">任务添加</p>
          <h1 className="mt-1 text-3xl font-black">自己添加任务或导入日历文件</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={() => notify("success", `已生成 ${onGenerateRecurring()} 个周期任务实例。`)}>生成周期任务</Button>
          <Button variant="ghost" onClick={() => { setUnlocked(false); sessionStorage.removeItem("self-study-admin-unlocked"); }}>退出管理</Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ["dashboard", "管理首页"],
          ["tasks", "自己添加任务"],
          ["recurring", "周期任务"],
          ["records", "学习记录"],
          ["evidence", "完成证明"],
          ["data", "数据管理"],
          ["settings", "系统设置"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as AdminTab)} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold ${tab === key ? "bg-indigo-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><p className="text-sm text-slate-500">总任务</p><p className="mt-2 text-3xl font-black">{database.tasks.length}</p></Card>
          <Card><p className="text-sm text-slate-500">已完成</p><p className="mt-2 text-3xl font-black text-emerald-600">{completedCount}</p></Card>
          <Card><p className="text-sm text-slate-500">周期模板</p><p className="mt-2 text-3xl font-black">{database.recurringTemplates.length}</p></Card>
          <Card><p className="text-sm text-slate-500">完成证明</p><p className="mt-2 text-3xl font-black">{database.evidences.length}</p></Card>
        </section>
      )}

      {tab === "tasks" && (
        <div className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-2">
            <CollapsibleAdminCard
              title="添加单个任务"
              description="自己选择某一天、任务内容和重要程度。"
              open={Boolean(openTaskSections.single)}
              onToggle={() => toggleTaskSection("single")}
            >
              <form className="space-y-5" onSubmit={submitSingle}>
                <DraftFields draft={draft} onChange={setDraft} />
                <Button icon={<Plus size={18} />}>保存任务</Button>
              </form>
            </CollapsibleAdminCard>
            <CollapsibleAdminCard
              title="导入日历文件"
              description="导入 .ics 日历文件，或 CSV：date,title,subject,priority。"
              open={Boolean(openTaskSections.calendar)}
              onToggle={() => toggleTaskSection("calendar")}
            >
              <div className="flex flex-wrap gap-2">
                <Button icon={<CalendarPlus size={18} />} onClick={() => calendarRef.current?.click()}>导入日历文件</Button>
                <input ref={calendarRef} type="file" accept=".ics,text/calendar,.csv,text/csv" className="hidden" onChange={handleCalendarImport} />
              </div>
              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                <h3 className="font-bold">复制某一天任务</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold">来源日期<input className={`${inputClass} mt-1`} type="date" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} /></label>
                  <label className="text-sm font-semibold">目标日期<input className={`${inputClass} mt-1`} type="date" value={copyTo} onChange={(e) => setCopyTo(e.target.value)} /></label>
                </div>
                <Button className="mt-5" variant="secondary" icon={<Copy size={18} />} onClick={() => notify("success", `已复制 ${onCopyDay(copyFrom, copyTo)} 个任务。`)}>复制任务</Button>
              </div>
            </CollapsibleAdminCard>
          </section>
          <CollapsibleAdminCard
            title="批量添加任务"
            description="一次添加多条任务。"
            open={Boolean(openTaskSections.batch)}
            onToggle={() => toggleTaskSection("batch")}
          >
            <div className="mb-5 flex items-center justify-end gap-3"><Button variant="secondary" icon={<Plus size={18} />} onClick={() => setBatchRows([...batchRows, emptyDraft(selectedDate)])}>增加一行</Button></div>
            <div className="space-y-3">
              {batchRows.map((row, index) => (
                <div key={index} className="grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_2fr_1fr_1fr_auto] dark:bg-slate-800">
                  <input className={inputClass} type="date" value={row.date} onChange={(e) => setBatchRows(batchRows.map((item, i) => i === index ? { ...item, date: e.target.value } : item))} />
                  <select className={inputClass} value={row.subject} onChange={(e) => setBatchRows(batchRows.map((item, i) => i === index ? { ...item, subject: e.target.value as Subject } : item))}>{SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select>
                  <input className={inputClass} value={row.title} placeholder="任务标题" onChange={(e) => setBatchRows(batchRows.map((item, i) => i === index ? { ...item, title: e.target.value } : item))} />
                  <input className={inputClass} type="number" min="0" value={row.estimatedMinutes} onChange={(e) => setBatchRows(batchRows.map((item, i) => i === index ? { ...item, estimatedMinutes: e.target.value } : item))} />
                  <select className={inputClass} value={row.priority} onChange={(e) => setBatchRows(batchRows.map((item, i) => i === index ? { ...item, priority: e.target.value as Priority } : item))}>{priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select>
                  <Button variant="ghost" icon={<Trash2 size={18} />} onClick={() => setBatchRows(batchRows.filter((_, i) => i !== index))} disabled={batchRows.length === 1} aria-label="删除批量任务行" />
                </div>
              ))}
            </div>
            <Button className="mt-5" icon={<Save size={18} />} onClick={submitBatch}>批量保存</Button>
          </CollapsibleAdminCard>
          <CollapsibleAdminCard
            title="按日期查看任务"
            description="查看、编辑或删除某一天的任务。"
            open={Boolean(openTaskSections.byDate)}
            onToggle={() => toggleTaskSection("byDate")}
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end"><input className={`${inputClass} sm:max-w-56`} type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></div>
            <div className="space-y-3">
              {selectedTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
                  <div><div className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{task.subject} · {task.date}</div><div className="mt-1 font-bold">{task.title}</div><div className="mt-1 text-sm text-slate-500">{task.status} · {task.priority}</div></div>
                  <div className="flex gap-2"><Button variant="secondary" icon={<Edit3 size={18} />} onClick={() => setEditing(task)}>编辑</Button><Button variant="danger" icon={<Trash2 size={18} />} onClick={() => setDeleteTarget(task)}>删除</Button></div>
                </div>
              ))}
              {selectedTasks.length === 0 && <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500 dark:bg-slate-800">这一天还没有任务。</div>}
            </div>
          </CollapsibleAdminCard>
        </div>
      )}

      {tab === "recurring" && (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <h2 className="text-xl font-black">周期任务模板</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2">任务标题<input className={`${inputClass} mt-1`} value={templateDraft.title} onChange={(e) => setTemplateDraft({ ...templateDraft, title: e.target.value })} /></label>
              <label className="text-sm font-semibold">科目<select className={`${inputClass} mt-1`} value={templateDraft.subject} onChange={(e) => setTemplateDraft({ ...templateDraft, subject: e.target.value as Subject })}>{SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
              <label className="text-sm font-semibold">预计分钟<input className={`${inputClass} mt-1`} type="number" value={templateDraft.estimatedMinutes ?? ""} onChange={(e) => setTemplateDraft({ ...templateDraft, estimatedMinutes: Number(e.target.value) })} /></label>
              <label className="text-sm font-semibold">开始日期<input className={`${inputClass} mt-1`} type="date" value={templateDraft.recurrence.startDate} onChange={(e) => setTemplateDraft({ ...templateDraft, recurrence: { ...templateDraft.recurrence, startDate: e.target.value } })} /></label>
              <label className="text-sm font-semibold">结束日期<input className={`${inputClass} mt-1`} type="date" value={templateDraft.recurrence.endDate ?? ""} onChange={(e) => setTemplateDraft({ ...templateDraft, recurrence: { ...templateDraft.recurrence, endDate: e.target.value || undefined } })} /></label>
              <label className="text-sm font-semibold">重复规则<select className={`${inputClass} mt-1`} value={templateDraft.recurrence.type} onChange={(e) => setTemplateDraft({ ...templateDraft, recurrence: { ...templateDraft.recurrence, type: e.target.value as RecurrenceType } })}>{recurrenceTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
              <label className="text-sm font-semibold">每隔几天<input className={`${inputClass} mt-1`} type="number" min="1" value={templateDraft.recurrence.intervalDays ?? 1} onChange={(e) => setTemplateDraft({ ...templateDraft, recurrence: { ...templateDraft.recurrence, intervalDays: Number(e.target.value) } })} /></label>
              <label className="text-sm font-semibold">每月日期<input className={`${inputClass} mt-1`} type="number" min="1" max="31" value={templateDraft.recurrence.monthlyDay ?? 1} onChange={(e) => setTemplateDraft({ ...templateDraft, recurrence: { ...templateDraft.recurrence, monthlyDay: Number(e.target.value) } })} /></label>
              <label className="text-sm font-semibold">优先级<select className={`${inputClass} mt-1`} value={templateDraft.priority} onChange={(e) => setTemplateDraft({ ...templateDraft, priority: e.target.value as Priority })}>{priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select></label>
              <div className="sm:col-span-2">
                <div className="mb-2 text-sm font-semibold">每周重复星期</div>
                <div className="flex flex-wrap gap-2">{["日", "一", "二", "三", "四", "五", "六"].map((label, day) => <label key={day} className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"><input type="checkbox" className="mr-2" checked={templateDraft.recurrence.weekdays?.includes(day) ?? false} onChange={(e) => { const set = new Set(templateDraft.recurrence.weekdays ?? []); e.target.checked ? set.add(day) : set.delete(day); setTemplateDraft({ ...templateDraft, recurrence: { ...templateDraft.recurrence, weekdays: Array.from(set).sort() } }); }} />周{label}</label>)}</div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={templateDraft.enabled} onChange={(e) => setTemplateDraft({ ...templateDraft, enabled: e.target.checked })} />启用模板</label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={templateDraft.autoGenerate} onChange={(e) => setTemplateDraft({ ...templateDraft, autoGenerate: e.target.checked })} />自动生成未来任务</label>
            </div>
            <Button className="mt-5" icon={<Save size={18} />} onClick={() => { if (!templateDraft.title.trim()) return notify("error", "周期任务标题不能为空。"); onSaveTemplate({ ...templateDraft, title: templateDraft.title.trim(), updatedAt: new Date().toISOString() }); setTemplateDraft(templateToDraft()); notify("success", "周期任务模板已保存。"); }}>保存周期任务</Button>
          </Card>
          <Card>
            <h2 className="text-xl font-black">已有周期任务</h2>
            <div className="mt-5 space-y-3">
              {database.recurringTemplates.map((template) => <div key={template.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><div className="font-bold">{template.title}</div><div className="mt-1 text-sm text-slate-500">{template.subject} · {recurrenceLabel(template)}</div><div className="mt-3 flex gap-2"><Button variant="secondary" icon={<Edit3 size={18} />} onClick={() => setTemplateDraft(template)}>编辑</Button><Button variant="danger" icon={<Trash2 size={18} />} onClick={() => setDeleteTemplateTarget(template)}>删除</Button></div></div>)}
              {database.recurringTemplates.length === 0 && <div className="text-sm text-slate-500">暂无周期任务模板。</div>}
            </div>
          </Card>
        </section>
      )}

      {tab === "records" && <Card><h2 className="text-xl font-black">学习记录</h2><div className="mt-4 space-y-2">{database.studySessions.slice(-30).reverse().map((session) => <div key={session.id} className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-800">{database.tasks.find((task) => task.id === session.taskId)?.title ?? "已删除任务"} · {Math.round(session.durationSeconds / 60)} 分钟 · {new Date(session.startedAt).toLocaleString()}</div>)}{database.studySessions.length === 0 && <p className="text-slate-500">暂无计时记录。</p>}</div></Card>}

      {tab === "evidence" && <Card><h2 className="text-xl font-black">完成证明</h2><div className="mt-4 space-y-3">{evidenceTasks.map((task) => { const evidence = database.evidences.find((item) => item.taskId === task.id || item.id === task.evidenceId); return <div key={task.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><div className="font-bold">{task.title}</div><div className="mt-1 text-sm text-slate-500">{EVIDENCE_LABEL[task.evidenceRequirement]} · {evidence ? "已提交" : "未提交"}</div>{evidence?.text && <p className="mt-2 text-sm">{evidence.text}</p>}{evidence?.numberValue !== undefined && <p className="mt-2 text-sm">数量：{evidence.numberValue}</p>}{evidence?.imageIds?.length ? <p className="mt-2 text-sm">图片：{evidence.imageIds.length} 张</p> : null}</div>; })}{evidenceTasks.length === 0 && <p className="text-slate-500">暂无需要证明的任务。</p>}</div></Card>}

      {tab === "data" && (
        <Card>
          <h2 className="text-xl font-black">数据管理</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">本项目没有后端，不同设备之间不会自动同步，需要通过导出和导入数据完成任务传递。</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Download size={18} />} onClick={exportAll}>导出 JSON</Button>
            <Button variant="secondary" icon={<FileArchive size={18} />} onClick={() => exportFullBackupZip(database, `study-full-backup-${getTodayString()}.zip`).then(() => notify("success", "完整备份包已导出。")).catch((error) => notify("error", error.message))}>导出完整备份包</Button>
            <Button variant="secondary" icon={<FileJson size={18} />} onClick={() => { downloadJson(buildTemplateData(), `study-tasks-template-${getTodayString()}.json`); notify("success", "示例模板已下载。"); }}>下载示例模板</Button>
            <Button icon={<Upload size={18} />} onClick={() => fileRef.current?.click()}>导入 JSON</Button>
            <Button variant="secondary" icon={<Upload size={18} />} onClick={() => zipRef.current?.click()}>导入完整备份</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
            <input ref={zipRef} type="file" accept=".zip,application/zip" className="hidden" onChange={handleZipImport} />
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <div className="font-bold">迁移快照</div>
            <div className="mt-2 text-sm text-slate-500">最近备份时间：{snapshots[0]?.createdAt ? new Date(snapshots[0].createdAt).toLocaleString() : "暂无"}</div>
            <div className="mt-3 flex gap-2"><Button variant="secondary" onClick={() => { const restored = restoreSnapshot(); onReplaceDatabase(restored); notify("success", "已恢复最近一次快照。"); }}>恢复上一次快照</Button><Button variant="danger" onClick={() => { clearSnapshots(); notify("success", "历史快照已删除。"); }}>删除历史快照</Button></div>
          </div>
        </Card>
      )}

      {tab === "settings" && (
        <Card>
          <h2 className="text-xl font-black">系统设置</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">默认生成天数<input className={`${inputClass} mt-1`} type="number" min="1" value={settingsDraft.defaultRecurringGenerateDays} onChange={(e) => setSettingsDraft({ ...settingsDraft, defaultRecurringGenerateDays: Number(e.target.value) })} /></label>
            <label className="text-sm font-semibold">修改管理密码<input className={`${inputClass} mt-1`} type="password" placeholder="留空则不修改" onChange={(e) => setSettingsDraft({ ...settingsDraft, adminPasswordHash: e.target.value ? hashPassword(e.target.value) : settings.adminPasswordHash })} /></label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={settingsDraft.requireAdminPasswordEverySession} onChange={(e) => setSettingsDraft({ ...settingsDraft, requireAdminPasswordEverySession: e.target.checked })} />关闭页面后重新验证管理密码</label>
          </div>
          <p className="mt-4 text-sm text-slate-500">本地管理密码不能提供真正的安全保护，它只能防止普通误操作。忘记密码时只能清除浏览器本地数据或导入备份覆盖。</p>
          <Button className="mt-5" icon={<Save size={18} />} onClick={() => { onUpdateSettings(settingsDraft); notify("success", "系统设置已保存。"); }}>保存系统设置</Button>
        </Card>
      )}

      <Modal title="编辑任务" open={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing && <div className="space-y-4"><input className={inputClass} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /><textarea className={`${inputClass} min-h-24`} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /><Button icon={<Save size={18} />} onClick={saveEditing}>保存修改</Button></div>}
      </Modal>
      <Modal title="确认删除" open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <p className="text-slate-600 dark:text-slate-300">确定删除任务“{deleteTarget?.title}”吗？如果任务有完成证明，结构化证明会保留在数据中，图片仍在 IndexedDB。</p>
        <div className="mt-5 flex justify-end gap-3"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>取消</Button><Button variant="danger" onClick={() => { if (deleteTarget) onDeleteTask(deleteTarget.id); setDeleteTarget(null); notify("success", "任务已删除。"); }}>确认删除</Button></div>
      </Modal>
      <Modal title="删除周期任务" open={Boolean(deleteTemplateTarget)} onClose={() => setDeleteTemplateTarget(null)}>
        <p className="text-slate-600 dark:text-slate-300">删除“{deleteTemplateTarget?.title}”的周期规则。已完成历史任务不会删除。</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setDeleteTemplateTarget(null)}>取消</Button><Button variant="danger" onClick={() => { if (deleteTemplateTarget) onDeleteTemplate(deleteTemplateTarget.id, false); setDeleteTemplateTarget(null); notify("success", "周期规则已删除。"); }}>只删除规则</Button><Button variant="danger" onClick={() => { if (deleteTemplateTarget) onDeleteTemplate(deleteTemplateTarget.id, true); setDeleteTemplateTarget(null); notify("success", "周期规则和未来实例已删除。"); }}>删除规则和未来任务</Button></div>
      </Modal>
      <Modal title="选择导入方式" open={Boolean(pendingImport)} onClose={() => setPendingImport(null)}>
        <p className="text-slate-600 dark:text-slate-300">导入前会自动迁移旧版本数据。格式错误时不会覆盖现有数据。</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => finishImport("merge")}>合并数据</Button><Button variant="danger" onClick={() => finishImport("replace")}>覆盖现有数据</Button></div>
      </Modal>
    </div>
  );
}
