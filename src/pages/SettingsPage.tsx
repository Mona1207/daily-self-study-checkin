import { FormEvent, useState } from "react";
import { Moon, Save, Sparkles, Sun } from "lucide-react";
import { AppSettings } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  notify: (type: "success" | "error" | "info", message: string) => void;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-500/20";

export function SettingsPage({ settings, onSave, notify }: SettingsPageProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.studentName.trim()) return notify("error", "学生姓名不能为空。");
    if (!draft.adminPassword.trim()) return notify("error", "管理密码不能为空。");
    if (draft.dailyGoal < 0) return notify("error", "每日目标任务数不能为负数。");
    onSave({ ...draft, studentName: draft.studentName.trim(), adminPassword: draft.adminPassword.trim() });
    notify("success", "个性设置已保存。");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">保存在当前浏览器</p>
        <h1 className="mt-1 text-3xl font-black">个性设置</h1>
      </div>

      <Card>
        <form className="space-y-6" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              学生姓名
              <input className={`${inputClass} mt-1`} value={draft.studentName} onChange={(e) => setDraft({ ...draft, studentName: e.target.value })} />
            </label>
            <label className="text-sm font-semibold">
              每日目标任务数
              <input
                className={`${inputClass} mt-1`}
                type="number"
                min="0"
                value={draft.dailyGoal}
                onChange={(e) => setDraft({ ...draft, dailyGoal: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              管理密码
              <input className={`${inputClass} mt-1`} value={draft.adminPassword} onChange={(e) => setDraft({ ...draft, adminPassword: e.target.value })} />
              <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">此密码只用于隐藏本地管理入口，不提供真实安全保护。</span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-semibold dark:bg-slate-800">
              <span className="flex items-center gap-2"><Sparkles size={18} />完成动画</span>
              <input type="checkbox" checked={draft.enableAnimations} onChange={(e) => setDraft({ ...draft, enableAnimations: e.target.checked })} />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-semibold dark:bg-slate-800">
              <span>显示预计时间</span>
              <input type="checkbox" checked={draft.showEstimatedTime} onChange={(e) => setDraft({ ...draft, showEstimatedTime: e.target.checked })} />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-semibold dark:bg-slate-800">
              <span className="flex items-center gap-2">{draft.darkMode ? <Moon size={18} /> : <Sun size={18} />}深色模式</span>
              <input type="checkbox" checked={draft.darkMode} onChange={(e) => setDraft({ ...draft, darkMode: e.target.checked })} />
            </label>
          </div>

          <Button icon={<Save size={18} />}>保存设置</Button>
        </form>
      </Card>
    </div>
  );
}
