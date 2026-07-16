import { FormEvent, useMemo, useState } from "react";
import { BookMarked, ChevronRight, Save } from "lucide-react";
import { DailyMood, DailyReflection, MOOD_LABEL } from "../../types/task";
import { getTodayString } from "../../utils/date";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { Modal } from "../common/Modal";

interface ReflectionPanelProps {
  date?: string;
  reflections?: DailyReflection[];
  emphasized?: boolean;
  onSave: (reflection: DailyReflection) => void;
  notify: (type: "success" | "error" | "info", message: string) => void;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-500/20";

const makeDraft = (date: string, reflection?: DailyReflection): DailyReflection => {
  const now = new Date().toISOString();
  return (
    reflection ?? {
      id: crypto.randomUUID(),
      date,
      mood: "good",
      notes: "",
      createdAt: now,
      updatedAt: now,
    }
  );
};

export function ReflectionPanel({ date = getTodayString(), reflections = [], emphasized, onSave, notify }: ReflectionPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(date);
  const currentReflection = useMemo(() => reflections.find((reflection) => reflection.date === selectedDate), [reflections, selectedDate]);
  const todayReflection = reflections.find((reflection) => reflection.date === date);
  const [draft, setDraft] = useState<DailyReflection>(() => makeDraft(date, todayReflection));

  const openEditor = () => {
    const reflection = reflections.find((item) => item.date === selectedDate);
    setDraft(makeDraft(selectedDate, reflection));
    setOpen(true);
  };

  const changeDate = (nextDate: string) => {
    setSelectedDate(nextDate);
    setDraft(makeDraft(nextDate, reflections.find((reflection) => reflection.date === nextDate)));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ ...draft, date: selectedDate, updatedAt: new Date().toISOString() });
    notify("success", "今日心情和小记已保存。");
  };

  return (
    <>
      <button className="block w-full text-left" onClick={openEditor}>
        <Card className={emphasized ? "ring-2 ring-indigo-200 dark:ring-indigo-500/40" : ""}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15">
                <BookMarked size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black">今日总结</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {todayReflection ? `${MOOD_LABEL[todayReflection.mood]} · ${todayReflection.notes || "已记录小记"}` : "点进去填写今日心情和小记"}
                </p>
              </div>
            </div>
            <ChevronRight className="shrink-0 text-slate-400" size={22} />
          </div>
        </Card>
      </button>

      <Modal title="今日总结" open={open} onClose={() => setOpen(false)}>
        <form className="space-y-5" onSubmit={submit}>
          <label className="text-sm font-semibold">
            查看日期
            <input className={`${inputClass} mt-1`} type="date" value={selectedDate} onChange={(event) => changeDate(event.target.value)} />
          </label>
          {currentReflection && (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              这一天已经写过小记，可以继续修改。
            </div>
          )}
          <label className="text-sm font-semibold">
            今日心情
            <select className={`${inputClass} mt-1`} value={draft.mood} onChange={(event) => setDraft({ ...draft, mood: event.target.value as DailyMood })}>
              {Object.entries(MOOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            小记
            <textarea
              className={`${inputClass} mt-1 min-h-36`}
              value={draft.notes ?? ""}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              placeholder="今天发生了什么？完成得怎么样？有什么想记下来的？"
            />
          </label>
          <Button icon={<Save size={18} />}>保存</Button>
        </form>
      </Modal>
    </>
  );
}
