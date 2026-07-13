import { CheckCircle2, Clock3, RotateCcw } from "lucide-react";
import { StudyTask } from "../../types/task";
import { formatTime } from "../../utils/date";
import { Button } from "../common/Button";
import { subjectStyles } from "./subjectStyles";

interface TaskCardProps {
  task: StudyTask;
  showEstimatedTime: boolean;
  onComplete?: (task: StudyTask) => void;
  onUndo?: (task: StudyTask) => void;
  compact?: boolean;
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

export function TaskCard({ task, showEstimatedTime, onComplete, onUndo, compact = false }: TaskCardProps) {
  const style = subjectStyles[task.subject];
  const SubjectIcon = style.icon;

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        task.completed
          ? "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-slate-100 bg-white hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 ${style.className}`}>
              <SubjectIcon size={14} />
              {task.subject}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityStyle[task.priority]}`}>
              {priorityLabel[task.priority]}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                task.completed
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {task.completed ? "已完成" : "未完成"}
            </span>
          </div>
          <h3 className={`font-bold text-slate-900 dark:text-white ${compact ? "text-base" : "text-lg"}`}>
            {task.title}
          </h3>
          {task.description && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{task.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            {showEstimatedTime && task.estimatedMinutes !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Clock3 size={16} />
                预计 {task.estimatedMinutes} 分钟
              </span>
            )}
            {task.completedAt && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 size={16} />
                {formatTime(task.completedAt)} 完成
              </span>
            )}
          </div>
        </div>
        {(onComplete || onUndo) && (
          <div className="flex shrink-0 gap-2 sm:flex-col">
            {!task.completed && onComplete && (
              <Button variant="success" icon={<CheckCircle2 size={18} />} onClick={() => onComplete(task)} className="flex-1 sm:flex-none">
                完成打卡
              </Button>
            )}
            {task.completed && onUndo && (
              <Button variant="secondary" icon={<RotateCcw size={18} />} onClick={() => onUndo(task)} className="flex-1 sm:flex-none">
                取消完成
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
