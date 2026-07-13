import {
  Atom,
  BookOpen,
  Calculator,
  Dumbbell,
  FlaskConical,
  Globe2,
  Languages,
  LucideIcon,
} from "lucide-react";
import { Subject } from "../../types/task";

export const subjectStyles: Record<Subject, { icon: LucideIcon; className: string }> = {
  语文: { icon: BookOpen, className: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-200" },
  数学: { icon: Calculator, className: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-200" },
  英语: { icon: Languages, className: "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200" },
  物理: { icon: Atom, className: "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-200" },
  化学: { icon: FlaskConical, className: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200" },
  地理: { icon: Globe2, className: "bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-500/15 dark:text-orange-200" },
  运动: { icon: Dumbbell, className: "bg-lime-50 text-lime-700 ring-lime-100 dark:bg-lime-500/15 dark:text-lime-200" },
};
