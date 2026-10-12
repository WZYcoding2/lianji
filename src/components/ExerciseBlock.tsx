import { memo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChartLine,
  Ellipsis,
  Plus,
  Replace,
  StickyNote,
  Timer,
  Trash,
  X,
} from 'lucide-react';
import { useData } from '../data/DataProvider';
import { useSettings } from '../store/settings';
import { actionSheet, confirmDialog, toast } from '../store/ui';
import { cx } from '../lib/cx';
import { haptic } from '../lib/device';
import { addSet, isSetComplete, patchSet, removeSet } from '../lib/draft';
import { displayToKg, fmtClock, fmtNum, fmtRest, fmtSetShort, fmtW, kgToDisplay, round, type Unit } from '../lib/format';
import { BODY_PART_MAP, EQUIPMENT_MAP, REST_OPTIONS, SET_KINDS, SET_KIND_MAP } from '../data/meta';
import type { ExerciseType, SetValues, WorkoutExercise, WorkoutSet } from '../types';
import { DurationInput, ExerciseAvatar, NumInput, SwipeRow } from './Controls';

export type BlockMode = 'active' | 'edit' | 'template';
export type BlockAction = 'remove' | 'up' | 'down' | 'replace' | 'history';

interface Props {
  mode: BlockMode;
  we: WorkoutExercise;
  index: number;
  count: number;
  prev?: WorkoutSet[];
  onChange: (uid: string, fn: (we: WorkoutExercise) => WorkoutExercise) => void;
  onAction: (uid: string, action: BlockAction) => void;
  onSetDone?: (we: WorkoutExercise, set: WorkoutSet) => void;
}

function columns(type: ExerciseType, mode: BlockMode): string {
  const prev = mode === 'active' ? 'minmax(0,1fr) ' : '';
  const last = mode === 'template' ? '36px' : '44px';
  const fill = mode === 'active' ? null : 'minmax(0,1fr)';
  switch (type) {
    case 'weight_reps':
      return `38px ${prev}${fill ?? '78px'} ${fill ?? '62px'} ${last}`;
    case 'reps':
      return `38px ${prev}${fill ?? '96px'} ${last}`;
    case 'time':
      return `38px ${prev}${fill ?? '100px'} ${last}`;
    case 'distance_time':
      return `38px ${prev}${fill ?? '70px'} ${fill ?? '88px'} ${last}`;
  }
}

function relevant(v: SetValues, type: ExerciseType): SetValues {
  switch (type) {
    case 'weight_reps':
      return { weight: v.weight ?? 0, reps: v.reps };
    case 'reps':
      return { reps: v.reps };
    case 'time':
      return { duration: v.duration };
    case 'distance_time':
      return { distance: v.distance, duration: v.duration };
  }
}

function dispW(kg: number | undefined, unit: Unit): number | undefined {
  return kg == null ? undefined : round(kgToDisplay(kg, unit), unit === 'kg' ? 2 : 1);
}

export const ExerciseBlock = memo(function ExerciseBlock({
  mode,
  we,
  index,
  count,
  prev = [],
  onChange,
  onAction,
  onSetDone,
}: Props) {
  const { exMap } = useData();
  const unit = useSettings((s) => s.unit);
  const defaultRest = useSettings((s) => s.defaultRest);
  const ex = exMap.get(we.exerciseId);
  const type: ExerciseType = ex?.type ?? 'weight_reps';
  const [showNotes, setShowNotes] = useState(!!we.notes);
  const [shake, setShake] = useState<string | null>(null);
  const upd = (fn: (w: WorkoutExercise) => WorkoutExercise) => onChange(we.uid, fn);
  const cols = columns(type, mode);
  const doneCount = we.sets.filter((s) => s.done).length;

  const openMenu = async () => {
    const actions = [
      ...(mode !== 'template' ? [{ label: '查看动作记录', value: 'history', icon: <ChartLine size={20} /> }] : []),
      { label: showNotes ? '收起备注' : '添加备注', value: 'notes', icon: <StickyNote size={20} /> },
      ...(mode !== 'edit'
        ? [{ label: `组间休息：${fmtRest(we.rest ?? defaultRest)}`, value: 'rest', icon: <Timer size={20} /> }]
        : []),
      { label: '替换动作', value: 'replace', icon: <Replace size={20} /> },
      ...(index > 0 ? [{ label: '上移', value: 'up', icon: <ArrowUp size={20} /> }] : []),
      ...(index < count - 1 ? [{ label: '下移', value: 'down', icon: <ArrowDown size={20} /> }] : []),
      { label: '删除动作', value: 'remove', destructive: true, icon: <Trash size={20} /> },
    ];
    const v = await actionSheet({ title: ex?.name ?? '动作', actions });
    if (!v) return;
    if (v === 'notes') {
      setShowNotes((s) => !s);
    } else if (v === 'rest') {
      const r = await actionSheet({
        title: '这个动作的组间休息',
        actions: [
          { label: `跟随默认（${fmtRest(defaultRest)}）`, value: 'default' },
          { label: '不计时', value: '0' },
          ...REST_OPTIONS.map((s) => ({ label: fmtRest(s), value: String(s) })),
        ],
      });
      if (r === 'default') upd((w) => ({ ...w, rest: undefined }));
      else if (r != null) upd((w) => ({ ...w, rest: Number(r) }));
    } else if (v === 'remove') {
      if (we.sets.some((s) => s.done)) {
        const ok = await confirmDialog({
          title: `删除「${ex?.name ?? '动作'}」？`,
          message: '已完成的组也会一起删除',
          confirmText: '删除',
          destructive: true,
        });
        if (!ok) return;
      }
      onAction(we.uid, 'remove');
    } else {
      onAction(we.uid, v as BlockAction);
    }
  };

  const setMenu = async (s: WorkoutSet, n: number) => {
    const v = await actionSheet({
      title: `第 ${n} 组`,
      actions: [
        ...SET_KINDS.map((k) => ({
          label: k.label,
          value: k.id,
          icon: (
            <span className="kind-dot" style={{ background: k.color || 'var(--text-3)' }}>
              {s.kind === k.id && <Check size={12} strokeWidth={3.5} color="#fff" />}
            </span>
          ),
        })),
        { label: '删除这一组', value: 'delete', destructive: true, icon: <Trash size={20} /> },
      ],
    });
    if (!v) return;
    if (v === 'delete') upd((w) => removeSet(w, s.uid));
    else upd((w) => patchSet(w, s.uid, { kind: v as WorkoutSet['kind'] }));
  };

  const toggleDone = (s: WorkoutSet, i: number) => {
    if (s.done) {
      upd((w) => patchSet(w, s.uid, { done: false }));
      return;
    }
    const p = prev[i];
    const filled = relevant(
      {
        weight: s.weight ?? s.target?.weight ?? p?.weight,
        reps: s.reps ?? s.target?.reps ?? p?.reps,
        duration: s.duration ?? s.target?.duration ?? p?.duration,
        distance: s.distance ?? s.target?.distance ?? p?.distance,
      },
      type,
    );
    if (!isSetComplete(filled, type)) {
      setShake(s.uid);
      setTimeout(() => setShake(null), 400);
      toast(
        type === 'time' ? '先填写时长哦' : type === 'distance_time' ? '先填写距离或时长哦' : '先填写次数哦',
        { tone: 'error' },
      );
      return;
    }
    haptic();
    const next: WorkoutSet = { ...s, ...filled, done: true };
    upd((w) => patchSet(w, s.uid, { ...filled, done: true }));
    onSetDone?.(we, next);
  };

  const fillFromPrev = (s: WorkoutSet, i: number) => {
    const p = prev[i];
    if (!p || s.done) return;
    haptic();
    upd((w) => patchSet(w, s.uid, relevant(p, type)));
  };

  let n = 0;
  const labels = we.sets.map((s) => (s.kind === 'normal' ? String(++n) : SET_KIND_MAP[s.kind].badge));
  const bp = ex ? BODY_PART_MAP[ex.bodyPart] : null;
  const prevBest = prev.length ? fmtSetShort(prev[0], type, unit) : null;

  return (
    <div className="ex-block">
      <div className="ex-head">
        <ExerciseAvatar ex={ex} />
        <button
          className="ex-title"
          onClick={() => (mode === 'template' ? openMenu() : onAction(we.uid, 'history'))}
        >
          <div className="ex-name ellipsis">{ex?.name ?? '已删除的动作'}</div>
          <div className="ex-sub ellipsis">
            {bp?.label}
            {ex && ` · ${EQUIPMENT_MAP[ex.equipment]}`}
            {mode === 'active' && prevBest && ` · 上次 ${prevBest}`}
            {mode !== 'edit' && we.rest != null && ` · 休息 ${fmtRest(we.rest)}`}
          </div>
        </button>
        {mode !== 'template' && doneCount > 0 && (
          <span className="ex-progress num">
            {doneCount}/{we.sets.length}
          </span>
        )}
        <button className="icon-btn" aria-label="更多" onClick={openMenu}>
          <Ellipsis size={22} />
        </button>
      </div>

      {showNotes && (
        <textarea
          className="ex-notes"
          rows={1}
          placeholder="备注：座椅高度、握距、感受…"
          value={we.notes ?? ''}
          onChange={(e) => upd((w) => ({ ...w, notes: e.target.value }))}
        />
      )}

      <div className="set-head" style={{ gridTemplateColumns: cols }}>
        <span>组</span>
        {mode === 'active' && <span>上次</span>}
        {type === 'weight_reps' && <span>{unit}</span>}
        {(type === 'weight_reps' || type === 'reps') && <span>次数</span>}
        {type === 'distance_time' && <span>公里</span>}
        {(type === 'time' || type === 'distance_time') && <span>时长</span>}
        <span>{mode === 'template' ? '' : <Check size={15} strokeWidth={3} />}</span>
      </div>

      {we.sets.map((s, i) => {
        const p = prev[i];
        const ph: SetValues = {
          weight: s.target?.weight ?? p?.weight,
          reps: s.target?.reps ?? p?.reps,
          duration: s.target?.duration ?? p?.duration,
          distance: s.target?.distance ?? p?.distance,
        };
        const done = mode !== 'template' && s.done;
        return (
          <SwipeRow key={s.uid} onDelete={() => upd((w) => removeSet(w, s.uid))}>
            <div
              className={cx('set-row', done && 'done', shake === s.uid && 'shake')}
              style={{ gridTemplateColumns: cols }}
            >
              <button
                className={cx('set-num num', s.kind !== 'normal' && 'kind')}
                style={s.kind !== 'normal' ? { color: SET_KIND_MAP[s.kind].color } : undefined}
                onClick={() => setMenu(s, i + 1)}
              >
                {labels[i]}
              </button>
              {mode === 'active' && (
                <button className="set-prev num" onClick={() => fillFromPrev(s, i)} disabled={!p}>
                  {fmtSetShort(p, type, unit)}
                </button>
              )}
              {type === 'weight_reps' && (
                <NumInput
                  className="set-input num"
                  ariaLabel="重量"
                  value={dispW(s.weight, unit)}
                  placeholder={ph.weight != null ? fmtW(ph.weight, unit) : unit}
                  onChange={(v) => upd((w) => patchSet(w, s.uid, { weight: v == null ? undefined : displayToKg(v, unit) }))}
                />
              )}
              {(type === 'weight_reps' || type === 'reps') && (
                <NumInput
                  className="set-input num"
                  ariaLabel="次数"
                  decimal={false}
                  maxLength={4}
                  value={s.reps}
                  placeholder={ph.reps != null ? String(ph.reps) : '—'}
                  onChange={(v) => upd((w) => patchSet(w, s.uid, { reps: v }))}
                />
              )}
              {type === 'distance_time' && (
                <NumInput
                  className="set-input num"
                  ariaLabel="距离"
                  value={s.distance}
                  placeholder={ph.distance != null ? fmtNum(ph.distance) : 'km'}
                  onChange={(v) => upd((w) => patchSet(w, s.uid, { distance: v }))}
                />
              )}
              {(type === 'time' || type === 'distance_time') && (
                <DurationInput
                  className="set-input num"
                  value={s.duration}
                  placeholder={ph.duration ? fmtClock(ph.duration) : '0:00'}
                  onChange={(v) => upd((w) => patchSet(w, s.uid, { duration: v }))}
                />
              )}
              {mode === 'template' ? (
                <button className="set-del" aria-label="删除这一组" onClick={() => upd((w) => removeSet(w, s.uid))}>
                  <X size={18} />
                </button>
              ) : (
                <button
                  className={cx('set-check', done && 'on')}
                  aria-label={done ? '取消完成' : '完成这一组'}
                  onClick={() => toggleDone(s, i)}
                >
                  <Check size={20} strokeWidth={3.2} />
                </button>
              )}
            </div>
          </SwipeRow>
        );
      })}

      <button
        className="add-set"
        onClick={() => {
          haptic();
          upd(addSet);
        }}
      >
        <Plus size={17} strokeWidth={2.6} />
        添加一组
      </button>
    </div>
  );
});
