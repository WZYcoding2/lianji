import { useCallback, useState } from 'react';
import { ClipboardList, Plus, Trash } from 'lucide-react';
import { Page } from '../components/Page';
import { Empty } from '../components/Controls';
import { ExerciseBlock, type BlockAction } from '../components/ExerciseBlock';
import { ExercisePicker } from '../components/ExercisePicker';
import { useData } from '../data/DataProvider';
import { db } from '../db/db';
import { nav } from '../store/nav';
import { confirmDialog, toast } from '../store/ui';
import { emptySet, moveItem, toTemplateExercises } from '../lib/draft';
import { uid } from '../lib/uid';
import { deleteTemplate } from '../lib/actions';
import type { Template, WorkoutExercise } from '../types';

export function TemplateEditor({ id, fromWorkoutId }: { id?: number; fromWorkoutId?: number }) {
  const { templates, workouts, exMap } = useData();
  const original = id != null ? templates.find((t) => t.id === id) : undefined;

  const [name, setName] = useState(() => {
    if (original) return original.name;
    const w = fromWorkoutId != null ? workouts.find((x) => x.id === fromWorkoutId) : undefined;
    return w?.name ?? '';
  });
  const [notes, setNotes] = useState(original?.notes ?? '');
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() => {
    if (original) return structuredClone(original.exercises);
    const w = fromWorkoutId != null ? workouts.find((x) => x.id === fromWorkoutId) : undefined;
    return w ? toTemplateExercises(w.exercises) : [];
  });
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<null | { mode: 'add' } | { mode: 'replace'; uid: string }>(null);

  const onChange = useCallback((u: string, fn: (we: WorkoutExercise) => WorkoutExercise) => {
    setDirty(true);
    setExercises((list) => list.map((e) => (e.uid === u ? fn(e) : e)));
  }, []);

  const onAction = useCallback((u: string, action: BlockAction) => {
    setDirty(true);
    if (action === 'remove') setExercises((l) => l.filter((e) => e.uid !== u));
    else if (action === 'up' || action === 'down') setExercises((l) => moveItem(l, u, action === 'up' ? -1 : 1));
    else if (action === 'replace') setPicker({ mode: 'replace', uid: u });
  }, []);

  const back = async () => {
    if (dirty) {
      const ok = await confirmDialog({
        title: '放弃修改？',
        message: '还没有保存，离开后修改会丢失',
        confirmText: '放弃',
        destructive: true,
      });
      if (!ok) return;
    }
    nav.pop();
  };

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast('给计划起个名字吧', { tone: 'error' });
      return;
    }
    const now = Date.now();
    const cleaned = exercises.map((we) => ({
      ...we,
      sets: we.sets.map((s) => ({ ...s, done: false, target: undefined })),
    }));
    if (original) {
      await db.templates.update(original.id!, { name: n, notes: notes.trim() || undefined, exercises: cleaned, updatedAt: now });
    } else {
      const count = await db.templates.count();
      const t: Template = { name: n, notes: notes.trim() || undefined, exercises: cleaned, sort: count, createdAt: now, updatedAt: now };
      await db.templates.add(t);
    }
    toast('计划已保存', { tone: 'success' });
    nav.pop();
  };

  const addExercises = (ids: number[]) => {
    setDirty(true);
    setExercises((l) => [
      ...l,
      ...ids
        .filter((x) => exMap.has(x))
        .map((exerciseId) => ({
          uid: uid(),
          exerciseId,
          sets: Array.from({ length: exMap.get(exerciseId)!.type === 'distance_time' ? 1 : 3 }, emptySet),
        })),
    ]);
  };

  return (
    <Page
      title={original ? '编辑计划' : '新建计划'}
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
          value={name}
          maxLength={30}
          placeholder="计划名称，如：胸 + 三头"
          onChange={(e) => {
            setDirty(true);
            setName(e.target.value);
          }}
        />
        <textarea
          className="input"
          rows={2}
          value={notes}
          placeholder="备注（可选）：训练目标、注意事项…"
          onChange={(e) => {
            setDirty(true);
            setNotes(e.target.value);
          }}
        />
        <div className="hint">在每组里填写的重量/次数会作为训练时的目标提示</div>
      </div>

      {exercises.map((we, i) => (
        <ExerciseBlock
          key={we.uid}
          mode="template"
          we={we}
          index={i}
          count={exercises.length}
          onChange={onChange}
          onAction={onAction}
        />
      ))}

      {!exercises.length && (
        <Empty icon={<ClipboardList size={28} />} title="添加计划里的动作" text="可以一次选择多个动作" />
      )}

      <div className="form-pad">
        <button className="btn btn-tinted btn-block" onClick={() => setPicker({ mode: 'add' })}>
          <Plus size={20} strokeWidth={2.6} />
          添加动作
        </button>
        {original && (
          <button
            className="btn btn-danger btn-block"
            style={{ marginTop: 12 }}
            onClick={async () => {
              if (await deleteTemplate(original)) nav.pop();
            }}
          >
            <Trash size={18} />
            删除计划
          </button>
        )}
      </div>

      <ExercisePicker open={picker?.mode === 'add'} onClose={() => setPicker(null)} onPick={addExercises} />
      <ExercisePicker
        open={picker?.mode === 'replace'}
        multi={false}
        title="替换动作"
        onClose={() => setPicker(null)}
        onPick={(ids) => {
          if (picker?.mode !== 'replace' || !ids[0]) return;
          const target = picker.uid;
          setDirty(true);
          setExercises((l) => l.map((e) => (e.uid === target ? { ...e, exerciseId: ids[0] } : e)));
        }}
      />
    </Page>
  );
}
