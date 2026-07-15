import { FormEvent, useState } from "react";
import { BookMarked, Save } from "lucide-react";
import { DailyMood, DailyReflection, MOOD_LABEL } from "../../types/task";
import { getTodayString } from "../../utils/date";
import { Button } from "../common/Button";
import { Card } from "../common/Card";

interface ReflectionPanelProps {
  date?: string;
  reflection?: DailyReflection;
  emphasized?: boolean;
  onSave: (reflection: DailyReflection) => void;
  notify: (type: "success" | "error" | "info", message: string) => void;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-500/20";

export function ReflectionPanel({ date = getTodayString(), reflection, emphasized, onSave, notify }: ReflectionPanelProps) {
  const [draft, setDraft] = useState<DailyReflection>(() => {
    const now = new Date().toISOString();
    return (
      reflection ?? {
        id: crypto.randomUUID(),
        date,
        mood: "good",
        createdAt: now,
        updatedAt: now,
      }
    );
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ ...draft, date, updatedAt: new Date().toISOString() });
    notify("success", "每日学习总结已保存。");
  };

  return (
    <Card className={emphasized ? "ring-2 ring-indigo-200 dark:ring-indigo-500/40" : ""}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15">
          <BookMarked size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black">今日总结</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{emphasized ? "今天任务已完成，可以把收获记下来。" : "任务没全部完成也可以先记录状态。"}</p>
        </div>
      </div>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-sm font-semibold">
          今日学习状态
          <select className={`${inputClass} mt-1`} value={draft.mood} onChange={(event) => setDraft({ ...draft, mood: event.target.value as DailyMood })}>
            {Object.entries(MOOD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          今天最困难的任务
          <input className={`${inputClass} mt-1`} value={draft.hardestTask ?? ""} onChange={(event) => setDraft({ ...draft, hardestTask: event.target.value })} />
        </label>
        <label className="text-sm font-semibold">
          今天最满意的内容
          <input className={`${inputClass} mt-1`} value={draft.bestPart ?? ""} onChange={(event) => setDraft({ ...draft, bestPart: event.target.value })} />
        </label>
        <label className="text-sm font-semibold">
          今天学会了什么
          <input className={`${inputClass} mt-1`} value={draft.learned ?? ""} onChange={(event) => setDraft({ ...draft, learned: event.target.value })} />
        </label>
        <label className="text-sm font-semibold">
          明天需要改进什么
          <input className={`${inputClass} mt-1`} value={draft.improvement ?? ""} onChange={(event) => setDraft({ ...draft, improvement: event.target.value })} />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          自由备注
          <textarea className={`${inputClass} mt-1 min-h-24`} value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </label>
        <div className="sm:col-span-2">
          <Button icon={<Save size={18} />}>保存总结</Button>
        </div>
      </form>
    </Card>
  );
}
