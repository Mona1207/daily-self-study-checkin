import { FormEvent, useState } from "react";
import { Moon, Save, Sparkles, Sun } from "lucide-react";
import { AppSettings } from "../types/task";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { hashPassword } from "../utils/migrations";

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
    if (draft.dailyTarget < 0) return notify("error", "每日目标任务数不能为负数。");
    onSave({ ...draft, studentName: draft.studentName.trim() });
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
                value={draft.dailyTarget}
                onChange={(e) => setDraft({ ...draft, dailyTarget: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm font-semibold">
              默认周期任务生成天数
              <input
                className={`${inputClass} mt-1`}
                type="number"
                min="1"
                value={draft.defaultRecurringGenerateDays}
                onChange={(e) => setDraft({ ...draft, defaultRecurringGenerateDays: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm font-semibold">
              修改管理密码
              <input className={`${inputClass} mt-1`} type="password" placeholder="留空则不修改" onChange={(e) => setDraft({ ...draft, adminPasswordHash: e.target.value ? hashPassword(e.target.value) : settings.adminPasswordHash })} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-semibold dark:bg-slate-800">
              <span className="flex items-center gap-2"><Sparkles size={18} />完成动画</span>
              <input type="checkbox" checked={draft.animationsEnabled} onChange={(e) => setDraft({ ...draft, animationsEnabled: e.target.checked })} />
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
      <Card>
        <h2 className="text-xl font-black">本地数据说明</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">
          本项目没有后端，不同设备之间不会自动同步，需要通过导出和导入数据完成任务传递。本地管理密码不能提供真正的安全保护，它只能防止普通误操作。
        </p>
      </Card>
    </div>
  );
}
