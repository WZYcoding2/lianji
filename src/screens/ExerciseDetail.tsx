import { useMemo, useState } from 'react';
import { Ellipsis, EyeOff, Pencil, Trash, Trophy } from 'lucide-react';
import { Page } from '../components/Page';
import { Sheet } from '../components/Sheet';
import { Empty, ExerciseAvatar, Segmented } from '../components/Controls';
import { LineChart } from '../components/Charts';
import { ExerciseFormSheet } from '../components/ExerciseForm';
import { fmtPRValue } from '../components/SummaryOverlay';
import { useData } from '../data/DataProvider';
import { db } from '../db/db';
import { useSettings } from '../store/settings';
import { nav } from '../store/nav';
import { actionSheet, confirmDialog, toast } from '../store/ui';
import { BODY_PART_MAP, EQUIPMENT_MAP, EXERCISE_TYPE_MAP, SET_KIND_MAP } from '../data/meta';
import { fmtClock, fmtNum, fmtSetShort, fmtW, kgToDisplay } from '../lib/format';
import { fmtMonthDay, fmtSmartDate } from '../lib/date';
import { e1rm, isCounted, PR_LABEL, prKindsFor, repMaxTable, setVolume, type Session } from '../lib/stats';
import type { Exercise, ExerciseType } from '../types';

type Metric = 'e1rm' | 'weight' | 'volume' | 'reps' | 'totalReps' | 'duration' | 'distance';

const METRICS: Record<ExerciseType, { value: Metric; label: string }[]> = {
  weight_reps: [
    { value: 'e1rm', label: '估算1RM' },
    { value: 'weight', label: '最大重量' },
    { value: 'volume', label: '训练容量' },
  ],
  reps: [
    { value: 'reps', label: '单组最多' },
    { value: 'totalReps', label: '总次数' },
  ],
  time: [{ value: 'duration', label: '最长时间' }],
  distance_time: [
    { value: 'distance', label: '距离' },
    { value: 'duration', label: '时长' },
  ],
};

function sessionMetric(s: Session, m: Metric): number {
  const sets = s.we.sets.filter(isCounted);
  switch (m) {
    case 'e1rm':
      return Math.max(0, ...sets.map((x) => e1rm(x.weight ?? 0, x.reps ?? 0)));
    case 'weight':
      return Math.max(0, ...sets.map((x) => (x.reps ? x.weight ?? 0 : 0)));
    case 'volume':
      return sets.reduce((n, x) => n + setVolume(x), 0);
    case 'reps':
      return Math.max(0, ...sets.map((x) => x.reps ?? 0));
    case 'totalReps':
      return sets.reduce((n, x) => n + (x.reps ?? 0), 0);
    case 'duration':
      return Math.max(0, ...sets.map((x) => x.duration ?? 0));
    case 'distance':
      return sets.reduce((n, x) => n + (x.distance ?? 0), 0);
  }
}

export function ExerciseDetailContent({ ex, linkable = true }: { ex: Exercise; linkable?: boolean }) {
  const { index } = useData();
  const unit = useSettings((s) => s.unit);
  const sessions = useMemo(() => index.byExercise.get(ex.id!) ?? [], [index, ex.id]);
  const bests = index.bests.get(ex.id!) ?? {};
  const metrics = METRICS[ex.type];
  const [metric, setMetric] = useState<Metric>(metrics[0].value);
  const [showAll, setShowAll] = useState(false);
  const bp = BODY_PART_MAP[ex.bodyPart];

  const points = useMemo(
    () =>
      sessions
        .slice()
        .reverse()
        .map((s) => ({ x: s.date, y: sessionMetric(s, metric) }))
        .filter((p) => p.y > 0),
    [sessions, metric],
  );

  const fmtMetric = (v: number) => {
    if (metric === 'duration') return fmtClock(v);
    if (metric === 'distance') return `${fmtNum(v, 1)}km`;
    if (metric === 'reps' || metric === 'totalReps') return `${Math.round(v)}`;
    return fmtNum(kgToDisplay(v, unit), v >= 1000 ? 0 : 1);
  };

  const rmReps = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];
  const rm = ex.type === 'weight_reps' ? repMaxTable(sessions, rmReps) : new Map();
  const prKinds = prKindsFor(ex.type);

  return (
    <>
      <div className="exd-head">
        <ExerciseAvatar ex={ex} size="lg" />
        <div className="row-main">
          <h2 className="exd-name">{ex.name}</h2>
          <div className="exd-tags">
            <span className="tag" style={{ color: bp.color }}>
              {bp.label}
            </span>
            <span className="tag">{EQUIPMENT_MAP[ex.equipment]}</span>
            <span className="tag">{EXERCISE_TYPE_MAP[ex.type]}</span>
            {ex.custom && <span className="tag">自定义</span>}
          </div>
        </div>
      </div>

      {ex.notes && <div className="card note-card">{ex.notes}</div>}

      {!sessions.length ? (
        <Empty icon={<Trophy size={28} />} title="还没有这个动作的记录" text="训练时添加这个动作，这里会显示进步曲线和个人纪录" />
      ) : (
        <>
          <div className="stat-grid compact">
            {prKinds.map((k) => (
              <div className="stat" key={k}>
                <div className="stat-label">{PR_LABEL[k]}</div>
                <div className="stat-value num">{bests[k] ? fmtPRValue({ kind: k, value: bests[k]!.value }, unit) : '—'}</div>
                {bests[k] && <div className="stat-foot">{fmtSmartDate(bests[k]!.date)}</div>}
              </div>
            ))}
            <div className="stat">
              <div className="stat-label">训练次数</div>
              <div className="stat-value">
                <span className="num">{sessions.length}</span>
                <small>次</small>
              </div>
              <div className="stat-foot">最近 {fmtSmartDate(sessions[0].date)}</div>
            </div>
          </div>

          <div className="card">
            {metrics.length > 1 && (
              <Segmented value={metric} options={metrics} onChange={setMetric} small className="chart-seg" />
            )}
            <LineChart
              points={points}
              formatY={fmtMetric}
              formatX={(x) => fmtMonthDay(x)}
            />
            <div className="chart-caption">
              {metric === 'e1rm' && `估算 1RM（${unit}），按 Epley 公式由每次训练的最佳组推算`}
              {metric === 'weight' && `每次训练的最大重量（${unit}）`}
              {metric === 'volume' && `每次训练的总容量（重量 × 次数，${unit}）`}
              {metric === 'reps' && '每次训练单组最多次数'}
              {metric === 'totalReps' && '每次训练的总次数'}
              {metric === 'duration' && '每次训练的最长时间'}
              {metric === 'distance' && '每次训练的总距离'}
            </div>
          </div>

          {rm.size > 0 && (
            <>
              <div className="group-label">各次数最佳重量</div>
              <div className="card rm-grid">
                {rmReps
                  .filter((r) => rm.has(r))
                  .map((r) => (
                    <div className="rm-cell" key={r}>
                      <div className="rm-r">{r}RM</div>
                      <div className="rm-w num">{fmtW(rm.get(r)!.weight, unit)}</div>
                    </div>
                  ))}
              </div>
            </>
          )}

          <div className="group-label">训练记录 · {sessions.length} 次</div>
          {(showAll ? sessions : sessions.slice(0, 8)).map((s) => (
            <button
              key={s.workoutId + s.we.uid}
              className={linkable ? 'card card-pressable hist-card' : 'card hist-card'}
              onClick={linkable ? () => nav.push({ name: 'workoutDetail', id: s.workoutId }) : undefined}
            >
              <div className="hist-top">
                <span className="hist-date">{fmtSmartDate(s.date)}</span>
                <span className="faint ellipsis">{s.workoutName}</span>
              </div>
              <div className="hist-sets">
                {s.we.sets.map((set) => (
                  <span
                    key={set.uid}
                    className={`set-chip num${index.prSets.has(set.uid) ? ' pr' : ''}${set.kind === 'warmup' ? ' warm' : ''}`}
                  >
                    {set.kind !== 'normal' && (
                      <i style={{ color: SET_KIND_MAP[set.kind].color }}>{SET_KIND_MAP[set.kind].badge}</i>
                    )}
                    {fmtSetShort(set, ex.type, unit)}
                    {index.prSets.has(set.uid) && <Trophy size={11} />}
                  </span>
                ))}
              </div>
            </button>
          ))}
          {sessions.length > 8 && !showAll && (
            <div className="form-pad">
              <button className="btn btn-md btn-block" onClick={() => setShowAll(true)}>
                显示全部 {sessions.length} 次记录
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export function ExerciseDetailPage({ id }: { id: number }) {
  const { exMap, index } = useData();
  const ex = exMap.get(id);
  const [editing, setEditing] = useState(false);

  if (!ex) {
    return (
      <Page title="动作" back>
        <Empty title="这个动作已被删除" />
      </Page>
    );
  }

  const hasHistory = index.byExercise.has(id);

  const menu = async () => {
    const actions = [
      { label: '编辑动作', value: 'edit', icon: <Pencil size={20} /> },
      ...(ex.custom && !hasHistory
        ? [{ label: '删除动作', value: 'delete', destructive: true, icon: <Trash size={20} /> }]
        : [{ label: '从动作库隐藏', value: 'hide', destructive: true, icon: <EyeOff size={20} /> }]),
    ];
    const v = await actionSheet({ title: ex.name, actions });
    if (v === 'edit') setEditing(true);
    else if (v === 'delete') {
      const ok = await confirmDialog({ title: `删除「${ex.name}」？`, confirmText: '删除', destructive: true });
      if (!ok) return;
      await db.exercises.delete(id);
      toast('已删除');
      nav.pop();
    } else if (v === 'hide') {
      const ok = await confirmDialog({
        title: `隐藏「${ex.name}」？`,
        message: '隐藏后不会出现在动作列表里，历史记录会保留。可以在动作库底部恢复。',
        confirmText: '隐藏',
        destructive: true,
      });
      if (!ok) return;
      await db.exercises.update(id, { hidden: true });
      toast('已隐藏');
      nav.pop();
    }
  };

  return (
    <Page
      title={ex.name}
      back
      right={
        <button className="glass-btn round" aria-label="更多" onClick={menu}>
          <Ellipsis size={22} />
        </button>
      }
    >
      <ExerciseDetailContent ex={ex} />
      <ExerciseFormSheet open={editing} exercise={ex} onClose={() => setEditing(false)} />
    </Page>
  );
}

/** 训练中查看动作记录 */
export function ExerciseHistorySheet({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { exMap } = useData();
  const [last, setLast] = useState<number | null>(null);
  if (id != null && id !== last) setLast(id);
  const ex = exMap.get(id ?? last ?? -1);
  return (
    <Sheet
      open={id != null}
      onClose={onClose}
      full
      title="动作记录"
      right={
        <button className="text-btn bold" onClick={onClose}>
          完成
        </button>
      }
    >
      {ex && <ExerciseDetailContent ex={ex} linkable={false} />}
    </Sheet>
  );
}
