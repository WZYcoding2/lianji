import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { db } from '../db/db';
import { useData } from '../data/DataProvider';
import { BODY_PARTS, EQUIPMENTS, EXERCISE_TYPES } from '../data/meta';
import { cx } from '../lib/cx';
import { toast } from '../store/ui';
import type { BodyPart, Equipment, Exercise, ExerciseType } from '../types';
import { Sheet } from './Sheet';

export function ExerciseFormSheet({
  open,
  onClose,
  onSaved,
  exercise,
  initialName,
  initialPart,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (id: number) => void;
  exercise?: Exercise;
  initialName?: string;
  initialPart?: BodyPart;
}) {
  const { exercises, index } = useData();
  const [name, setName] = useState('');
  const [bodyPart, setBodyPart] = useState<BodyPart>('chest');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [type, setType] = useState<ExerciseType>('weight_reps');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(exercise?.name ?? initialName ?? '');
    setBodyPart(exercise?.bodyPart ?? initialPart ?? 'chest');
    setEquipment(exercise?.equipment ?? 'barbell');
    setType(exercise?.type ?? 'weight_reps');
    setNotes(exercise?.notes ?? '');
  }, [open, exercise, initialName, initialPart]);

  const hasHistory = !!exercise && index.byExercise.has(exercise.id!);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast('请输入动作名称', { tone: 'error' });
      return;
    }
    if (exercises.some((e) => e.name === n && e.id !== exercise?.id && !e.hidden)) {
      toast('已经有同名动作了', { tone: 'error' });
      return;
    }
    if (exercise) {
      await db.exercises.update(exercise.id!, { name: n, bodyPart, equipment, type, notes: notes.trim() || undefined });
      toast('已保存', { tone: 'success' });
      onSaved?.(exercise.id!);
    } else {
      const id = (await db.exercises.add({
        name: n,
        bodyPart,
        equipment,
        type,
        custom: true,
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
      })) as number;
      toast('已创建动作', { tone: 'success' });
      onSaved?.(id);
    }
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={exercise ? '编辑动作' : '新建动作'}
      left={
        <button className="text-btn" onClick={onClose}>
          取消
        </button>
      }
      right={
        <button className="glass-btn primary" onClick={save}>
          保存
        </button>
      }
    >
      <div className="sheet-pad">
        <div className="field">
          <label className="field-label">动作名称</label>
          <input
            className="input"
            value={name}
            placeholder="例如：单臂绳索下压"
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">训练部位</label>
          <div className="chips wrap" style={{ padding: 0 }}>
            {BODY_PARTS.map((b) => (
              <button key={b.id} className={cx('chip', bodyPart === b.id && 'active')} onClick={() => setBodyPart(b.id)}>
                <span className="chip-dot" style={{ background: b.color }} />
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">器械</label>
          <div className="chips wrap" style={{ padding: 0 }}>
            {EQUIPMENTS.map((e) => (
              <button key={e.id} className={cx('chip', equipment === e.id && 'active')} onClick={() => setEquipment(e.id)}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">记录方式{hasHistory && '（已有训练记录，不能修改）'}</label>
          <div className="list" style={{ margin: 0 }}>
            {EXERCISE_TYPES.map((t) => (
              <button
                key={t.id}
                className="row"
                disabled={hasHistory && t.id !== type}
                onClick={() => setType(t.id)}
              >
                <div className="row-main">
                  <div className="row-title">{t.label}</div>
                  <div className="row-sub">{t.desc}</div>
                </div>
                {type === t.id && <Check size={20} className="accent" strokeWidth={2.6} />}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">备注（可选）</label>
          <textarea
            className="input"
            value={notes}
            placeholder="动作要点、器械设置等"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </Sheet>
  );
}
