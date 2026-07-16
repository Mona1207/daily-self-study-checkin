import { useState } from "react";
import { Check, Clock3, MoreHorizontal, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { EVIDENCE_LABEL, STATUS_LABEL, StudySession, StudyTask, TaskEvidence, TaskTimerState } from "../../types/task";
import { formatTime } from "../../utils/date";
import { formatDuration, getDisplayedSeconds } from "../../utils/timer";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";

interface TaskCardProps {
  task: StudyTask;
  showEstimatedTime: boolean;
  timerState?: TaskTimerState;
  sessions?: StudySession[];
  evidence?: TaskEvidence;
  onComplete?: (task: StudyTask) => void;
  onUndo?: (task: StudyTask) => void;
  onStart?: (task: StudyTask) => void;
  onPause?: (task: StudyTask) => void;
  onResetTimer?: (task: StudyTask) => void;
  onEvidence?: (task: StudyTask) => void;
  onPostpone?: (task: StudyTask) => void;
  onAbandon?: (task: StudyTask) => void;
  onRestore?: (task: StudyTask) => void;
  onDelete?: (task: StudyTask) => void;
  compact?: boolean;
  admin?: boolean;
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

export function TaskCard({
  task,
  showEstimatedTime,
  timerState,
  sessions = [],
  evidence,
  onComplete,
  onUndo,
  onStart,
  onPause,
  onResetTimer,
  onEvidence,
  onPostpone,
  onAbandon,
  onRestore,
  onDelete,
}: TaskCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const completed = task.status === "completed";
  const running = timerState?.taskId === task.id && timerState.running;
  const elapsed = getDisplayedSeconds(task, timerState);
  const category = task.subject || "其他";
  const isInactive = task.status === "postponed" || task.status === "cancelled" || task.status === "abandoned";

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
            <div className={`break-words text-base font-semibold ${completed ? "text-[#9CA3AF] line-through" : "text-[#1F2329] dark:text-slate-100"}`}>
              {task.title}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B7280] dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${dotColor[category as keyof typeof dotColor] ?? "bg-slate-300"}`} />
                {category}
              </span>
              {showEstimatedTime && task.estimatedMinutes ? <span>{task.estimatedMinutes}分钟</span> : null}
              {task.dueTime ? <span>{task.dueTime}前</span> : task.startTime ? <span>{task.startTime}</span> : null}
              {task.priority === "high" ? <span className="rounded-[6px] bg-[#FFF1F0] px-1.5 py-0.5 text-[#D9655B]">重要</span> : null}
              {completed && task.completedAt ? <span>{formatTime(task.completedAt)} 完成</span> : null}
              {running ? <span className="rounded-[6px] bg-[#EEF2FF] px-1.5 py-0.5 text-[#4F6EF7]">进行中 {formatDuration(elapsed)}</span> : null}
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
                {!completed && !isInactive && (
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); running ? onPause?.(task) : onStart?.(task); }}>
                    {running ? <Pause size={16} /> : <Play size={16} />}
                    {running ? "暂停" : "开始"}
                  </button>
                )}
                {!completed && !isInactive && <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onPostpone?.(task); }}>延期到明天</button>}
                {task.evidenceRequirement !== "none" && <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onEvidence?.(task); }}>添加完成记录</button>}
                {!completed && onResetTimer && <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onResetTimer(task); }}><RotateCcw size={16} />重置计时</button>}
                {isInactive && <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onRestore?.(task); }}>恢复任务</button>}
                {!completed && !isInactive && <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onAbandon?.(task); }}>取消任务</button>}
                {onDelete && <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#D9655B] hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onDelete(task); }}><Trash2 size={16} />删除</button>}
              </div>
            )}
          </div>
        </div>
      </article>

      <Modal title="任务详情" open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <div className="space-y-4 text-sm text-[#6B7280] dark:text-slate-300">
          <div>
            <div className="text-lg font-semibold text-[#1F2329] dark:text-white">{task.title}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-[6px] bg-slate-100 px-2 py-1 dark:bg-slate-800">{category}</span>
              <span className="rounded-[6px] bg-slate-100 px-2 py-1 dark:bg-slate-800">{STATUS_LABEL[task.status]}</span>
              <span className="rounded-[6px] bg-slate-100 px-2 py-1 dark:bg-slate-800">优先级 {priorityText[task.priority]}</span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>日期：{task.date}</div>
            <div>时间：{task.startTime || task.dueTime || "未设置"}</div>
            <div>预计：{task.estimatedMinutes ? `${task.estimatedMinutes}分钟` : "未设置"}</div>
            <div>专注：{formatDuration(elapsed)}</div>
          </div>
          {task.description && <p className="leading-6">{task.description}</p>}
          {task.postponeHistory?.length ? <div>延期历史：{task.postponeHistory.length} 次</div> : null}
          <div>专注记录：{sessions.filter((session) => session.taskId === task.id).length} 段</div>
          {evidence && <div>完成记录：{evidence.text || evidence.imageIds?.length ? "已添加" : "已创建"}</div>}
          <div className="flex flex-wrap gap-2">
            {!completed && !isInactive && <Button icon={running ? <Pause size={18} /> : <Play size={18} />} onClick={() => (running ? onPause?.(task) : onStart?.(task))}>{running ? "暂停" : "开始"}</Button>}
            {task.evidenceRequirement !== "none" && <Button variant="secondary" onClick={() => onEvidence?.(task)}>{EVIDENCE_LABEL[task.evidenceRequirement]}</Button>}
          </div>
        </div>
      </Modal>
    </>
  );
}
