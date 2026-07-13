import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Copy, Download, Edit3, FileJson, LockKeyhole, Plus, Save, Trash2, Upload } from "lucide-react";
import { AppSettings, Priority, StudyTask, Subject, SUBJECTS } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Modal } from "../components/common/Modal";
import { getTodayString } from "../utils/date";
import { buildExportData, buildTemplateData, downloadJson, readJsonFile } from "../utils/importExport";
import { validateExportData } from "../utils/storage";
import { sortTasks } from "../utils/taskSort";

type Notify = (type: "success" | "error" | "info", message: string) => void;

interface AdminPageProps {
  tasks: StudyTask[];
  settings: AppSettings;
  onAddTask: (task: Omit<StudyTask, "id" | "createdAt" | "completed" | "completedAt">) => void;
  onAddTasks: (tasks: Omit<StudyTask, "id" | "createdAt" | "completed" | "completedAt">[]) => number;
  onUpdateTask: (taskId: string, patch: Partial<StudyTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onCopyDay: (fromDate: string, toDate: string) => number;
  onReplaceTasks: (tasks: StudyTask[]) => void;
  onMergeTasks: (tasks: StudyTask[]) => number;
  onUpdateSettings: (settings: AppSettings) => void;
  notify: Notify;
}

interface TaskDraft {
  date: string;
  title: string;
  subject: Subject;
  description: string;
  estimatedMinutes: string;
  priority: Priority;
}

const emptyDraft = (date = getTodayString()): TaskDraft => ({
  date,
  title: "",
  subject: "数学",
  description: "",
  estimatedMinutes: "30",
  priority: "medium",
});

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-500/20";

const priorities: Array<{ value: Priority; label: string }> = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

const draftToTask = (draft: TaskDraft): Omit<StudyTask, "id" | "createdAt" | "completed" | "completedAt"> => ({
  date: draft.date,
  title: draft.title.trim(),
  subject: draft.subject,
  description: draft.description.trim() || undefined,
  estimatedMinutes: draft.estimatedMinutes === "" ? undefined : Number(draft.estimatedMinutes),
  priority: draft.priority,
});

const validateDraft = (draft: TaskDraft): string | null => {
  if (!draft.date) return "日期不能为空。";
  if (!draft.title.trim()) return "任务标题不能为空。";
  if (!draft.subject) return "科目不能为空。";
  if (draft.estimatedMinutes !== "" && Number(draft.estimatedMinutes) < 0) return "预计时间不能为负数。";
  return null;
};

function DraftFields({ draft, onChange }: { draft: TaskDraft; onChange: (draft: TaskDraft) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">
        日期
        <input className={`${inputClass} mt-1`} type="date" value={draft.date} onChange={(e) => onChange({ ...draft, date: e.target.value })} />
      </label>
      <label className="text-sm font-semibold">
        科目
        <select className={`${inputClass} mt-1`} value={draft.subject} onChange={(e) => onChange({ ...draft, subject: e.target.value as Subject })}>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        任务标题
        <input className={`${inputClass} mt-1`} value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} placeholder="例如：完成函数练习 10 题" />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        详细说明
        <textarea className={`${inputClass} mt-1 min-h-24`} value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} placeholder="可以填写错题整理、背诵范围等补充说明" />
      </label>
      <label className="text-sm font-semibold">
        预计学习分钟数
        <input className={`${inputClass} mt-1`} type="number" min="0" value={draft.estimatedMinutes} onChange={(e) => onChange({ ...draft, estimatedMinutes: e.target.value })} />
      </label>
      <label className="text-sm font-semibold">
        优先级
        <select className={`${inputClass} mt-1`} value={draft.priority} onChange={(e) => onChange({ ...draft, priority: e.target.value as Priority })}>
          {priorities.map((priority) => (
            <option key={priority.value} value={priority.value}>{priority.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function AdminPage({
  tasks,
  settings,
  onAddTask,
  onAddTasks,
  onUpdateTask,
  onDeleteTask,
  onCopyDay,
  onReplaceTasks,
  onMergeTasks,
  onUpdateSettings,
  notify,
}: AdminPageProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft());
  const [batchRows, setBatchRows] = useState<TaskDraft[]>([emptyDraft()]);
  const [editing, setEditing] = useState<StudyTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudyTask | null>(null);
  const [copyFrom, setCopyFrom] = useState(getTodayString());
  const [copyTo, setCopyTo] = useState(getTodayString());
  const [pendingImport, setPendingImport] = useState<StudyTask[] | null>(null);
  const [pendingSettings, setPendingSettings] = useState<Partial<AppSettings> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedTasks = useMemo(() => sortTasks(tasks.filter((task) => task.date === selectedDate)), [selectedDate, tasks]);

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    if (password === settings.adminPassword) {
      setUnlocked(true);
      notify("success", "已进入任务管理。");
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
    const editDraft: TaskDraft = {
      date: editing.date,
      title: editing.title,
      subject: editing.subject,
      description: editing.description ?? "",
      estimatedMinutes: editing.estimatedMinutes?.toString() ?? "",
      priority: editing.priority,
    };
    const error = validateDraft(editDraft);
    if (error) return notify("error", error);
    onUpdateTask(editing.id, {
      date: editing.date,
      title: editing.title.trim(),
      subject: editing.subject,
      description: editing.description?.trim() || undefined,
      estimatedMinutes: editing.estimatedMinutes,
      priority: editing.priority,
    });
    setEditing(null);
    notify("success", "任务已更新。");
  };

  const exportAll = () => {
    downloadJson(buildExportData(tasks, settings), `study-tasks-${getTodayString()}.json`);
    notify("success", "任务数据已导出。");
  };

  const downloadTemplate = () => {
    downloadJson(buildTemplateData(), `study-tasks-template-${getTodayString()}.json`);
    notify("success", "示例模板已下载。");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const json = await readJsonFile(file);
      const data = validateExportData(json);
      setPendingImport(data.tasks);
      setPendingSettings(data.settings);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "导入失败。");
    } finally {
      event.target.value = "";
    }
  };

  const finishImport = (mode: "replace" | "merge") => {
    if (!pendingImport) return;
    if (mode === "replace") {
      if (!window.confirm("确定覆盖现有全部任务数据吗？此操作会替换当前任务列表。")) return;
      onReplaceTasks(pendingImport);
      onUpdateSettings({ ...settings, ...pendingSettings, onboarded: true });
      notify("success", `导入成功，已覆盖为 ${pendingImport.length} 个任务。`);
    } else {
      const total = onMergeTasks(pendingImport);
      onUpdateSettings({ ...settings, ...pendingSettings, onboarded: true });
      notify("success", `导入成功，合并后共有 ${total} 个任务。`);
    }
    setPendingImport(null);
    setPendingSettings(null);
  };

  if (!unlocked) {
    return (
      <Card className="mx-auto mt-12 max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15">
          <LockKeyhole size={28} />
        </div>
        <h1 className="mt-5 text-center text-2xl font-black">任务管理</h1>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">请输入本地管理密码。默认密码为 123456，可在个性设置中修改。</p>
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
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">本地管理入口</p>
          <h1 className="mt-1 text-3xl font-black">任务管理</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Download size={18} />} onClick={exportAll}>导出任务数据</Button>
          <Button variant="secondary" icon={<FileJson size={18} />} onClick={downloadTemplate}>下载示例模板</Button>
          <Button variant="primary" icon={<Upload size={18} />} onClick={() => fileRef.current?.click()}>导入任务数据</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">添加单个任务</h2>
          <form className="mt-5 space-y-5" onSubmit={submitSingle}>
            <DraftFields draft={draft} onChange={setDraft} />
            <Button icon={<Plus size={18} />}>保存任务</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-black">复制某一天任务</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              来源日期
              <input className={`${inputClass} mt-1`} type="date" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} />
            </label>
            <label className="text-sm font-semibold">
              目标日期
              <input className={`${inputClass} mt-1`} type="date" value={copyTo} onChange={(e) => setCopyTo(e.target.value)} />
            </label>
          </div>
          <Button
            className="mt-5"
            variant="secondary"
            icon={<Copy size={18} />}
            onClick={() => {
              if (!copyFrom || !copyTo) return notify("error", "请选择来源日期和目标日期。");
              const count = onCopyDay(copyFrom, copyTo);
              count ? notify("success", `已复制 ${count} 个任务。`) : notify("info", "来源日期没有可复制的任务。");
            }}
          >
            复制任务
          </Button>
        </Card>
      </section>

      <Card>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">批量添加任务</h2>
          <Button variant="secondary" icon={<Plus size={18} />} onClick={() => setBatchRows([...batchRows, emptyDraft(selectedDate)])}>增加一行</Button>
        </div>
        <div className="space-y-3">
          {batchRows.map((row, index) => (
            <div key={index} className="grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[1.1fr_1fr_2fr_1fr_1fr_auto] dark:bg-slate-800">
              <input className={inputClass} type="date" value={row.date} onChange={(e) => setBatchRows(batchRows.map((item, i) => (i === index ? { ...item, date: e.target.value } : item)))} />
              <select className={inputClass} value={row.subject} onChange={(e) => setBatchRows(batchRows.map((item, i) => (i === index ? { ...item, subject: e.target.value as Subject } : item)))}>
                {SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
              <input className={inputClass} value={row.title} placeholder="任务标题" onChange={(e) => setBatchRows(batchRows.map((item, i) => (i === index ? { ...item, title: e.target.value } : item)))} />
              <input className={inputClass} type="number" min="0" value={row.estimatedMinutes} onChange={(e) => setBatchRows(batchRows.map((item, i) => (i === index ? { ...item, estimatedMinutes: e.target.value } : item)))} />
              <select className={inputClass} value={row.priority} onChange={(e) => setBatchRows(batchRows.map((item, i) => (i === index ? { ...item, priority: e.target.value as Priority } : item)))}>
                {priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
              </select>
              <Button variant="ghost" icon={<Trash2 size={18} />} onClick={() => setBatchRows(batchRows.filter((_, i) => i !== index))} disabled={batchRows.length === 1} aria-label="删除批量任务行" />
            </div>
          ))}
        </div>
        <Button className="mt-5" icon={<Save size={18} />} onClick={submitBatch}>批量保存</Button>
      </Card>

      <Card>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black">按日期查看任务</h2>
          <input className={`${inputClass} sm:max-w-56`} type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
        <div className="space-y-3">
          {selectedTasks.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500 dark:bg-slate-800 dark:text-slate-300">这一天还没有任务。</div>
          ) : (
            selectedTasks.map((task) => (
              <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{task.subject} · {task.date}</div>
                  <div className="mt-1 font-bold">{task.title}</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{task.completed ? "已完成" : "未完成"} · 优先级 {task.priority}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" icon={<Edit3 size={18} />} onClick={() => setEditing(task)}>编辑</Button>
                  <Button variant="danger" icon={<Trash2 size={18} />} onClick={() => setDeleteTarget(task)}>删除</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal title="编辑任务" open={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing && (
          <div className="space-y-5">
            <DraftFields
              draft={{
                date: editing.date,
                title: editing.title,
                subject: editing.subject,
                description: editing.description ?? "",
                estimatedMinutes: editing.estimatedMinutes?.toString() ?? "",
                priority: editing.priority,
              }}
              onChange={(next) =>
                setEditing({
                  ...editing,
                  ...draftToTask(next),
                })
              }
            />
            <Button icon={<Save size={18} />} onClick={saveEditing}>保存修改</Button>
          </div>
        )}
      </Modal>

      <Modal title="确认删除" open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <p className="text-slate-600 dark:text-slate-300">确定删除任务“{deleteTarget?.title}”吗？删除后无法恢复。</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!deleteTarget) return;
              onDeleteTask(deleteTarget.id);
              setDeleteTarget(null);
              notify("success", "任务已删除。");
            }}
          >
            确认删除
          </Button>
        </div>
      </Modal>

      <Modal title="选择导入方式" open={Boolean(pendingImport)} onClose={() => setPendingImport(null)}>
        <p className="text-slate-600 dark:text-slate-300">检测到 {pendingImport?.length ?? 0} 个任务。请选择覆盖现有数据或合并数据，合并时会根据任务 ID 去重。</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => finishImport("merge")}>合并数据</Button>
          <Button variant="danger" onClick={() => finishImport("replace")}>覆盖现有数据</Button>
        </div>
      </Modal>
    </div>
  );
}
