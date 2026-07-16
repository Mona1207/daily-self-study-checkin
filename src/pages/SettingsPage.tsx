import { ChangeEvent, FormEvent, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Database,
  Download,
  FileArchive,
  FileJson,
  Layers3,
  Moon,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import {
  AppDatabase,
  AppSettings,
  DEFAULT_CATEGORIES,
  RecurrenceType,
  RecurringTaskTemplate,
  Subject,
  SUBJECTS,
  TaskCategory,
} from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { CollapsibleSection, resetCollapsiblePreferences } from "../components/common/CollapsibleSection";
import { AppUpdateCard } from "../components/update/AppUpdateCard";
import { exportFullBackupZip, readFullBackupZip, restoreBackupImages } from "../utils/backup";
import { getTodayString } from "../utils/date";
import { buildExportData, downloadJson, readJsonFile } from "../utils/importExport";
import { recurrenceLabel } from "../utils/recurrence";
import { createEmptyDatabase, importDatabase } from "../utils/storage";
import { APP_VERSION, APP_VERSION_CODE } from "../utils/appVersion";

interface SettingsPageProps {
  database: AppDatabase;
  settings: AppSettings;
  tasks: AppDatabase["tasks"];
  onAddTasks: (tasks: Array<Omit<AppDatabase["tasks"][number], "id" | "createdAt" | "updatedAt" | "status" | "completed">>) => number;
  onUpdateSettings: (settings: AppSettings) => void;
  onReplaceDatabase: (database: AppDatabase) => void;
  onSaveTemplate: (template: RecurringTaskTemplate) => void;
  onDeleteTemplate: (templateId: string, deleteFutureInstances?: boolean) => void;
  onGenerateRecurring: () => number;
  notify: (type: "success" | "error" | "info", message: string) => void;
}

type Panel = "task" | "reminders" | "appearance" | "data" | "about";

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-[#E9EBEF] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4F6EF7] focus:ring-4 focus:ring-[#4F6EF7]/10 dark:border-slate-700 dark:bg-slate-950";

const makeCategory = (name: string, color: string, order: number): TaskCategory => ({
  id: `category-${crypto.randomUUID()}`,
  name,
  color,
  order,
  createdAt: new Date().toISOString(),
});

export function SettingsPage({
  database,
  settings,
  tasks,
  onUpdateSettings,
  onReplaceDatabase,
  onSaveTemplate,
  onDeleteTemplate,
  onGenerateRecurring,
  notify,
}: SettingsPageProps) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#E8EEFF");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState({
    title: "",
    subject: "工作" as Subject,
    recurrenceType: "daily" as RecurrenceType,
    startDate: getTodayString(),
    estimatedMinutes: "30",
    priority: "medium" as RecurringTaskTemplate["priority"],
  });
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const zipImportRef = useRef<HTMLInputElement>(null);

  const categories = [...(settings.categories?.length ? settings.categories : DEFAULT_CATEGORIES)].sort((a, b) => a.order - b.order);

  const saveCategories = (nextCategories: TaskCategory[]) => {
    onUpdateSettings({ ...settings, categories: nextCategories.map((category, index) => ({ ...category, order: index })) });
  };

  const addCategory = (event: FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return notify("error", "请填写分类名称。");
    if (categories.some((category) => category.name === name)) return notify("error", "这个分类已经存在。");
    saveCategories([...categories, makeCategory(name, categoryColor, categories.length)]);
    setCategoryName("");
    notify("success", "分类已添加。");
  };

  const updateSetting = (patch: Partial<AppSettings>) => {
    onUpdateSettings({ ...settings, ...patch });
    notify("success", "设置已保存。");
  };

  const createTemplate = (event: FormEvent) => {
    event.preventDefault();
    if (!templateDraft.title.trim()) return notify("error", "请填写周期任务名称。");
    const now = new Date().toISOString();
    onSaveTemplate({
      id: crypto.randomUUID(),
      title: templateDraft.title.trim(),
      subject: templateDraft.subject,
      estimatedMinutes: Number(templateDraft.estimatedMinutes) || undefined,
      priority: templateDraft.priority,
      evidenceRequirement: "none",
      enabled: true,
      autoGenerate: true,
      recurrence: {
        type: templateDraft.recurrenceType,
        startDate: templateDraft.startDate,
        weekdays: templateDraft.recurrenceType === "weekly" ? [1] : undefined,
        monthlyDay: templateDraft.recurrenceType === "monthly" ? new Date(templateDraft.startDate).getDate() : undefined,
        intervalDays: templateDraft.recurrenceType === "interval" ? 2 : undefined,
      },
      createdAt: now,
      updatedAt: now,
    });
    setTemplateDraft({ ...templateDraft, title: "" });
    notify("success", "周期任务已保存。");
  };

  const exportJson = () => {
    downloadJson(buildExportData(database), `today-list-data-${getTodayString()}.json`);
    notify("success", "JSON 数据已导出。");
  };

  const handleJsonImport = async (event: ChangeEvent<HTMLInputElement>, mode: "replace" | "merge") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const data = await readJsonFile(file);
      const result = importDatabase(data, mode);
      onReplaceDatabase(result.database);
      notify("success", mode === "replace" ? "数据已恢复。" : `已导入 ${result.imported} 个任务。`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "导入失败。");
    }
  };

  const handleZipImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const { data, images } = await readFullBackupZip(file);
      const result = importDatabase(data, "replace");
      await restoreBackupImages(images);
      onReplaceDatabase(result.database);
      notify("success", "完整备份已恢复。");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "恢复备份失败。");
    }
  };

  const clearAllData = () => {
    if (!window.confirm("确定清空全部任务、记录和设置吗？这个操作不能撤销。")) return;
    const empty = createEmptyDatabase();
    onReplaceDatabase({ ...empty, settings: { ...empty.settings, onboarded: true } });
    notify("success", "数据已清空。");
  };

  const renderMain = () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#4F6EF7]">今日清单</p>
        <h1 className="mt-1 text-[22px] font-semibold">我的</h1>
        <p className="mt-2 text-sm text-[#6B7280]">管理分类、提醒、外观和本地数据。</p>
      </div>
      <div className="space-y-3">
        {[
          { key: "task" as const, icon: <Layers3 size={20} />, title: "任务与分类", desc: "分类管理、周期任务、默认任务设置" },
          { key: "reminders" as const, icon: <Bell size={20} />, title: "提醒", desc: "通知与提醒" },
          { key: "appearance" as const, icon: settings.darkMode ? <Moon size={20} /> : <Sun size={20} />, title: "外观", desc: "主题、字体和动画" },
          { key: "data" as const, icon: <Database size={20} />, title: "数据", desc: "导入、导出与备份" },
          { key: "about" as const, icon: <Settings size={20} />, title: "其他", desc: "隐私说明、使用帮助、关于 App" },
        ].map((item) => (
          <button key={item.key} className="flex w-full items-center gap-4 rounded-[12px] border border-[#E9EBEF] bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900" onClick={() => setPanel(item.key)}>
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#F6F7F9] text-[#4F6EF7] dark:bg-slate-800">{item.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[#1F2329] dark:text-slate-100">{item.title}</span>
              <span className="mt-1 block text-sm text-[#6B7280]">{item.desc}</span>
            </span>
            <ChevronRight className="text-[#9CA3AF]" size={20} />
          </button>
        ))}
      </div>
    </div>
  );

  const renderHeader = (title: string) => (
    <div className="flex items-center gap-3">
      <button className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#E9EBEF] bg-white dark:border-slate-800 dark:bg-slate-900" onClick={() => setPanel(null)} aria-label="返回">
        <ArrowLeft size={20} />
      </button>
      <h1 className="text-[22px] font-semibold">{title}</h1>
    </div>
  );

  const renderTaskPanel = () => (
    <div className="space-y-5">
      {renderHeader("任务设置")}
      <CollapsibleSection id="settings-categories" title="分类管理" count={categories.length} defaultExpanded>
        <h2 className="text-base font-semibold">分类管理</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_auto]" onSubmit={addCategory}>
          <input className={inputClass} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="新分类名称" />
          <input className={inputClass} value={categoryColor} onChange={(event) => setCategoryColor(event.target.value)} placeholder="#E8EEFF" />
          <Button icon={<Plus size={18} />}>添加</Button>
        </form>
        <div className="mt-4 space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-3 rounded-[10px] bg-[#F6F7F9] p-3 dark:bg-slate-800">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? "#E8EEFF" }} />
              <input className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" value={category.name} onChange={(event) => saveCategories(categories.map((item) => (item.id === category.id ? { ...item, name: event.target.value } : item)))} />
              <button className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[#D9655B] hover:bg-white dark:hover:bg-slate-900" onClick={() => saveCategories(categories.filter((item) => item.id !== category.id))} aria-label="删除分类">
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      </CollapsibleSection>
      <CollapsibleSection id="settings-recurring-active" title="周期任务" count={database.recurringTemplates.length} subtitle="正在使用" defaultExpanded>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">周期任务</h2>
            <p className="mt-1 text-sm text-[#6B7280]">适合每天、每周重复的事项。</p>
          </div>
          <Button variant="secondary" icon={<Plus size={18} />} onClick={() => setTemplateOpen((value) => !value)}>新增</Button>
        </div>
        {templateOpen && (
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={createTemplate}>
            <input className={`${inputClass} sm:col-span-2`} value={templateDraft.title} onChange={(event) => setTemplateDraft({ ...templateDraft, title: event.target.value })} placeholder="周期任务名称" />
            <select className={inputClass} value={templateDraft.subject} onChange={(event) => setTemplateDraft({ ...templateDraft, subject: event.target.value as Subject })}>
              {SUBJECTS.map((subject) => <option key={subject}>{subject}</option>)}
            </select>
            <select className={inputClass} value={templateDraft.recurrenceType} onChange={(event) => setTemplateDraft({ ...templateDraft, recurrenceType: event.target.value as RecurrenceType })}>
              <option value="daily">每天</option>
              <option value="weekdays">每个工作日</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
              <option value="interval">自定义间隔</option>
            </select>
            <input className={inputClass} type="date" value={templateDraft.startDate} onChange={(event) => setTemplateDraft({ ...templateDraft, startDate: event.target.value })} />
            <input className={inputClass} type="number" min="0" value={templateDraft.estimatedMinutes} onChange={(event) => setTemplateDraft({ ...templateDraft, estimatedMinutes: event.target.value })} placeholder="预计分钟" />
            <Button className="sm:col-span-2" icon={<Save size={18} />}>保存周期任务</Button>
          </form>
        )}
        <div className="mt-4 space-y-2">
          {database.recurringTemplates.length === 0 && <p className="rounded-[12px] bg-[#F6F7F9] p-4 text-sm text-[#6B7280] dark:bg-slate-800">还没有周期任务，适合添加每天、每周重复的事项。</p>}
          {database.recurringTemplates.map((template) => (
            <div key={template.id} className="flex items-center gap-3 rounded-[12px] bg-[#F6F7F9] p-3 dark:bg-slate-800">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{template.title}</div>
                <div className="mt-1 text-xs text-[#6B7280]">{template.subject} · {recurrenceLabel(template)} · {template.estimatedMinutes ?? 0}分钟</div>
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[#D9655B] hover:bg-white dark:hover:bg-slate-900" onClick={() => onDeleteTemplate(template.id, false)} aria-label="删除周期任务">
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
        <Button className="mt-4" variant="secondary" icon={<RefreshCw size={18} />} onClick={() => notify("success", `已生成 ${onGenerateRecurring()} 个未来任务。`)}>生成未来任务</Button>
      </CollapsibleSection>
      <CollapsibleSection id="settings-default-task" title="默认任务设置" defaultExpanded={false}>
        <label className="mt-4 block text-sm font-medium">
          默认周期任务生成天数
          <input className={`${inputClass} mt-2`} type="number" min="1" value={settings.defaultRecurringGenerateDays} onChange={(event) => updateSetting({ defaultRecurringGenerateDays: Number(event.target.value) || 1 })} />
        </label>
      </CollapsibleSection>
    </div>
  );

  const renderRemindersPanel = () => (
    <div className="space-y-5">
      {renderHeader("提醒设置")}
      <p className="text-sm leading-6 text-[#6B7280]">提醒会尽量使用系统本地通知。首次开启时再申请权限，不会在首次打开 App 时打扰你。</p>
      {["每日提醒", "任务提醒", "逾期提醒", "每日回顾提醒", "备份提醒"].map((label, index) => (
        <CollapsibleSection key={label} id={`settings-reminder-${index}`} title={label} defaultExpanded={index === 0}>
          <label className="flex items-center justify-between rounded-[12px] bg-[#F6F7F9] p-4 text-sm font-medium dark:bg-slate-800">
            启用{label}
            <input type="checkbox" onChange={() => notify("info", "提醒偏好已记录，系统通知会在支持的平台上生效。")} />
          </label>
        </CollapsibleSection>
      ))}
    </div>
  );

  const renderAppearancePanel = () => (
    <div className="space-y-5">
      {renderHeader("外观设置")}
      <CollapsibleSection id="settings-theme" title="主题模式" defaultExpanded>
        <label className="flex items-center justify-between text-sm font-medium">
          深色模式
          <input type="checkbox" checked={settings.darkMode} onChange={(event) => updateSetting({ darkMode: event.target.checked })} />
        </label>
      </CollapsibleSection>
      <CollapsibleSection id="settings-animation" title="动画效果" defaultExpanded={false}>
        <label className="flex items-center justify-between text-sm font-medium">
          动画开关
          <input type="checkbox" checked={settings.animationsEnabled} onChange={(event) => updateSetting({ animationsEnabled: event.target.checked })} />
        </label>
      </CollapsibleSection>
      <CollapsibleSection id="settings-layout" title="布局偏好" defaultExpanded={false}>
        <label className="flex items-center justify-between text-sm font-medium">
          显示预计时间
          <input type="checkbox" checked={settings.showEstimatedTime} onChange={(event) => updateSetting({ showEstimatedTime: event.target.checked })} />
        </label>
        <Button className="mt-4" variant="secondary" onClick={() => { resetCollapsiblePreferences(); notify("success", "已恢复默认布局，重新打开页面后生效。"); }}>恢复默认布局</Button>
      </CollapsibleSection>
    </div>
  );

  const renderDataPanel = () => (
    <div className="space-y-5">
      {renderHeader("数据管理")}
      <input ref={jsonImportRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => handleJsonImport(event, "merge")} />
      <input ref={zipImportRef} type="file" accept=".zip,application/zip" className="hidden" onChange={handleZipImport} />
      <CollapsibleSection id="settings-backup" title="备份与恢复" defaultExpanded>
        <p className="text-sm leading-6 text-[#6B7280]">所有数据默认只保存在当前设备。卸载 App 或清除数据可能导致记录丢失，请定期导出备份。</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" icon={<Download size={18} />} onClick={exportJson}>导出全部数据</Button>
          <Button variant="secondary" icon={<FileArchive size={18} />} onClick={() => exportFullBackupZip(database, `today-list-backup-${getTodayString()}.zip`).then(() => notify("success", "完整备份已导出。")).catch((error) => notify("error", error.message))}>导出完整备份</Button>
          <Button variant="secondary" icon={<FileJson size={18} />} onClick={() => zipImportRef.current?.click()}>恢复备份</Button>
        </div>
      </CollapsibleSection>
      <CollapsibleSection id="settings-import" title="数据导入" defaultExpanded={false}>
        <Button variant="secondary" icon={<Upload size={18} />} onClick={() => jsonImportRef.current?.click()}>导入 JSON 数据</Button>
      </CollapsibleSection>
      <CollapsibleSection id="settings-storage" title="存储占用" defaultExpanded={false}>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-[12px] bg-[#F6F7F9] p-4 dark:bg-slate-800"><div className="text-2xl font-semibold">{tasks.length}</div><div className="mt-1 text-xs text-[#6B7280]">任务</div></div>
          <div className="rounded-[12px] bg-[#F6F7F9] p-4 dark:bg-slate-800"><div className="text-2xl font-semibold">{database.evidences.length}</div><div className="mt-1 text-xs text-[#6B7280]">完成记录</div></div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection id="settings-danger" title="危险操作" defaultExpanded={false}>
        <Button variant="danger" icon={<Trash2 size={18} />} onClick={clearAllData}>清空全部数据</Button>
      </CollapsibleSection>
    </div>
  );

  const renderAboutPanel = () => (
    <div className="space-y-5">
      {renderHeader("关于")}
      <Card>
        <h2 className="text-base font-semibold">今日清单</h2>
        <p className="mt-2 text-sm text-[#6B7280]">把每天要做的事，清楚地安排好。</p>
        <p className="mt-4 text-sm text-[#6B7280]">当前版本：{APP_VERSION} ({APP_VERSION_CODE})</p>
        <p className="mt-4 text-sm leading-6 text-[#6B7280]">应用不需要注册登录，不使用后端，不包含社交功能。任务、每日回顾和完成记录默认只保存在当前设备。</p>
      </Card>
      <AppUpdateCard notify={notify} />
    </div>
  );

  if (!panel) return renderMain();
  if (panel === "task") return renderTaskPanel();
  if (panel === "reminders") return renderRemindersPanel();
  if (panel === "appearance") return renderAppearancePanel();
  if (panel === "data") return renderDataPanel();
  return renderAboutPanel();
}
