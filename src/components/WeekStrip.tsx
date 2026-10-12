import { useData } from '../data/DataProvider';
import { cx } from '../lib/cx';
import { WEEKDAYS_SHORT } from '../lib/date';
import { haptic } from '../lib/device';
import { dayName, isTrainingDay, weekOrder } from '../lib/plan';
import type { PlanDay } from '../types';

/** 一周七天的安排：训练日显示名称，其余显示「休」 */
export function WeekStrip({
  days,
  weekStart,
  selected,
  onSelect,
  compact,
}: {
  days: PlanDay[];
  weekStart: number;
  selected?: number;
  onSelect?: (wd: number) => void;
  compact?: boolean;
}) {
  const { exMap } = useData();
  const today = new Date().getDay();
  return (
    <div className={cx('wstrip', compact && 'compact')}>
      {weekOrder(weekStart).map((wd) => {
        const d = days[wd];
        const train = isTrainingDay(d);
        const cls = cx('wcell', train && 'train', selected === wd && 'sel', wd === today && 'today');
        const body = (
          <>
            <span className="wcell-wd">{WEEKDAYS_SHORT[wd]}</span>
            <span className="wcell-name">{train ? dayName(d, exMap) : '休'}</span>
          </>
        );
        return onSelect ? (
          <button
            key={wd}
            className={cls}
            onClick={() => {
              haptic();
              onSelect(wd);
            }}
          >
            {body}
          </button>
        ) : (
          <div key={wd} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
