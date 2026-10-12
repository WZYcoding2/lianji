import { useMemo, useState } from 'react';
import { CalendarDays, Play, X } from 'lucide-react';
import { Page } from '../components/Page';
import { MonthCalendar } from '../components/Calendar';
import { Empty } from '../components/Controls';
import { WorkoutCard } from '../components/WorkoutCard';
import { useData } from '../data/DataProvider';
import { useSettings } from '../store/settings';
import { addMonths, dayKey, fmtMonthDay, parseDayKey, startOfMonth } from '../lib/date';
import { fmtHours, fmtVolume } from '../lib/format';
import { workoutDuration, workoutVolume } from '../lib/stats';
import { startWorkout } from '../lib/actions';
import { emptyActive } from '../lib/draft';

export function HistoryScreen() {
  const { workouts, exMap } = useData();
  const weekStart = useSettings((s) => s.weekStart);
  const unit = useSettings((s) => s.unit);
  const [month, setMonth] = useState(() => startOfMonth(Date.now()));
  const [day, setDay] = useState<string | null>(null);

  const marks = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of workouts) {
      const k = dayKey(w.startedAt);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [workouts]);

  const end = addMonths(month, 1);
  const monthList = workouts.filter((w) => w.startedAt >= month && w.startedAt < end);
  const shown = day ? workouts.filter((w) => dayKey(w.startedAt) === day) : monthList;
  const secs = monthList.reduce((n, w) => n + workoutDuration(w), 0);
  const vol = monthList.reduce((n, w) => n + workoutVolume(w, exMap), 0);
  const v = fmtVolume(vol, unit);
  const days = new Set(monthList.map((w) => dayKey(w.startedAt))).size;

  return (
    <Page title="历史" large>
      <div className="card">
        <MonthCalendar
          month={month}
          onMonthChange={(m) => {
            setMonth(m);
            setDay(null);
          }}
          marks={marks}
          selected={day}
          onSelect={(k) => {
            setDay(k);
            if (k) {
              const ts = parseDayKey(k);
              if (ts < month || ts >= end) setMonth(startOfMonth(ts));
            }
          }}
          weekStart={weekStart}
        />
      </div>

      <div className="mini-stats">
        <div>
          <b className="num">{monthList.length}</b>
          <span>次训练</span>
        </div>
        <div>
          <b className="num">{days}</b>
          <span>训练天数</span>
        </div>
        <div>
          <b className="num">{fmtHours(secs)}</b>
          <span>小时</span>
        </div>
        <div>
          <b className="num">{v.value}</b>
          <span>{v.unit === '吨' ? '吨容量' : `${v.unit} 容量`}</span>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">
          {day ? fmtMonthDay(parseDayKey(day)) : `${new Date(month).getMonth() + 1}月记录`}
        </div>
        {day && (
          <button className="section-link" onClick={() => setDay(null)}>
            <X size={16} />
            显示整月
          </button>
        )}
      </div>

      {shown.map((w) => (
        <WorkoutCard key={w.id} w={w} />
      ))}

      {!shown.length && (
        <Empty
          icon={<CalendarDays size={28} />}
          title={workouts.length ? (day ? '这天没有训练' : '这个月还没有训练') : '还没有训练记录'}
          text={workouts.length ? '休息也是训练的一部分' : '完成第一次训练后，会在这里看到记录'}
          action={
            !workouts.length && (
              <button className="btn btn-primary btn-md" onClick={() => void startWorkout(emptyActive())}>
                <Play size={18} fill="currentColor" />
                开始训练
              </button>
            )
          }
        />
      )}
    </Page>
  );
}
