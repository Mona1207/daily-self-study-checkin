import { ChangeEvent, FormEvent, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CircleUserRound,
  Database,
  Download,
  FileArchive,
  FileJson,
  HelpCircle,
  Info,
  Moon,
  NotebookPen,
  Palette,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Tags,
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
import { buildExportData, downloadCsv, downloadJson, readJsonFile } from "../utils/importExport";
import { describeNotificationPermission, getNotificationPermission, requestNotificationPermission } from "../utils/notification";
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
  "min-h-11 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-brand)] focus:bg-[var(--color-surface)]";

const makeCategory = (name: string, color: string, order: number): TaskCategory => ({
  id: `category-${crypto.randomUUID()}`,
  name,
  color,
  order,
  createdAt: new Date().toISOString(),
});

const categoryColors = ["#526DF6", "#2698EA", "#18A999", "#22B983", "#F59E42", "#EF5B5B", "#7C5CF6", "#8A94A6"];

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
  const [categoryColor, setCategoryColor] = useState("#526DF6");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
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
      const confirmText = mode === "replace" ? "导入会覆盖当前数据，并先创建安全快照。确认继续吗？" : "导入会合并任务，并先创建安全快照。确认继续吗？";
      if (!window.confirm(confirmText)) return;
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

  const renderMain = () => {
    const completedCount = tasks.filter((task) => task.status === "completed").length;
    const activeDays = new Set(tasks.map((task) => task.date)).size;
    const menuItems: Array<{ key: Panel; icon: JSX.Element; title: string; tone: string }> = [
      { key: "about", icon: <ShieldCheck size={23} />, title: "账号与安全", tone: "text-[var(--color-brand)]" },
      { key: "reminders", icon: <Bell size={23} />, title: "提醒设置", tone: "text-orange-500" },
      { key: "appearance", icon: <Palette size={23} />, title: "主题外观", tone: "text-emerald-500" },
      { key: "data", icon: <Download size={23} />, title: "数据导出", tone: "text-sky-500" },
      { key: "task", icon: <Tags size={23} />, title: "标签管理", tone: "text-violet-500" },
      { key: "task", icon: <NotebookPen size={23} />, title: "每日小记管理", tone: "text-amber-500" },
      { key: "about", icon: <HelpCircle size={23} />, title: "帮助与反馈", tone: "text-blue-500" },
      { key: "about", icon: <Info size={23} />, title: "关于我们", tone: "text-slate-400" },
    ];

    return (
      <div className="space-y-5 pb-24">
        <div className="morning-illustration -mx-[var(--page-x)] -mt-5 px-[var(--page-x)] pb-8 pt-12">
          <div className="relative z-10">
            <h1 className="text-[38px] font-black leading-tight">我的</h1>
          </div>
        </div>

        <section className="soft-card -mt-10 flex min-h-[112px] items-center gap-4 rounded-[22px] p-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#efeaff] to-[#d9d0ff] text-[var(--color-brand)]">
            <CircleUserRound size={52} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[24px] font-black">{settings.userName || settings.studentName || "小清清"}</h2>
              <span className="rounded-[8px] bg-[var(--color-brand-soft)] px-2 py-1 text-xs font-black text-[var(--color-brand)]">LV.6</span>
            </div>
            <p className="mt-2 truncate text-[15px] text-[var(--color-text-secondary)]">专注当下，成就更好的自己 ✨</p>
          </div>
          <ChevronRight className="text-[var(--color-text-muted)]" size={24} />
        </section>

        <section className="soft-card rounded-[22px] bg-[var(--color-brand-soft)]/70 p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]"><Moon size={34} fill="currentColor" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-[var(--color-text-secondary)]">已坚持</div>
              <div className="mt-1 text-[34px] font-black leading-none text-[var(--color-brand)]">{activeDays}<span className="ml-1 text-base text-[var(--color-text)]">天</span></div>
            </div>
            <div className="shrink-0 text-right text-sm text-[var(--color-text-secondary)]">累计完成 {completedCount}</div>
          </div>
          <div className="mt-4 flex justify-between gap-2">
            {["一", "二", "三", "四", "五", "六", "今"].map((day, index) => (
              <span key={day} className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${index === 6 ? "bg-[var(--color-brand)] text-white shadow-[0_8px_18px_rgb(104_71_242_/_0.26)]" : "bg-white/75 text-[var(--color-brand)] dark:bg-white/10"}`}>
                {index < 6 ? "✓" : day}
              </span>
            ))}
          </div>
        </section>

        <section className="soft-card overflow-hidden rounded-[20px] px-4">
          {menuItems.map((item) => (
            <button key={`${item.title}-${item.key}`} className="flex min-h-[62px] w-full items-center gap-4 border-b border-[var(--color-border)] text-left last:border-b-0" onClick={() => setPanel(item.key)}>
              <span className={`flex h-10 w-10 items-center justify-center ${item.tone}`}>{item.icon}</span>
              <span className="min-w-0 flex-1 text-[18px] font-bold text-[var(--color-text)]">{item.title}</span>
              <ChevronRight className="text-[var(--color-text-muted)]" size={21} />
            </button>
          ))}
        </section>

        <section className="soft-card morning-illustration rounded-[18px] p-4">
          <div className="relative z-10 pl-16">
            <h2 className="text-[17px] font-black">感谢你与今日清单一起成长 🌱</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">愿你每天都比昨天更进步一点点</p>
          </div>
        </section>
      </div>
    );
  };

  const renderHeader = (title: string) => (
    <div className="flex items-center gap-3">
      <button className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)]" onClick={() => setPanel(null)} aria-label="返回">
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
        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={addCategory}>
          <input className={inputClass} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="新分类名称" />
          <Button icon={<Plus size={18} />}>添加</Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {categoryColors.map((color) => (
            <button key={color} className={`h-8 w-8 rounded-full ring-2 ${categoryColor === color ? "ring-[var(--color-brand)]" : "ring-transparent"}`} style={{ backgroundColor: color }} onClick={() => setCategoryColor(color)} aria-label={`选择分类颜色 ${color}`} />
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {categories.map((category) => (
            <div key={category.id} className={`flex items-center gap-3 rounded-[10px] bg-[var(--color-surface-muted)] p-3 ${category.hidden ? "opacity-55" : ""}`}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? "#E8EEFF" }} />
              <input className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" value={category.name} onChange={(event) => saveCategories(categories.map((item) => (item.id === category.id ? { ...item, name: event.target.value } : item)))} />
              <button className="min-h-10 rounded-[10px] px-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]" onClick={() => saveCategories(categories.map((item) => (item.id === category.id ? { ...item, hidden: !item.hidden } : item)))}>{category.hidden ? "显示" : "隐藏"}</button>
              <button className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[var(--color-danger)] hover:bg-[var(--color-surface)]" onClick={() => {
                const mode = window.prompt("删除分类会影响相关任务。输入 1 移动到“其他”，输入 2 仅移除分类，其他内容取消。");
                if (mode !== "1" && mode !== "2") return;
                saveCategories(categories.filter((item) => item.id !== category.id));
                onReplaceDatabase({
                  ...database,
                  tasks: database.tasks.map((task) =>
                    task.subject === category.name || task.categoryId === category.id
                      ? { ...task, subject: mode === "1" ? "其他" : task.subject, categoryId: undefined, updatedAt: new Date().toISOString() }
                      : task,
                  ),
                });
                notify("success", mode === "1" ? "分类已删除，请在任务编辑中确认相关任务分类。" : "分类已移除。");
              }} aria-label="删除分类">
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
      <CollapsibleSection id="settings-reminder-permission" title="通知权限" subtitle={describeNotificationPermission(settings.reminderPreferences?.permissionStatus ?? getNotificationPermission())} defaultExpanded>
        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">提醒会尽量使用系统本地通知；Web/PWA 环境受浏览器和系统权限限制。</p>
        <Button className="mt-3" variant="secondary" icon={<Bell size={18} />} onClick={async () => {
          const status = await requestNotificationPermission();
          updateSetting({ reminderPreferences: { ...(settings.reminderPreferences ?? { defaultOffsetMinutes: 15, overdueEnabled: true, dailySummaryEnabled: false, permissionStatus: status }), permissionStatus: status } });
        }}>检查并申请权限</Button>
      </CollapsibleSection>
      <CollapsibleSection id="settings-reminder-default" title="默认提醒" defaultExpanded>
        <label className="block text-sm font-medium">默认提前时间<select className={`${inputClass} mt-2`} value={settings.reminderPreferences?.defaultOffsetMinutes ?? 15} onChange={(event) => updateSetting({ reminderPreferences: { ...(settings.reminderPreferences ?? { overdueEnabled: true, dailySummaryEnabled: false, permissionStatus: getNotificationPermission() }), defaultOffsetMinutes: Number(event.target.value) } })}><option value="5">5分钟</option><option value="15">15分钟</option><option value="30">30分钟</option><option value="60">1小时</option><option value="1440">1天</option></select></label>
        <label className="mt-3 flex items-center justify-between text-sm font-medium">提醒逾期任务<input type="checkbox" checked={settings.reminderPreferences?.overdueEnabled ?? true} onChange={(event) => updateSetting({ reminderPreferences: { ...(settings.reminderPreferences ?? { defaultOffsetMinutes: 15, dailySummaryEnabled: false, permissionStatus: getNotificationPermission() }), overdueEnabled: event.target.checked } })} /></label>
        <label className="mt-3 flex items-center justify-between text-sm font-medium">每日任务摘要<input type="checkbox" checked={settings.reminderPreferences?.dailySummaryEnabled ?? false} onChange={(event) => updateSetting({ reminderPreferences: { ...(settings.reminderPreferences ?? { defaultOffsetMinutes: 15, overdueEnabled: true, permissionStatus: getNotificationPermission() }), dailySummaryEnabled: event.target.checked } })} /></label>
      </CollapsibleSection>
    </div>
  );

  const renderAppearancePanel = () => (
    <div className="space-y-5">
      {renderHeader("外观设置")}
      <CollapsibleSection id="settings-theme" title="主题模式" defaultExpanded>
        <div className="grid grid-cols-3 gap-2">
          {(["light", "dark", "system"] as const).map((mode) => <button key={mode} className={`min-h-10 rounded-[10px] text-sm font-semibold ${settings.themeMode === mode ? "bg-[var(--color-brand)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"}`} onClick={() => updateSetting({ themeMode: mode, darkMode: mode === "dark" })}>{mode === "light" ? "浅色" : mode === "dark" ? "深色" : "跟随系统"}</button>)}
        </div>
        <div className="mt-4 flex gap-2">
          {(["blueviolet", "sky", "teal", "orange"] as const).map((color) => <button key={color} className={`min-h-10 flex-1 rounded-[10px] text-sm font-semibold ${settings.themeColor === color ? "bg-[var(--color-brand)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"}`} onClick={() => updateSetting({ themeColor: color })}>{color === "blueviolet" ? "蓝紫" : color === "sky" ? "天蓝" : color === "teal" ? "青绿" : "橙色"}</button>)}
        </div>
      </CollapsibleSection>
      <CollapsibleSection id="settings-animation" title="动画效果" defaultExpanded={false}>
        <label className="flex items-center justify-between text-sm font-medium">
          动画开关
          <input type="checkbox" checked={settings.animationsEnabled} onChange={(event) => updateSetting({ animationsEnabled: event.target.checked })} />
        </label>
        <label className="mt-3 flex items-center justify-between text-sm font-medium">
          触感反馈
          <input type="checkbox" checked={settings.hapticsEnabled ?? true} onChange={(event) => updateSetting({ hapticsEnabled: event.target.checked })} />
        </label>
      </CollapsibleSection>
      <CollapsibleSection id="settings-layout" title="布局偏好" defaultExpanded={false}>
        <label className="flex items-center justify-between text-sm font-medium">
          显示预计时间
          <input type="checkbox" checked={settings.showEstimatedTime} onChange={(event) => updateSetting({ showEstimatedTime: event.target.checked })} />
        </label>
        <label className="mt-3 flex items-center justify-between text-sm font-medium">
          紧凑布局
          <input type="checkbox" checked={settings.layoutDensity === "compact" || settings.compactLayout} onChange={(event) => updateSetting({ layoutDensity: event.target.checked ? "compact" : "standard", compactLayout: event.target.checked })} />
        </label>
        <Button className="mt-4" variant="secondary" onClick={() => { resetCollapsiblePreferences(); notify("success", "已恢复默认布局，重新打开页面后生效。"); }}>恢复默认布局</Button>
      </CollapsibleSection>
    </div>
  );

  const renderDataPanel = () => (
    <div className="space-y-5">
      {renderHeader("数据管理")}
      <input ref={jsonImportRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => handleJsonImport(event, importMode)} />
      <input ref={zipImportRef} type="file" accept=".zip,application/zip" className="hidden" onChange={handleZipImport} />
      <CollapsibleSection id="settings-backup" title="备份与恢复" defaultExpanded>
        <p className="text-sm leading-6 text-[#6B7280]">所有数据默认只保存在当前设备。卸载 App 或清除数据可能导致记录丢失，请定期导出备份。</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" icon={<Download size={18} />} onClick={exportJson}>导出全部数据</Button>
          <Button variant="secondary" icon={<Download size={18} />} onClick={() => { downloadCsv(tasks, `today-list-tasks-${getTodayString()}.csv`); notify("success", "CSV 已导出。"); }}>导出任务 CSV</Button>
          <Button variant="secondary" icon={<FileArchive size={18} />} onClick={() => exportFullBackupZip(database, `today-list-backup-${getTodayString()}.zip`).then(() => notify("success", "完整备份已导出。")).catch((error) => notify("error", error.message))}>导出完整备份</Button>
          <Button variant="secondary" icon={<FileJson size={18} />} onClick={() => zipImportRef.current?.click()}>恢复备份</Button>
        </div>
      </CollapsibleSection>
      <CollapsibleSection id="settings-import" title="数据导入" defaultExpanded={false}>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button className={`min-h-10 rounded-[10px] text-sm font-semibold ${importMode === "merge" ? "bg-[var(--color-brand)] text-white" : "bg-[var(--color-surface-muted)]"}`} onClick={() => setImportMode("merge")}>合并</button>
          <button className={`min-h-10 rounded-[10px] text-sm font-semibold ${importMode === "replace" ? "bg-[var(--color-brand)] text-white" : "bg-[var(--color-surface-muted)]"}`} onClick={() => setImportMode("replace")}>覆盖</button>
        </div>
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
