export type TaskFilter = "all" | "pending" | "done";

interface TaskFiltersProps {
  value: TaskFilter;
  onChange: (value: TaskFilter) => void;
}

const filters: Array<{ value: TaskFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "pending", label: "未完成" },
  { value: "done", label: "已完成" },
];

export function TaskFilters({ value, onChange }: TaskFiltersProps) {
  return (
    <div className="inline-grid grid-cols-3 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
      {filters.map((filter) => (
        <button
          key={filter.value}
          className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition ${
            value === filter.value
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-200"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-300"
          }`}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
