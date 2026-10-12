import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Dumbbell, Plus, StickyNote, Timer } from 'lucide-react';
import { useData } from '../data/DataProvider';
import { useActive, useRest } from '../store/workout';
import { useSettings } from '../store/settings';
import { actionSheet, useUI } from '../store/ui';
import { cx } from '../lib/cx';
import { fmtClock, fmtRest, fmtVolumeText } from '../lib/format';
import { fmtMonthDay, fmtTime, fmtWeekday } from '../lib/date';
import { moveItem, newExercise } from '../lib/draft';
import { previousSets, workoutSetCount, workoutVolume } from '../lib/stats';
import { discardActiveWorkout, finishActiveWorkout } from '../lib/actions';
import { useNow } from '../lib/hooks';
import { REST_OPTIONS } from '../data/meta';
import type { WorkoutExercise, WorkoutSet } from '../types';
import { ExerciseBlock, type BlockAction } from './ExerciseBlock';
import { ExercisePicker } from './ExercisePicker';
import { Empty } from './Controls';
import { ExerciseHistorySheet } from '../screens/ExerciseDetail';

export function WorkoutOverlay() {
  const active = useActive((s) => s.active);
  const open = useUI((s) => s.workoutOpen);
  const closing = useUI((s) => s.workoutClosing);
  const [shown, setShown] = useState(false);
  const hasActive = active != null;

  useEffect(() => {
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setShown(open && hasActive));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [open, hasActive]);

  if (!active) return null;
  return (
    <>
      <div className={cx('wo', shown && 'open')} aria-hidden={!shown}>
        <ActiveWorkoutView />
      </div>
      {!open && !closing && <MiniBar />}
    </>
  );
}

function Elapsed({ since }: { since: number }) {
  const now = useNow(1000);
  return <span className="num">{fmtClock((now - since) / 1000)}</span>;
}

function ActiveWorkoutView() {
  const active = useActive((s) => s.active)!;
  const update = useActive((s) => s.update);
  const setWorkoutOpen = useUI((s) => s.setWorkoutOpen);
  const unit = useSettings((s) => s.unit);
  const { exMap, index } = useData();
  const [picker, setPicker] = useState<null | { mode: 'add' } | { mode: 'replace'; uid: string }>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(!!active.notes);
  const bodyRef = useRef<HTMLDivElement>(null);

  const idsKey = active.exercises.map((e) => e.exerciseId).join(',');
  const prevMap = useMemo(() => {
    const m = new Map<number, WorkoutSet[]>();
    for (const id of idsKey.split(',').filter(Boolean).map(Number)) m.set(id, previousSets(index, id));
    return m;
  }, [idsKey, index]);

  const onChange = useCallback(
    (uid: string, fn: (we: WorkoutExercise) => WorkoutExercise) =>
      update((w) => ({ ...w, exercises: w.exercises.map((e) => (e.uid === uid ? fn(e) : e)) })),
    [update],
  );

  const onAction = useCallback(
    (uid: string, action: BlockAction) => {
      if (action === 'remove') update((w) => ({ ...w, exercises: w.exercises.filter((e) => e.uid !== uid) }));
      else if (action === 'up' || action === 'down')
        update((w) => ({ ...w, exercises: moveItem(w.exercises, uid, action === 'up' ? -1 : 1) }));
      else if (action === 'replace') setPicker({ mode: 'replace', uid });
      else if (action === 'history') {
        const we = useActive.getState().active?.exercises.find((e) => e.uid === uid);
        if (we) setHistoryId(we.exerciseId);
      }
    },
    [update],
  );

  const onSetDone = useCallback(
    (we: WorkoutExercise) => {
      const s = useSettings.getState();
      const rest = we.rest ?? s.defaultRest;
      if (s.autoRest && rest > 0) useRest.getState().start(rest, exMap.get(we.exerciseId)?.name ?? '');
    },
    [exMap],
  );

  const addExercises = (ids: number[]) => {
    const list = ids.map((id) => exMap.get(id)).filter((e) => !!e);
    update((w) => ({ ...w, exercises: [...w.exercises, ...list.map((e) => newExercise(e, previousSets(index, e.id!)))] }));
    setTimeout(() => {
      const el = bodyRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 380);
  };

  const replaceExercise = (uid: string, id: number) => {
    update((w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.uid === uid ? { ...e, exerciseId: id, sets: e.sets.map((s) => ({ ...s, target: undefined })) } : e,
      ),
    }));
  };

  const manualRest = async () => {
    const v = await actionSheet({
      title: '开始休息计时',
      actions: REST_OPTIONS.map((s) => ({ label: fmtRest(s), value: String(s) })),
    });
    if (v) useRest.getState().start(Number(v), '手动计时');
  };

  const doneSets = workoutSetCount(active);
  const volume = workoutVolume(active, exMap);

  return (
    <>
      <header className="wo-header">
        <div className="navbar-inner">
          <div className="nav-left">
            <button className="glass-btn round" aria-label="收起" onClick={() => setWorkoutOpen(false)}>
              <ChevronDown size={24} strokeWidth={2.4} />
            </button>
          </div>
          <div className="wo-clock">
            <span className="live-dot" />
            <Elapsed since={active.startedAt} />
          </div>
          <div className="nav-right">
            <button className="glass-btn primary" onClick={() => void finishActiveWorkout(exMap)}>
              完成
            </button>
          </div>
        </div>
      </header>

      <div className="wo-body" ref={bodyRef}>
        <div className="wo-top">
          <input
            className="wo-name"
            value={active.name}
            maxLength={30}
            aria-label="训练名称"
            onChange={(e) => update((w) => ({ ...w, name: e.target.value }))}
          />
          <div className="wo-meta">
            {fmtMonthDay(active.startedAt)} {fmtWeekday(active.startedAt)} {fmtTime(active.startedAt)} 开始 · 已完成{' '}
            {doneSets} 组{volume > 0 && ` · ${fmtVolumeText(volume, unit)}`}
          </div>
          {showNotes && (
            <textarea
              className="input wo-notes"
              placeholder="今天的状态、感受…"
              value={active.notes ?? ''}
              onChange={(e) => update((w) => ({ ...w, notes: e.target.value }))}
            />
          )}
          <div className="wo-tools">
            <button className="chip" onClick={manualRest}>
              <Timer size={16} />
              休息计时
            </button>
            {!showNotes && (
              <button className="chip" onClick={() => setShowNotes(true)}>
                <StickyNote size={16} />
                训练备注
              </button>
            )}
          </div>
        </div>

        {active.exercises.map((we, i) => (
          <ExerciseBlock
            key={we.uid}
            mode="active"
            we={we}
            index={i}
            count={active.exercises.length}
            prev={prevMap.get(we.exerciseId)}
            onChange={onChange}
            onAction={onAction}
            onSetDone={onSetDone}
          />
        ))}

        {!active.exercises.length && (
          <Empty
            icon={<Dumbbell size={30} />}
            title="开始添加动作吧"
            text="从动作库里选择今天要练的动作，可以一次选多个"
          />
        )}

        <div className="wo-bottom">
          <button className="btn btn-primary btn-block" onClick={() => setPicker({ mode: 'add' })}>
            <Plus size={22} strokeWidth={2.6} />
            添加动作
          </button>
          <button className="btn btn-danger btn-block" onClick={() => void discardActiveWorkout()}>
            放弃训练
          </button>
        </div>
      </div>

      <RestBar />

      <ExercisePicker open={picker?.mode === 'add'} onClose={() => setPicker(null)} onPick={addExercises} />
      <ExercisePicker
        open={picker?.mode === 'replace'}
        multi={false}
        title="替换动作"
        onClose={() => setPicker(null)}
        onPick={(ids) => {
          if (picker?.mode === 'replace' && ids[0]) replaceExercise(picker.uid, ids[0]);
        }}
      />
      <ExerciseHistorySheet id={historyId} onClose={() => setHistoryId(null)} />
    </>
  );
}

function RestBar() {
  const endAt = useRest((s) => s.endAt);
  const total = useRest((s) => s.total);
  const label = useRest((s) => s.label);
  const add = useRest((s) => s.add);
  const stop = useRest((s) => s.stop);
  const now = useNow(endAt ? 250 : 0);
  if (!endAt) return null;
  const remain = Math.max(0, (endAt - now) / 1000);
  const pct = total ? Math.min(1, remain / total) : 0;
  return (
    <div className={cx('rest-bar', remain <= 3.5 && 'ending')}>
      <div className="rest-fill" style={{ transform: `scaleX(${pct})` }} />
      <div className="rest-info">
        <div className="rest-time num">{fmtClock(Math.ceil(remain))}</div>
        <div className="rest-label ellipsis">休息中{label ? ` · ${label}` : ''}</div>
      </div>
      <button className="rest-btn num" onClick={() => add(-15)}>
        −15
      </button>
      <button className="rest-btn num" onClick={() => add(15)}>
        +15
      </button>
      <button className="rest-btn skip" onClick={stop}>
        跳过
      </button>
    </div>
  );
}

function MiniBar() {
  const active = useActive((s) => s.active);
  const endAt = useRest((s) => s.endAt);
  const setWorkoutOpen = useUI((s) => s.setWorkoutOpen);
  const now = useNow(1000);
  if (!active) return null;
  const remain = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : 0;
  return (
    <button className="mini-wo" onClick={() => setWorkoutOpen(true)}>
      <span className="live-dot" />
      <div className="mini-main">
        <div className="mini-title ellipsis">{active.name || '训练中'}</div>
        <div className="mini-sub num">
          {fmtClock((now - active.startedAt) / 1000)}
          {endAt && remain > 0 && <span className="accent"> · 休息 {fmtClock(remain)}</span>}
        </div>
      </div>
      <span className="mini-open">
        继续
        <ChevronUp size={18} strokeWidth={2.6} />
      </span>
    </button>
  );
}
