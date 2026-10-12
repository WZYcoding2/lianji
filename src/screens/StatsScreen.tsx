import { useMemo, useState } from 'react';
import { ChartColumnBig, ChevronRight, Trophy } from 'lucide-react';
import { Page } from '../components/Page';
import { BarChart, Heatmap, HBars } from '../components/Charts';
import { Empty, ExerciseAvatar, Segmented } from '../components/Controls';
import { fmtPRValue } from '../components/SummaryOverlay';
import { useData } from '../data/DataProvider';
import { useSettings } from '../store/settings';
import { nav } from '../store/nav';
import { BODY_PARTS } from '../data/meta';
import { addDays, addMonths, dayKey, fmtRelativeDay, startOfMonth, startOfWeek, DAY_MS } from '../lib/date';
import { fmtHours, fmtNum, fmtVolume, kgToDisplay } from '../lib/format';
import { isCounted, PR_LABEL, workoutDuration, workoutSetCount, workoutVolume } from '../lib/stats';
import type { Workout } from '../types';

type Period = 7 | 30 | 90 | 365 | 0;
type TrendMetric = 'count' | 'hours' | 'volume';

export function StatsScreen() {
  const { workouts, exMap, index } = useData();
  const unit = useSettings((s) => s.unit);
  const weekStart = useSettings((s) => s.weekStart);
  const [period, setPeriod] = useState<Period>(30);
  const [trend, setTrend] = useState<TrendMetric>('count');
  const [gran, setGran] = useState<'week' | 'month'>('week');

  const now = Date.now();
  const from = period ? now - period * DAY_MS : 0;
  const inPeriod = useMemo(() => workouts.filter((w) => w.startedAt >= from), [workouts, from]);
  const prevPeriod = useMemo(
    () => (period ? workouts.filter((w) => w.startedAt >= from - period * DAY_MS && w.startedAt < from) : []),
    [workouts, from, period],
  );

  const sum = (list: Workout[]) => ({
    count: list.length,
    secs: list.reduce((n, w) => n + workoutDuration(w), 0),
    vol: list.reduce((n, w) => n + workoutVolume(w, exMap), 0),
    sets: list.reduce((n, w) => n + workoutSetCount(w), 0),
  });
  const cur = sum(inPeriod);
  const prev = sum(prevPeriod);
  const vol = fmtVolume(cur.vol, unit);

  const trendData = useMemo(() => {
    const buckets: { start: number; end: number; label: string; title: string }[] = [];
    if (gran === 'week') {
      const ws = startOfWeek(now, weekStart);
      for (let i = 11; i >= 0; i--) {
        const s = addDays(ws, -7 * i);
        const d = new Date(s);
        buckets.push({
          start: s,
          end: addDays(s, 7),
          label: i === 0 ? '本周' : `${d.getMonth() + 1}/${d.getDate()}`,
          title: i === 0 ? '本周' : i === 1 ? '上周' : `${d.getMonth() + 1}月${d.getDate()}日这周`,
        });
      }
    } else {
      const ms = startOfMonth(now);
      for (let i = 11; i >= 0; i--) {
        const s = addMonths(ms, -i);
        const d = new Date(s);
        buckets.push({
          start: s,
          end: addMonths(s, 1),
          label: `${d.getMonth() + 1}月`,
          title: i === 0 ? '本月' : `${d.getFullYear()}年${d.getMonth() + 1}月`,
        });
      }
    }
    return buckets.map((b) => {
      const list = workouts.filter((w) => w.startedAt >= b.start && w.startedAt < b.end);
      const value =
        trend === 'count'
          ? list.length
          : trend === 'hours'
            ? list.reduce((n, w) => n + workoutDuration(w), 0) / 3600
            : kgToDisplay(list.reduce((n, w) => n + workoutVolume(w, exMap), 0), unit);
      return { label: b.label, title: b.title, value };
    });
  }, [workouts, gran, trend, weekStart, exMap, unit, now]);

  const heat = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of workouts) {
      const k = dayKey(w.startedAt);
      m.set(k, (m.get(k) ?? 0) + Math.max(1, workoutSetCount(w)));
    }
    return m;
  }, [workouts]);

  const partSets = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of inPeriod)
      for (const we of w.exercises) {
        const bp = exMap.get(we.exerciseId)?.bodyPart ?? 'other';
        m.set(bp, (m.get(bp) ?? 0) + we.sets.filter(isCounted).length);
      }
    return BODY_PARTS.map((b) => ({ label: b.label, value: m.get(b.id) ?? 0, color: b.color })).filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [inPeriod, exMap]);

  const topExercises = useMemo(() => {
    const m = new Map<number, number>();
    for (const w of inPeriod) for (const we of w.exercises) m.set(we.exerciseId, (m.get(we.exerciseId) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [inPeriod]);

  const recentPRs = index.allPRs.slice(0, 8);

  const delta = (a: number, b: number, fmt: (v: number) => string) => {
    if (!period || (!a && !b)) return null;
    const d = a - b;
    if (Math.abs(d) < 1e-9) return <span className="delta">与上期持平</span>;
    return (
      <span className={d > 0 ? 'delta up' : 'delta down'}>
        {d > 0 ? '↑' : '↓'} {fmt(Math.abs(d))} <span className="delta-hint">较上期</span>
      </span>
    );
  };
  const pct = (a: number, b: number) => {
    if (!period || !b) return null;
    const p = ((a - b) / b) * 100;
    if (Math.abs(p) < 0.5) return <span className="delta">与上期持平</span>;
    return (
      <span className={p > 0 ? 'delta up' : 'delta down'}>
        {p > 0 ? '↑' : '↓'} {fmtNum(Math.abs(p), 0)}% <span className="delta-hint">较上期</span>
      </span>
    );
  };

  const fmtTrend = (v: number) =>
    trend === 'count' ? `${v} 次` : trend === 'hours' ? `${fmtNum(v, 1)} 小时` : `${fmtNum(v, 0)} ${unit}`;

  if (!workouts.length) {
    return (
      <Page title="数据" large>
        <Empty
          icon={<ChartColumnBig size={28} />}
          title="还没有数据"
          text="完成训练后，这里会显示训练频率、容量趋势、部位分布和个人纪录"
        />
      </Page>
    );
  }

  return (
    <Page title="数据" large>
      <div className="form-pad" style={{ paddingTop: 0 }}>
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: 7, label: '7天' },
            { value: 30, label: '30天' },
            { value: 90, label: '90天' },
            { value: 365, label: '1年' },
            { value: 0, label: '全部' },
          ]}
        />
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">训练次数</div>
          <div className="stat-value">
            <span className="num">{cur.count}</span>
            <small>次</small>
          </div>
          <div className="stat-foot">{delta(cur.count, prev.count, (v) => `${v} 次`) ?? ' '}</div>
        </div>
        <div className="stat">
          <div className="stat-label">训练时长</div>
          <div className="stat-value">
            <span className="num">{fmtHours(cur.secs)}</span>
            <small>小时</small>
          </div>
          <div className="stat-foot">{delta(cur.secs / 3600, prev.secs / 3600, (v) => `${fmtNum(v, 1)} 小时`) ?? ' '}</div>
        </div>
        <div className="stat">
          <div className="stat-label">总容量</div>
          <div className="stat-value">
            <span className="num">{vol.value}</span>
            <small>{vol.unit}</small>
          </div>
          <div className="stat-foot">{pct(cur.vol, prev.vol) ?? ' '}</div>
        </div>
        <div className="stat">
          <div className="stat-label">完成组数</div>
          <div className="stat-value">
            <span className="num">{cur.sets}</span>
            <small>组</small>
          </div>
          <div className="stat-foot">{delta(cur.sets, prev.sets, (v) => `${v} 组`) ?? ' '}</div>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">训练趋势</div>
        <Segmented
          small
          value={gran}
          onChange={setGran}
          options={[
            { value: 'week', label: '按周' },
            { value: 'month', label: '按月' },
          ]}
        />
      </div>
      <div className="card">
        <Segmented<TrendMetric>
          small
          value={trend}
          onChange={setTrend}
          className="chart-seg"
          options={[
            { value: 'count', label: '次数' },
            { value: 'hours', label: '时长' },
            { value: 'volume', label: '容量' },
          ]}
        />
        <BarChart key={gran + trend} data={trendData} format={fmtTrend} />
      </div>

      <div className="section-header">
        <div className="section-title">训练日历</div>
      </div>
      <div className="card">
        <Heatmap values={heat} weekStart={weekStart} weeks={18} />
      </div>

      {partSets.length > 0 && (
        <>
          <div className="section-header">
            <div className="section-title">部位分布</div>
            <span className="muted" style={{ fontSize: 13 }}>
              完成组数
            </span>
          </div>
          <div className="card">
            <HBars items={partSets} format={(v) => `${v}`} />
          </div>
        </>
      )}

      {topExercises.length > 0 && (
        <>
          <div className="section-header">
            <div className="section-title">常练动作</div>
          </div>
          <div className="list" style={{ ['--sep-inset' as string]: '70px' }}>
            {topExercises.map(([id, n], i) => {
              const ex = exMap.get(id);
              return (
                <button className="row" key={id} onClick={() => nav.push({ name: 'exerciseDetail', id })}>
                  <span className="rank num">{i + 1}</span>
                  <ExerciseAvatar ex={ex} size="sm" />
                  <div className="row-main">
                    <div className="row-title">{ex?.name ?? '已删除的动作'}</div>
                  </div>
                  <span className="row-value num">{n} 次</span>
                  <ChevronRight size={18} className="chev" />
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="section-header">
        <div className="section-title">最近的个人纪录</div>
      </div>
      {recentPRs.length ? (
        <div className="list" style={{ ['--sep-inset' as string]: '62px' }}>
          {recentPRs.map((g) => (
            <button
              className="row"
              key={`${g.workoutId}:${g.exerciseId}`}
              onClick={() => nav.push({ name: 'exerciseDetail', id: g.exerciseId })}
            >
              <span className="pr-icon">
                <Trophy size={18} />
              </span>
              <div className="row-main">
                <div className="row-title">{exMap.get(g.exerciseId)?.name ?? '已删除的动作'}</div>
                <div className="row-sub">
                  {g.hits.map((h) => PR_LABEL[h.kind]).join(' · ')} · {fmtRelativeDay(g.date)}
                </div>
              </div>
              <span className="row-value num pr-val">{fmtPRValue(g.hits[0], unit)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="card muted" style={{ fontSize: 14 }}>
          再练几次同样的动作，超过之前的成绩就会出现在这里 💪
        </div>
      )}
    </Page>
  );
}
