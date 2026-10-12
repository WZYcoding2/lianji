import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, Share, Trophy } from 'lucide-react';
import { structureDiffers } from '../lib/draft';
import { updateTemplateFromWorkout } from '../lib/actions';
import { useData } from '../data/DataProvider';
import { useSettings } from '../store/settings';
import { useUI } from '../store/ui';
import { cx } from '../lib/cx';
import { fmtClock, fmtDurationText, fmtNum, fmtSet, fmtVolume, fmtW, kgToDisplay } from '../lib/format';
import { fmtRelativeDay } from '../lib/date';
import {
  PR_LABEL,
  metricOf,
  workoutDuration,
  workoutSetCount,
  workoutVolume,
  type PRGroup,
  type PRHit,
} from '../lib/stats';
import { shareText, workoutShareText } from '../lib/share';
import type { Exercise, ExerciseType, Workout, WorkoutSet } from '../types';
import { ExerciseAvatar } from './Controls';

const CONFETTI_COLORS = ['#FF6B2C', '#FFB300', '#30C85E', '#3A86FF', '#FF5FA2', '#7B61FF', '#00A8CC'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.6,
        rot: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 8,
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function fmtPRValue(hit: Pick<PRHit, 'kind' | 'value'>, unit: 'kg' | 'lb'): string {
  switch (hit.kind) {
    case 'weight':
      return `${fmtW(hit.value, unit)} ${unit}`;
    case 'e1rm':
      return `${fmtNum(kgToDisplay(hit.value, unit), 1)} ${unit}`;
    case 'volume':
      return `${fmtNum(kgToDisplay(hit.value, unit), 0)} ${unit}`;
    case 'reps':
      return `${hit.value} 次`;
    case 'duration':
      return fmtClock(hit.value);
    case 'distance':
      return `${fmtNum(hit.value)} km`;
  }
}

/** 一个动作在一次训练里打破的纪录（可能同时打破多项） */
export function PRGroupLine({ g, showDate }: { g: PRGroup; showDate?: boolean }) {
  const { exMap } = useData();
  const unit = useSettings((s) => s.unit);
  const main = g.hits[0];
  const gain = main.value - main.prev;
  return (
    <div className="pr-line">
      <div className="row-main">
        <div className="pr-name ellipsis">{exMap.get(g.exerciseId)?.name ?? '已删除的动作'}</div>
        <div className="pr-kinds ellipsis">
          {g.hits.map((h) => PR_LABEL[h.kind]).join(' · ')}
          {showDate && ` · ${fmtRelativeDay(g.date)}`}
        </div>
      </div>
      <div className="pr-right">
        <b className="num">{fmtPRValue(main, unit)}</b>
        {gain > 0 && <span className="num">+{fmtPRValue({ kind: main.kind, value: gain }, unit)}</span>}
      </div>
    </div>
  );
}

export function bestSetText(sets: WorkoutSet[], type: ExerciseType, unit: 'kg' | 'lb'): string {
  const counted = sets.filter((s) => s.done && s.kind !== 'warmup');
  if (!counted.length) return '—';
  const kind = type === 'weight_reps' ? 'e1rm' : type === 'reps' ? 'reps' : type === 'time' ? 'duration' : 'distance';
  const best = counted.reduce((a, b) => (metricOf(b, kind) > metricOf(a, kind) ? b : a));
  return fmtSet(best, type, unit);
}

export function SummaryOverlay() {
  const id = useUI((s) => s.summaryId);
  const { workouts } = useData();
  const w = id != null ? workouts.find((x) => x.id === id) : undefined;
  if (id == null || !w) return null;
  return <SummaryView key={id} w={w} />;
}

function SummaryView({ w }: { w: Workout }) {
  const setId = useUI((s) => s.setSummaryId);
  const { workouts, exMap, index, templates } = useData();
  const unit = useSettings((s) => s.unit);
  const [closing, setClosing] = useState(false);
  const [planDismissed, setPlanDismissed] = useState(false);

  const nth = workouts.filter((x) => x.startedAt <= w.startedAt).length;
  const prs = index.prsByWorkout.get(w.id!) ?? [];
  const vol = workoutVolume(w, exMap);
  const v = fmtVolume(vol, unit);
  const tpl = w.templateId != null ? templates.find((t) => t.id === w.templateId) : undefined;
  const planDiffers = !!tpl && structureDiffers(tpl.exercises, w.exercises);

  const close = () => {
    setClosing(true);
    setTimeout(() => setId(null), 320);
  };

  return createPortal(
    <div className={cx('summary', closing && 'closing')}>
      <Confetti />
      <div className="summary-scroll">
        <div className="summary-hero">
          <div className="summary-emoji">🎉</div>
          <h1>训练完成！</h1>
          <p>
            这是你的第 <b className="accent num">{nth}</b> 次训练，坚持就是胜利
          </p>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <div className="stat-label">时长</div>
            <div className="stat-value">{fmtDurationText(workoutDuration(w))}</div>
          </div>
          <div className="stat">
            <div className="stat-label">总容量</div>
            <div className="stat-value">
              <span className="num">{v.value}</span>
              <small>{v.unit}</small>
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">完成组数</div>
            <div className="stat-value">
              <span className="num">{workoutSetCount(w)}</span>
              <small>组</small>
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">动作数</div>
            <div className="stat-value">
              <span className="num">{w.exercises.length}</span>
              <small>个</small>
            </div>
          </div>
        </div>

        {prs.length > 0 && (
          <div className="card pr-card">
            <div className="pr-card-title">
              <Trophy size={20} />
              {prs.length} 个动作刷新了个人纪录
            </div>
            {prs.map((g) => (
              <PRGroupLine key={g.exerciseId} g={g} />
            ))}
          </div>
        )}

        {tpl && planDiffers && !planDismissed && (
          <div className="card plan-card">
            <div className="plan-title">
              <ClipboardList size={19} />
              更新计划「{tpl.name}」？
            </div>
            <div className="plan-text">这次的动作或组数和计划不一样。更新后，下次会按这次的内容开始。</div>
            <div className="btn-row">
              <button className="btn btn-md" onClick={() => setPlanDismissed(true)}>
                保持原计划
              </button>
              <button className="btn btn-md btn-tinted" onClick={() => void updateTemplateFromWorkout(tpl, w)}>
                更新计划
              </button>
            </div>
          </div>
        )}

        <div className="list" style={{ ['--sep-inset' as string]: '70px' }}>
          {w.exercises.map((we) => {
            const ex: Exercise | undefined = exMap.get(we.exerciseId);
            const type = ex?.type ?? 'weight_reps';
            return (
              <div className="row" key={we.uid}>
                <ExerciseAvatar ex={ex} />
                <div className="row-main">
                  <div className="row-title">{ex?.name ?? '已删除的动作'}</div>
                  <div className="row-sub">
                    {we.sets.length} 组 · 最佳 {bestSetText(we.sets, type, unit)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="summary-actions">
        <button className="btn" onClick={() => void shareText(workoutShareText(w, exMap, unit, prs))}>
          <Share size={20} />
          分享
        </button>
        <button className="btn btn-primary" onClick={close}>
          完成
        </button>
      </div>
    </div>,
    document.body,
  );
}
