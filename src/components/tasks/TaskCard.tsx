import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileCheck2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  TimerReset,
  XCircle,
} from "lucide-react";
import { EVIDENCE_LABEL, STATUS_LABEL, StudySession, StudyTask, TaskEvidence, TaskTimerState } from "../../types/task";
import { formatTime } from "../../utils/date";
import { formatDuration, getDisplayedSeconds } from "../../utils/timer";
import { Button } from "../common/Button";
import { subjectStyles } from "./subjectStyles";

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
  compact?: boolean;
  admin?: boolean;
}

const priorityStyle = {
  high: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200",
  medium: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-200",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const priorityLabel = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
};

const statusStyle = {
  pending: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  in_progress: "border-sky-200 bg-sky-50/70 dark:border-sky-800 dark:bg-sky-950/30",
  completed: "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30",
  overdue: "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/30",
  postponed: "border-orange-200 bg-orange-50/70 dark:border-orange-900 dark:bg-orange-950/30",
  abandoned: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-900/60",
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
  compact = false,
  admin = false,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = subjectStyles[task.subject] ?? subjectStyles["其他"];
  const SubjectIcon = style.icon;
  const running = timerState?.taskId === task.id && timerState.running;
  const elapsed = getDisplayedSeconds(task, timerState);
  const completed = task.status === "completed";
  const disabled = task.status === "abandoned" || task.status === "postponed";

  return (
    <article className={`rounded-2xl border p-4 transition ${statusStyle[task.status]} ${!completed ? "hover:shadow-soft" : ""}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 ${style.className}`}>
              <SubjectIcon size={14} />
              {task.subject}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityStyle[task.priority]}`}>{priorityLabel[task.priority]}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-700">
              {task.status === "overdue" ? <AlertTriangle size={14} /> : completed ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
              {STATUS_LABEL[task.status]}
            </span>
            {task.evidenceRequirement !== "none" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200">
                <FileCheck2 size={14} />
                {evidence ? "已交证明" : EVIDENCE_LABEL[task.evidenceRequirement]}
              </span>
            )}
          </div>
          <h3 className={`break-words font-bold text-slate-900 dark:text-white ${compact ? "text-base" : "text-lg"}`}>{task.title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>{task.date}</span>
            {task.originalScheduledDate && task.originalScheduledDate !== task.date && <span>原计划：{task.originalScheduledDate}</span>}
            {showEstimatedTime && task.estimatedMinutes !== undefined && <span>预计 {task.estimatedMinutes} 分钟</span>}
            <span>实际 {formatDuration(elapsed)}</span>
            {task.completedAt && <span className="text-emerald-600 dark:text-emerald-300">{formatTime(task.completedAt)} 完成</span>}
          </div>
        </div>
        {(onComplete || onUndo || onStart) && (
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap md:max-w-72 md:justify-end">
            {!completed && !disabled && onStart && (
              <Button variant="secondary" icon={running ? <Pause size={18} /> : <Play size={18} />} onClick={() => (running ? onPause?.(task) : onStart(task))}>
                {running ? "暂停" : elapsed > 0 ? "继续" : "开始"}
              </Button>
            )}
            {!completed && !disabled && onComplete && (
              <Button variant="success" icon={<CheckCircle2 size={18} />} onClick={() => onComplete(task)}>
                完成打卡
              </Button>
            )}
            {completed && onUndo && (
              <Button variant="secondary" icon={<RotateCcw size={18} />} onClick={() => onUndo(task)}>
                撤销完成
              </Button>
            )}
            {!completed && !disabled && onPostpone && (
              <Button variant="ghost" icon={<SkipForward size={18} />} onClick={() => onPostpone(task)}>
                延期
              </Button>
            )}
            {!completed && !disabled && onAbandon && (
              <Button variant="ghost" icon={<XCircle size={18} />} onClick={() => onAbandon(task)}>
                放弃
              </Button>
            )}
            {disabled && onRestore && (
              <Button variant="secondary" icon={<RotateCcw size={18} />} onClick={() => onRestore(task)}>
                恢复
              </Button>
            )}
          </div>
        )}
      </div>

      <button
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-300"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {expanded ? "收起详情" : "展开详情"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 rounded-2xl bg-white/70 p-4 text-sm text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
          {task.description && <p className="leading-6">{task.description}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>创建时间：{new Date(task.createdAt).toLocaleString()}</div>
            <div>更新时间：{new Date(task.updatedAt).toLocaleString()}</div>
            <div>来源周期任务：{task.recurringTemplateId ? "是" : "否"}</div>
            <div>计时记录：{sessions.filter((session) => session.taskId === task.id).length} 段</div>
          </div>
          {task.postponeHistory?.length ? (
            <div>
              延期记录：
              {task.postponeHistory.map((record) => (
                <div key={`${record.fromDate}-${record.postponedAt}`} className="mt-1">
                  {record.fromDate} 到 {record.toDate}
                  {record.reason ? `，原因：${record.reason}` : ""}
                </div>
              ))}
            </div>
          ) : null}
          {evidence && <div>完成证明：{evidence.text || evidence.numberValue || evidence.imageIds?.length ? "已提交，可在管理页查看或重新编辑。" : "暂无内容"}</div>}
          <div className="flex flex-wrap gap-2">
            {task.evidenceRequirement !== "none" && onEvidence && (
              <Button variant="secondary" icon={<FileCheck2 size={18} />} onClick={() => onEvidence(task)}>
                {evidence ? "编辑证明" : "提交证明"}
              </Button>
            )}
            {!completed && onResetTimer && (
              <Button variant="ghost" icon={<TimerReset size={18} />} onClick={() => onResetTimer(task)}>
                重置计时
              </Button>
            )}
            {admin && <span className="inline-flex items-center px-3 text-xs text-slate-400">可在添加任务页面调整</span>}
          </div>
        </div>
      )}
    </article>
  );
}
