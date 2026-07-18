import { FormEvent, useMemo, useState } from "react";
import { BookMarked, ChevronRight, Flower2, Frown, Laugh, Meh, Pencil, Save, Smile, SmilePlus, Zap } from "lucide-react";
import { DailyMood, DailyReflection, MOOD_LABEL } from "../../types/task";
import { getTodayString } from "../../utils/date";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";

interface ReflectionPanelProps {
  date?: string;
  reflections?: DailyReflection[];
  emphasized?: boolean;
  onSave: (reflection: DailyReflection) => void;
  notify: (type: "success" | "error" | "info", message: string) => void;
}

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm outline-none transition focus:border-[var(--color-brand)] focus:bg-[var(--color-surface)]";

const moodOptions: Array<{ value: DailyMood; icon: typeof Smile; tone: string }> = [
  { value: "great", icon: Laugh, tone: "text-emerald-500" },
  { value: "good", icon: SmilePlus, tone: "text-sky-500" },
  { value: "normal", icon: Smile, tone: "text-amber-500" },
  { value: "difficult", icon: Meh, tone: "text-orange-500" },
  { value: "adjust", icon: Frown, tone: "text-rose-500" },
];

const makeDraft = (date: string, reflection?: DailyReflection): DailyReflection => {
  const now = new Date().toISOString();
  return (
    reflection ?? {
      id: crypto.randomUUID(),
      date,
      mood: "good",
      energy: 3,
      notes: "",
      createdAt: now,
      updatedAt: now,
    }
  );
};

export function ReflectionPanel({ date = getTodayString(), reflections = [], emphasized, onSave, notify }: ReflectionPanelProps) {
  const [open, setOpen] = useState(false);
  const today = getTodayString();
  const currentReflection = useMemo(() => reflections.find((reflection) => reflection.date === date), [date, reflections]);
  const todayReflection = reflections.find((reflection) => reflection.date === date);
  const [draft, setDraft] = useState<DailyReflection>(() => makeDraft(date, todayReflection));
  const readOnly = date !== today;

  const openEditor = () => {
    const reflection = reflections.find((item) => item.date === date);
    setDraft(makeDraft(date, reflection));
    setOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    onSave({ ...draft, date, bestPart: undefined, updatedAt: new Date().toISOString() });
    notify("success", "每日小记已保存。");
    setOpen(false);
  };

  const MoodIcon = todayReflection ? moodOptions.find((item) => item.value === todayReflection.mood)?.icon ?? Smile : BookMarked;
  const moodTone = todayReflection ? moodOptions.find((item) => item.value === todayReflection.mood)?.tone ?? "text-[var(--color-brand)]" : "text-[var(--color-text-secondary)]";

  return (
    <>
      <button className="block w-full text-left" onClick={openEditor}>
        <div className={`soft-card rounded-[16px] px-3 py-3 ${emphasized ? "ring-2 ring-[var(--color-brand)]/20" : ""}`}>
          <div className="flex min-h-9 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <BookMarked size={20} strokeWidth={1.8} />
              </div>
              <h2 className="text-[16px] font-black">每日小记</h2>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)]">
              记录生活，遇见更好的自己 <ChevronRight size={15} />
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <div className="rounded-[14px] bg-white/72 px-2.5 py-3 shadow-[var(--shadow-soft)] dark:bg-white/10">
              <div className="flex items-center gap-1 text-sm font-bold"><span>💕</span>心情</div>
              <div className={`mt-3 flex h-12 items-center justify-center rounded-full ${moodTone}`}>
                <MoodIcon size={34} strokeWidth={1.7} />
              </div>
              <p className="mt-2 text-center text-xs font-semibold text-[var(--color-text-secondary)]">{todayReflection ? MOOD_LABEL[todayReflection.mood] : "未记录"}</p>
            </div>
            <div className="rounded-[14px] bg-white/72 px-2.5 py-3 shadow-[var(--shadow-soft)] dark:bg-white/10">
              <div className="flex items-center gap-1 text-sm font-bold"><Zap className="text-amber-400" size={15} />能量</div>
              <div className="mt-3 text-center text-[24px] font-black text-[var(--color-brand)]">{Math.round(((todayReflection?.energy ?? 3) / 5) * 100)}%</div>
              <div className="mt-2 grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((energy) => <span key={energy} className={`h-7 rounded-[6px] ${energy <= (todayReflection?.energy ?? 3) ? "bg-[var(--color-brand)]" : "bg-[var(--color-surface-muted)]"}`} />)}
              </div>
            </div>
            <div className="rounded-[14px] bg-[#fff8e9]/90 px-2.5 py-3 shadow-[var(--shadow-soft)] dark:bg-amber-500/10">
              <div className="flex items-center gap-1 text-sm font-bold"><Pencil className="text-amber-500" size={15} />今日小记</div>
              <p className="mt-3 line-clamp-4 text-[13px] leading-5 text-[var(--color-text)]">
                {todayReflection?.notes || (readOnly ? "这一天还没有小记" : "今天完成了很多重要的事，感觉特别充实！")}
              </p>
            </div>
          </div>
        </div>
      </button>

      <Modal title={readOnly ? "查看小记" : "每日小记"} open={open} onClose={() => setOpen(false)}>
        <form className="space-y-5" onSubmit={submit}>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--color-text)]">{date}</div>
          {currentReflection && (
            <div className="rounded-[10px] bg-[var(--color-brand-soft)] p-3 text-sm text-[var(--color-brand)]">
              {readOnly ? "这一天写过小记。" : "今天已经写过小记，可以继续修改。"}
            </div>
          )}
          <div>
            <div className="mb-2 text-sm font-semibold">今天整体心情</div>
            <div className="grid grid-cols-5 gap-2">
              {moodOptions.map((option) => {
                const Icon = option.icon;
                const active = draft.mood === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setDraft({ ...draft, mood: option.value })}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-[10px] border text-xs font-medium transition ${
                      active ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]" : "border-[var(--color-border)] bg-[var(--color-surface-muted)]"
                    } ${readOnly ? "cursor-default" : "hover:border-[var(--color-brand)]"}`}
                  >
                    <Icon className={option.tone} size={22} />
                    <span>{MOOD_LABEL[option.value]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold">今日能量</div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((energy) => {
                const active = energy <= (draft.energy ?? 3);
                return (
                  <button
                    key={energy}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setDraft({ ...draft, energy })}
                    className={`flex min-h-12 items-center justify-center rounded-[10px] border transition ${
                      active ? "border-rose-300 bg-rose-50 text-rose-500 dark:border-rose-500/50 dark:bg-rose-500/12" : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                    }`}
                    aria-label={`能量 ${energy}`}
                  >
                    <Flower2 size={22} fill={active ? "currentColor" : "none"} />
                  </button>
                );
              })}
            </div>
          </div>
          <label className="text-sm font-semibold">
            小记
            <textarea
              className={`${inputClass} mt-1 min-h-36`}
              value={draft.notes ?? ""}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              readOnly={readOnly}
              placeholder={readOnly ? "这一天没有写小记" : "今天有什么想记下来的？"}
            />
          </label>
          {!readOnly && <Button icon={<Save size={18} />}>保存</Button>}
        </form>
      </Modal>
    </>
  );
}
