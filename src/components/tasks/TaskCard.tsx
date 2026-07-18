import { useState } from "react";
import { Bell, Check, Edit3, GripVertical, MoreHorizontal, Repeat2, Trash2 } from "lucide-react";
import { EVIDENCE_LABEL, STATUS_LABEL, StudyTask, TaskEvidence } from "../../types/task";
import { formatTime } from "../../utils/date";
import { Button } from "../common/Button";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { Modal } from "../common/Modal";
import { TaskEditorSheet } from "./TaskEditorSheet";

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
  onDragStart?: (task: StudyTask) => void;
  onDropTask?: (task: StudyTask) => void;
  compact?: boolean;
}

const priorityText = {
  none: "无",
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
  onDragStart,
  onDropTask,
  compact,
}: TaskCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState<"move" | "copy" | null>(null);
  const [targetDate, setTargetDate] = useState(task.date);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const completed = task.status === "completed";
  const category = task.subject || "其他";
  const inactive = task.status === "postponed" || task.status === "cancelled";
  const subtaskTotal = task.subtasks?.length ?? 0;
  const subtaskDone = task.subtasks?.filter((item) => item.completed).length ?? 0;

  const submitDateAction = () => {
    if (dateOpen === "move") onMove?.(task, targetDate);
    if (dateOpen === "copy") onCopy?.(task, targetDate);
    setDateOpen(null);
  };

  const handleTouchEnd = (clientX: number) => {
    if (touchStartX === null) return;
    const diff = clientX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(diff) < 72) return;
    if (diff > 0 && !completed && !inactive) onComplete?.(task);
    if (diff < 0) onDelete?.(task);
  };

  return (
    <>
      <article
        className={`relative border-b border-[var(--color-border)] bg-[var(--color-surface)] px-0 ${compact ? "py-2" : "py-3"} transition duration-[var(--motion-fast)] last:border-b-0 ${completed ? "opacity-75" : ""}`}
        draggable={Boolean(onDragStart && onDropTask)}
        onDragStart={() => onDragStart?.(task)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => onDropTask?.(task)}
        onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        {task.priority === "high" && !completed ? <span className="absolute left-0 top-3 h-8 w-[2px] rounded-full bg-[var(--color-danger)]" /> : null}
        <div className="flex items-start gap-3">
          {onDragStart && onDropTask ? (
            <span className="mt-1 hidden h-8 w-5 shrink-0 cursor-grab items-center justify-center text-[var(--color-text-muted)] sm:flex" aria-hidden="true">
              <GripVertical size={17} />
            </span>
          ) : null}
          <button
            className={`ml-3 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm transition ${
              completed ? "border-[var(--color-success)] bg-[var(--color-success)] text-white" : "border-[var(--color-border)] bg-[var(--color-surface)] text-transparent"
            }`}
            onClick={() => (completed ? onUndo?.(task) : onComplete?.(task))}
            aria-label={completed ? "撤销完成" : "完成任务"}
          >
            <Check size={16} />
          </button>

          <button className="min-w-0 flex-1 text-left" onClick={() => setDetailsOpen(true)}>
            <div className={`break-words text-[15px] font-medium leading-[22px] ${completed ? "text-[var(--color-text-muted)] line-through decoration-[0.8px]" : "text-[var(--color-text)]"}`}>
              {task.title}
              {suggested && !completed ? <span className="ml-2 rounded-[var(--radius-xs)] bg-[var(--color-brand-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-brand)]">建议先做</span> : null}
            </div>
            <div className="mt-0.5 flex items-center gap-2 overflow-hidden text-[13px] leading-[18px] text-[var(--color-text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${dotColor[category as keyof typeof dotColor] ?? "bg-slate-300"}`} />
                {category}
              </span>
              {task.allDay || (!task.startTime && !task.dueTime) ? <span>全天</span> : task.dueTime ? <span>{task.dueTime}前</span> : task.startTime ? <span>{task.startTime}</span> : null}
              {showEstimatedTime && task.estimatedMinutes ? <span>预计{task.estimatedMinutes}分钟</span> : null}
              {subtaskTotal > 0 ? <span>{subtaskDone}/{subtaskTotal} 子任务</span> : null}
              {task.recurringTemplateId || task.repeatRule ? <Repeat2 size={13} aria-label="周期任务" /> : null}
              {task.reminder?.enabled ? <Bell size={13} aria-label="已设置提醒" /> : null}
              {completed && task.completedAt ? <span>{formatTime(task.completedAt)} 完成</span> : null}
            </div>
          </button>

          <div className="relative shrink-0">
            <button
              className="mr-1 flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="更多操作"
            >
              <MoreHorizontal size={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-30 w-64 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-float)]">
                <div className="grid grid-cols-2 gap-1">
                  {onUpdate && <button className="flex min-h-10 items-center gap-2 rounded-[9px] px-3 text-left text-sm hover:bg-[var(--color-surface-muted)]" onClick={() => { setMenuOpen(false); setEditOpen(true); }}><Edit3 size={16} />编辑</button>}
                  {!completed && !inactive && onMove && <button className="min-h-10 rounded-[9px] px-3 text-left text-sm hover:bg-[var(--color-surface-muted)]" onClick={() => { setTargetDate(task.date); setMenuOpen(false); setDateOpen("move"); }}>移动日期</button>}
                  {!completed && !inactive && onPostpone && <button className="min-h-10 rounded-[9px] px-3 text-left text-sm hover:bg-[var(--color-surface-muted)]" onClick={() => { setMenuOpen(false); onPostpone(task); }}>延期明天</button>}
                  {onCopy && <button className="min-h-10 rounded-[9px] px-3 text-left text-sm hover:bg-[var(--color-surface-muted)]" onClick={() => { setTargetDate(task.date); setMenuOpen(false); setDateOpen("copy"); }}>复制任务</button>}
                  {task.evidenceRequirement !== "none" && <button className="min-h-10 rounded-[9px] px-3 text-left text-sm hover:bg-[var(--color-surface-muted)]" onClick={() => { setMenuOpen(false); onEvidence?.(task); }}>完成记录</button>}
                  {inactive && <button className="min-h-10 rounded-[9px] px-3 text-left text-sm hover:bg-[var(--color-surface-muted)]" onClick={() => { setMenuOpen(false); onRestore?.(task); }}>恢复任务</button>}
                  {!completed && !inactive && <button className="min-h-10 rounded-[9px] px-3 text-left text-sm hover:bg-[var(--color-surface-muted)]" onClick={() => { setMenuOpen(false); onCancel?.(task); }}>取消任务</button>}
                  {onDelete && <button className="flex min-h-10 items-center gap-2 rounded-[9px] px-3 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-surface-muted)]" onClick={() => { setMenuOpen(false); onDelete(task); }}><Trash2 size={16} />删除</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      <Modal title="任务详情" open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <div className="text-lg font-semibold text-[var(--color-text)]">{task.title}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-[8px] bg-[var(--color-surface)] px-3 py-2"><div className="text-xs text-[var(--color-text-muted)]">分类</div><div className="mt-1 font-semibold text-[var(--color-text)]">{category}</div></div>
              <div className="rounded-[8px] bg-[var(--color-surface)] px-3 py-2"><div className="text-xs text-[var(--color-text-muted)]">状态</div><div className="mt-1 font-semibold text-[var(--color-text)]">{STATUS_LABEL[task.status]}</div></div>
              <div className="rounded-[8px] bg-[var(--color-surface)] px-3 py-2"><div className="text-xs text-[var(--color-text-muted)]">优先级</div><div className="mt-1 font-semibold text-[var(--color-text)]">{priorityText[task.priority]}</div></div>
              <div className="rounded-[8px] bg-[var(--color-surface)] px-3 py-2"><div className="text-xs text-[var(--color-text-muted)]">预计</div><div className="mt-1 font-semibold text-[var(--color-text)]">{task.estimatedMinutes ? `${task.estimatedMinutes}分钟` : "未设置"}</div></div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <div className="text-xs text-[var(--color-text-muted)]">日期</div>
              <div className="mt-1 text-[15px] font-semibold text-[var(--color-text)]">{task.date}</div>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <div className="text-xs text-[var(--color-text-muted)]">时间</div>
              <div className="mt-1 text-[15px] font-semibold text-[var(--color-text)]">{task.startTime || task.dueTime || "未设置"}</div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant={completed ? "secondary" : "primary"} onClick={() => (completed ? onUndo?.(task) : onComplete?.(task))}>{completed ? "撤销完成" : "完成任务"}</Button>
            {onUpdate && <Button variant="secondary" icon={<Edit3 size={18} />} onClick={() => setEditOpen(true)}>编辑</Button>}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <CollapsibleSection id={`task-desc-${task.id}`} title="任务说明" defaultExpanded={false}>
              <p className="leading-6">{task.description || "没有填写任务说明。"}</p>
            </CollapsibleSection>
            <CollapsibleSection id={`task-subtasks-${task.id}`} title="子任务" count={subtaskTotal} defaultExpanded={subtaskTotal > 0}>
              {subtaskTotal ? (
                <div className="grid gap-2">
                  {task.subtasks?.map((subtask) => (
                    <label key={subtask.id} className="flex items-center gap-2 rounded-[10px] bg-[var(--color-surface-muted)] p-3">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={(event) =>
                          onUpdate?.(task, {
                            subtasks: task.subtasks?.map((item) => (item.id === subtask.id ? { ...item, completed: event.target.checked } : item)),
                          })
                        }
                      />
                      <span className={subtask.completed ? "text-[var(--color-text-muted)] line-through" : ""}>{subtask.title}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p>还没有子任务。</p>
              )}
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
          </div>
          <CollapsibleSection id={`task-more-${task.id}`} title="其他信息" defaultExpanded={false}>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>创建：{formatTime(task.createdAt)}</div>
              <div>更新：{formatTime(task.updatedAt)}</div>
              {task.recurringTemplateId ? <div>来自周期任务</div> : null}
            </div>
          </CollapsibleSection>
        </div>
      </Modal>

      <TaskEditorSheet
        open={editOpen}
        mode="edit"
        task={task}
        onClose={() => setEditOpen(false)}
        onUpdate={onUpdate}
      />

      <Modal title={dateOpen === "move" ? "移动日期" : "复制任务"} open={Boolean(dateOpen)} onClose={() => setDateOpen(null)}>
        <div className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
          <label className="block text-sm font-semibold">选择日期<input className="mt-2 min-h-11 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-brand)]" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
          <Button className="w-full" onClick={submitDateAction}>{dateOpen === "move" ? "确认移动" : "确认复制"}</Button>
        </div>
      </Modal>
    </>
  );
}
