export const DAY_MS = 86400000;
export const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
export const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** weekStart: 1 = 周一，0 = 周日 */
export function startOfWeek(ts: number, weekStart: number): number {
  const d = new Date(startOfDay(ts));
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

export function startOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function addMonths(ts: number, n: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 10月12日 */
export function fmtMonthDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 2026年10月12日 */
export function fmtFullDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 今年内省略年份 */
export function fmtSmartDate(ts: number): string {
  const d = new Date(ts);
  return d.getFullYear() === new Date().getFullYear() ? fmtMonthDay(ts) : fmtFullDate(ts);
}

export function fmtWeekday(ts: number): string {
  return WEEKDAYS[new Date(ts).getDay()];
}

/** 今天 / 昨天 / 3天前 / 10月2日 */
export function fmtRelativeDay(ts: number): string {
  const days = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY_MS);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days === 2) return '前天';
  if (days > 0 && days < 7) return `${days}天前`;
  return fmtSmartDate(ts);
}

/** 用于 <input type="datetime-local"> */
export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): number | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

export function defaultWorkoutName(ts = Date.now()): string {
  const h = new Date(ts).getHours();
  if (h < 5) return '深夜训练';
  if (h < 11) return '早晨训练';
  if (h < 14) return '午间训练';
  if (h < 18) return '下午训练';
  return '晚间训练';
}
