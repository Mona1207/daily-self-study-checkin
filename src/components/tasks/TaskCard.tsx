import { FormEvent, useState } from "react";
import { Check, Edit3, MoreHorizontal, Save, Trash2 } from "lucide-react";
import { EVIDENCE_LABEL, STATUS_LABEL, StudyTask, TaskEvidence, SUBJECTS, Subject } from "../../types/task";
import { formatTime } from "../../utils/date";
import { Button } from "../common/Button";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { Modal } from "../common/Modal";

interface TaskCardProps {
  task: StudyTask;
  showEstimatedTime: boolean;
  evidence?: TaskEvidence;
  suggested?: boolean;
  onComplete?: (task: StudyTask) => void;
  onUndo?: (task: StudyTask) => void;
  onUpdate?: (task: StudyTask, patch: Partial<StudyTask>) => void;
  onEvidence?: (task: StudyTask) => void;
  onMove?: (task: StudyTask, date: string) => void;
  onPostpone?: (task: StudyTask) => void;
  onCopy?: (task: StudyTask, date: string) => void;
  onCancel?: (task: StudyTask) => void;
  onRestore?: (task: StudyTask) => void;
  onDelete?: (task: StudyTask) => void;
  compact?: boolean;
}

const priorityText = {
  low: "低",
  medium: "中",
  high: "高",
};

const dotColor = {
  工作: "bg-blue-400",
  学习: "bg-emerald-400",
  生活: "bg-slate-400",
  运动: "bg-orange-400",
  阅读: "bg-violet-400",
  健康: "bg-teal-400",
  购物: "bg-rose-300",
  个人: "bg-indigo-300",
  其他: "bg-slate-300",
};

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-[#E9EBEF] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4F6EF7] focus:ring-4 focus:ring-[#4F6EF7]/10 dark:border-slate-700 dark:bg-slate-950";

export function TaskCard({
  task,
  showEstimatedTime,
  evidence,
  suggested,
  onComplete,
  onUndo,
  onUpdate,
  onEvidence,
  onMove,
  onPostpone,
  onCopy,
  onCancel,
  onRestore,
  onDelete,
}: TaskCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState<"move" | "copy" | null>(null);
  const [targetDate, setTargetDate] = useState(task.date);
  const [draft, setDraft] = useState({
    title: task.title,
    date: task.date,
    startTime: task.startTime ?? "",
    dueTime: task.dueTime ?? "",
    subject: task.subject,
    estimatedMinutes: task.estimatedMinutes?.toString() ?? "",
    priority: task.priority,
    description: task.description ?? "",
  });
  const completed = task.status === "completed";
  const category = task.subject || "其他";
  const inactive = task.status === "postponed" || task.status === "cancelled";

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    onUpdate?.(task, {
      title: draft.title.trim() || task.title,
      date: draft.date,
      startTime: draft.startTime || undefined,
      dueTime: draft.dueTime || undefined,
      subject: draft.subject,
      estimatedMinutes: draft.estimatedMinutes ? Number(draft.estimatedMinutes) : undefined,
      priority: draft.priority,
      description: draft.description.trim() || undefined,
    });
    setEditOpen(false);
  };

  const submitDateAction = () => {
    if (dateOpen === "move") onMove?.(task, targetDate);
    if (dateOpen === "copy") onCopy?.(task, targetDate);
    setDateOpen(null);
  };

  return (
    <>
      <article className="rounded-[12px] border border-[#E9EBEF] bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <button
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm transition ${
              completed ? "border-[#3FAE73] bg-[#3FAE73] text-white" : "border-[#D4D8DF] bg-white text-transparent dark:bg-slate-900"
            }`}
            onClick={() => (completed ? onUndo?.(task) : onComplete?.(task))}
            aria-label={completed ? "撤销完成" : "完成任务"}
          >
            <Check size={16} />
          </button>

          <button className="min-w-0 flex-1 text-left" onClick={() => setDetailsOpen(true)}>
            <div className={`break-words text-[15px] font-semibold ${completed ? "text-[#9CA3AF] line-through" : "text-[#1F2329] dark:text-slate-100"}`}>
              {task.title}
              {suggested && !completed ? <span className="ml-2 rounded-[6px] bg-[#EEF2FF] px-1.5 py-0.5 text-xs font-medium text-[#4F6EF7]">建议先做</span> : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B7280] dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${dotColor[category as keyof typeof dotColor] ?? "bg-slate-300"}`} />
                {category}
              </span>
              {task.dueTime ? <span>{task.dueTime}前</span> : task.startTime ? <span>{task.startTime}</span> : null}
              {showEstimatedTime && task.estimatedMinutes ? <span>预计{task.estimatedMinutes}分钟</span> : null}
              {task.priority === "high" ? <span className="rounded-[6px] bg-[#FFF1F0] px-1.5 py-0.5 text-[#D9655B]">重要</span> : null}
              {completed && task.completedAt ? <span>{formatTime(task.completedAt)} 完成</span> : null}
            </div>
          </button>

          <div className="relative shrink-0">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[#6B7280] hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="更多操作"
            >
              <MoreHorizontal size={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-[12px] border border-[#E9EBEF] bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {onUpdate && <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); setEditOpen(true); }}><Edit3 size={16} />编辑</button>}
                {!completed && !inactive && onMove && <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setTargetDate(task.date); setMenuOpen(false); setDateOpen("move"); }}>移动日期</button>}
                {!completed && !inactive && onPostpone && <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onPostpone(task); }}>延期到明天</button>}
                {onCopy && <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setTargetDate(task.date); setMenuOpen(false); setDateOpen("copy"); }}>复制任务</button>}
                {task.evidenceRequirement !== "none" && <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onEvidence?.(task); }}>添加完成记录</button>}
                {inactive && <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onRestore?.(task); }}>恢复任务</button>}
                {!completed && !inactive && <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onCancel?.(task); }}>取消任务</button>}
                {onDelete && <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#D9655B] hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onDelete(task); }}><Trash2 size={16} />删除</button>}
              </div>
            )}
          </div>
        </div>
      </article>

      <Modal title="任务详情" open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <div className="space-y-3 text-sm text-[#6B7280] dark:text-slate-300">
          <div>
            <div className="text-lg font-semibold text-[#1F2329] dark:text-white">{task.title}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-[6px] bg-slate-100 px-2 py-1 dark:bg-slate-800">{category}</span>
              <span className="rounded-[6px] bg-slate-100 px-2 py-1 dark:bg-slate-800">{STATUS_LABEL[task.status]}</span>
              <span className="rounded-[6px] bg-slate-100 px-2 py-1 dark:bg-slate-800">优先级 {priorityText[task.priority]}</span>
              {task.estimatedMinutes ? <span className="rounded-[6px] bg-slate-100 px-2 py-1 dark:bg-slate-800">预计{task.estimatedMinutes}分钟</span> : null}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>日期：{task.date}</div>
            <div>时间：{task.startTime || task.dueTime || "未设置"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={completed ? "secondary" : "primary"} onClick={() => (completed ? onUndo?.(task) : onComplete?.(task))}>{completed ? "撤销完成" : "完成任务"}</Button>
            {onUpdate && <Button variant="secondary" icon={<Edit3 size={18} />} onClick={() => setEditOpen(true)}>编辑</Button>}
          </div>
          <CollapsibleSection id={`task-desc-${task.id}`} title="任务说明" defaultExpanded={false}>
            <p className="leading-6">{task.description || "没有填写任务说明。"}</p>
          </CollapsibleSection>
          <CollapsibleSection id={`task-evidence-${task.id}`} title="完成记录" count={evidence ? 1 : 0} defaultExpanded={false}>
            {evidence ? <p>{evidence.text || (evidence.imageIds?.length ? `已添加 ${evidence.imageIds.length} 张图片` : "已添加完成记录")}</p> : <p>还没有完成记录。</p>}
            {task.evidenceRequirement !== "none" && <Button className="mt-3" variant="secondary" onClick={() => onEvidence?.(task)}>{EVIDENCE_LABEL[task.evidenceRequirement]}</Button>}
          </CollapsibleSection>
          <CollapsibleSection id={`task-history-${task.id}`} title="任务历史" count={task.postponeHistory?.length ?? 0} defaultExpanded={false}>
            {task.postponeHistory?.length ? (
              <div className="space-y-2">
                {task.postponeHistory.map((record) => (
                  <div key={`${record.fromDate}-${record.toDate}-${record.postponedAt}`}>{record.fromDate} → {record.toDate}</div>
                ))}
              </div>
            ) : <p>暂无延期历史。</p>}
          </CollapsibleSection>
          <CollapsibleSection id={`task-more-${task.id}`} title="其他信息" defaultExpanded={false}>
            <div className="space-y-1">
              <div>创建：{formatTime(task.createdAt)}</div>
              <div>更新：{formatTime(task.updatedAt)}</div>
              {task.recurringTemplateId ? <div>来自周期任务</div> : null}
            </div>
          </CollapsibleSection>
        </div>
      </Modal>

      <Modal title="编辑任务" open={editOpen} onClose={() => setEditOpen(false)}>
        <form className="space-y-4" onSubmit={submitEdit}>
          <label className="block text-sm font-semibold">任务名称<input className={`${inputClass} mt-1`} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">日期<input className={`${inputClass} mt-1`} type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
            <label className="block text-sm font-semibold">分类<select className={`${inputClass} mt-1`} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value as Subject })}>{SUBJECTS.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
            <label className="block text-sm font-semibold">起始时间<input className={`${inputClass} mt-1`} type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label>
            <label className="block text-sm font-semibold">截止时间<input className={`${inputClass} mt-1`} type="time" value={draft.dueTime} onChange={(event) => setDraft({ ...draft, dueTime: event.target.value })} /></label>
            <label className="block text-sm font-semibold">预计分钟<input className={`${inputClass} mt-1`} type="number" min="0" value={draft.estimatedMinutes} onChange={(event) => setDraft({ ...draft, estimatedMinutes: event.target.value })} /></label>
            <label className="block text-sm font-semibold">优先级<select className={`${inputClass} mt-1`} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as StudyTask["priority"] })}><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></label>
          </div>
          <label className="block text-sm font-semibold">任务说明<textarea className={`${inputClass} mt-1 min-h-24`} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <Button className="w-full" icon={<Save size={18} />}>保存</Button>
        </form>
      </Modal>

      <Modal title={dateOpen === "move" ? "移动日期" : "复制任务"} open={Boolean(dateOpen)} onClose={() => setDateOpen(null)}>
        <div className="space-y-4">
          <label className="block text-sm font-semibold">选择日期<input className={`${inputClass} mt-1`} type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
          <Button className="w-full" onClick={submitDateAction}>{dateOpen === "move" ? "确认移动" : "确认复制"}</Button>
        </div>
      </Modal>
    </>
  );
}
