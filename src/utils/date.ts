export const pad = (value: number): string => String(value).padStart(2, "0");

export const toDateString = (date: Date): string => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const getTodayString = (): string => toDateString(new Date());

export const parseLocalDate = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const getWeekdayName = (date: Date): string => {
  return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
};

export const formatChineseDate = (date: Date): string => {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

export const formatTime = (iso?: string): string => {
  if (!iso) return "";
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const getMonthDays = (year: number, monthIndex: number): Date[] => {
  const first = new Date(year, monthIndex, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

export const isSameMonth = (date: Date, year: number, monthIndex: number): boolean => {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了，注意休息";
  if (hour < 12) return "上午好";
  if (hour < 18) return "下午好";
  return "晚上好";
};

export const getCurrentWeekRange = (): { start: Date; end: Date } => {
  const today = new Date();
  const start = addDays(today, today.getDay() === 0 ? -6 : 1 - today.getDay());
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};
