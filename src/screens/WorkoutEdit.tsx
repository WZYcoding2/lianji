import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { Page } from '../components/Page';
import { Empty } from '../components/Controls';
import { ExerciseBlock, type BlockAction } from '../components/ExerciseBlock';
import { ExercisePicker } from '../components/ExercisePicker';
import { useData } from '../data/DataProvider';
import { db } from '../db/db';
import { nav } from '../store/nav';
import { confirmDialog, toast } from '../store/ui';
import { emptySet, isSetComplete, moveItem, pickValues } from '../lib/draft';
import { fromLocalInput, toLocalInput } from '../lib/date';
import { uid } from '../lib/uid';
import type { Workout, WorkoutExercise } from '../types';

export function WorkoutEdit({ id }: { id: number }) {
  const { workouts, exMap } = useData();
  const orig = workouts.find((w) => w.id === id);
  const [draft, setDraft] = useState<Workout | null>(() => (orig ? structuredClone(orig) : null));
  const [minutes, setMinutes] = useState(() =>
    orig ? String(Math.max(1, Math.round((orig.endedAt - orig.startedAt) / 60000))) : '60',
  );
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<null | { mode: 'add' } | { mode: 'replace'; uid: string }>(null);

  const change = useCallback((fn: (w: Workout) => Workout) => {
    setDirty(true);
    setDraft((d) => (d ? fn(d) : d));
  }, []);

  const onChange = useCallback(
    (u: string, fn: (we: WorkoutExercise) => WorkoutExercise) =>
      change((w) => ({ ...w, exercises: w.exercises.map((e) => (e.uid === u ? fn(e) : e)) })),
    [change],
  );

  const onAction = useCallback(
    (u: string, action: BlockAction) => {
      if (action === 'remove') change((w) => ({ ...w, exercises: w.exercises.filter((e) => e.uid !== u) }));
      else if (action === 'up' || action === 'down')
        change((w) => ({ ...w, exercises: moveItem(w.exercises, u, action === 'up' ? -1 : 1) }));
      else if (action === 'replace') setPicker({ mode: 'replace', uid: u });
      else if (action === 'history') {
        const we = draft?.exercises.find((e) => e.uid === u);
        if (we) nav.push({ name: 'exerciseDetail', id: we.exerciseId });
      }
    },
    [change, draft],
  );

  if (!draft) {
    return (
      <Page title="编辑训练" back>
        <Empty title="这条记录已被删除" />
      </Page>
    );
  }

  const back = async () => {
    if (dirty) {
      const ok = await confirmDialog({ title: '放弃修改？', confirmText: '放弃', destructive: true });
      if (!ok) return;
    }
    nav.pop();
  };

  const save = async () => {
    const mins = Math.max(1, Math.min(24 * 60, Number(minutes) || 0));
    const exercises = draft.exercises
      .map((we) => {
        const type = exMap.get(we.exerciseId)?.type ?? 'weight_reps';
        return {
          ...we,
          sets: we.sets
            .filter((s) => s.done || isSetComplete(s, type))
            .map((s) => ({ uid: s.uid, kind: s.kind, done: true, ...pickValues(s) })),
        };
      })
      .filter((we) => we.sets.length);
    if (!exercises.length) {
      toast('至少保留一组记录', { tone: 'error' });
      return;
    }
    await db.workouts.put({
      ...draft,
      name: draft.name.trim() || '训练',
      notes: draft.notes?.trim() || undefined,
      endedAt: draft.startedAt + mins * 60000,
      exercises,
      exerciseIds: [...new Set(exercises.map((e) => e.exerciseId))],
    });
    toast('已保存修改', { tone: 'success' });
    nav.pop();
  };

  return (
    <Page
      title="编辑训练"
      back={back}
      noSwipe
      right={
        <button className="glass-btn primary" onClick={save}>
          保存
        </button>
      }
    >
      <div className="form-pad">
        <input
          className="title-input"
          value={draft.name}
          maxLength={30}
          placeholder="训练名称"
          onChange={(e) => change((w) => ({ ...w, name: e.target.value }))}
        />
        <div className="field-row">
          <div className="field">
            <label className="field-label">开始时间</label>
            <input
              className="input"
              type="datetime-local"
              value={toLocalInput(draft.startedAt)}
              onChange={(e) => {
                const t = fromLocalInput(e.target.value);
                if (t) change((w) => ({ ...w, startedAt: t }));
              }}
            />
          </div>
          <div className="field" style={{ flex: '0 0 110px' }}>
            <label className="field-label">时长（分钟）</label>
            <input
              className="input"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => {
                setDirty(true);
                setMinutes(e.target.value.replace(/\D/g, '').slice(0, 4));
              }}
            />
          </div>
        </div>
        <textarea
          className="input"
          rows={2}
          value={draft.notes ?? ''}
          placeholder="训练备注"
          onChange={(e) => change((w) => ({ ...w, notes: e.target.value }))}
        />
        <div className="hint">填写了数据的组会保存为已完成</div>
      </div>

      {draft.exercises.map((we, i) => (
        <ExerciseBlock
          key={we.uid}
          mode="edit"
          we={we}
          index={i}
          count={draft.exercises.length}
          onChange={onChange}
          onAction={onAction}
        />
      ))}

      <div className="form-pad">
        <button className="btn btn-tinted btn-block" onClick={() => setPicker({ mode: 'add' })}>
          <Plus size={20} strokeWidth={2.6} />
          添加动作
        </button>
      </div>

      <ExercisePicker
        open={picker?.mode === 'add'}
        onClose={() => setPicker(null)}
        onPick={(ids) =>
          change((w) => ({
            ...w,
            exercises: [
              ...w.exercises,
              ...ids.filter((x) => exMap.has(x)).map((exerciseId) => ({ uid: uid(), exerciseId, sets: [emptySet()] })),
            ],
          }))
        }
      />
      <ExercisePicker
        open={picker?.mode === 'replace'}
        multi={false}
        title="替换动作"
        onClose={() => setPicker(null)}
        onPick={(ids) => {
          if (picker?.mode !== 'replace' || !ids[0]) return;
          const target = picker.uid;
          change((w) => ({ ...w, exercises: w.exercises.map((e) => (e.uid === target ? { ...e, exerciseId: ids[0] } : e)) }));
        }}
      />
    </Page>
  );
}
