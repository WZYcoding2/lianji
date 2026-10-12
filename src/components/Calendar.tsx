import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '../lib/cx';
import { addDays, addMonths, dayKey, startOfDay, startOfWeek, WEEKDAYS_SHORT } from '../lib/date';

export function MonthCalendar({
  month,
  onMonthChange,
  marks,
  selected,
  onSelect,
  weekStart,
}: {
  month: number;
  onMonthChange: (m: number) => void;
  marks: Map<string, number>;
  selected: string | null;
  onSelect: (key: string | null) => void;
  weekStart: number;
}) {
  const m = new Date(month);
  const todayKey = dayKey(Date.now());
  const gridStart = startOfWeek(month, weekStart);
  const nextMonth = addMonths(month, 1);
  const weeks = Math.ceil((startOfDay(nextMonth - 1) - gridStart) / 86400000 / 7 + 0.0001);
  const days: number[] = [];
  for (let i = 0; i < weeks * 7; i++) days.push(addDays(gridStart, i));
  const headers = Array.from({ length: 7 }, (_, i) => WEEKDAYS_SHORT[(i + weekStart) % 7]);
  const isCurrent = month === addMonths(Date.now(), 0);

  return (
    <div className="cal">
      <div className="cal-head">
        <div className="cal-title">
          {m.getFullYear()}年{m.getMonth() + 1}月
        </div>
        {!isCurrent && (
          <button className="btn btn-sm btn-tinted" onClick={() => onMonthChange(addMonths(Date.now(), 0))}>
            本月
          </button>
        )}
        <button className="icon-btn accent" aria-label="上个月" onClick={() => onMonthChange(addMonths(month, -1))}>
          <ChevronLeft size={22} />
        </button>
        <button className="icon-btn accent" aria-label="下个月" onClick={() => onMonthChange(addMonths(month, 1))}>
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="cal-grid">
        {headers.map((h) => (
          <div key={h} className="cal-wd">
            {h}
          </div>
        ))}
        {days.map((ts) => {
          const key = dayKey(ts);
          const inMonth = ts >= month && ts < nextMonth;
          const count = marks.get(key) ?? 0;
          return (
            <button
              key={key}
              className={cx(
                'cal-day num',
                !inMonth && 'other',
                count > 0 && 'trained',
                key === todayKey && 'today',
                key === selected && 'selected',
              )}
              onClick={() => onSelect(key === selected ? null : key)}
            >
              {new Date(ts).getDate()}
              {count > 1 && <span className="cal-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
