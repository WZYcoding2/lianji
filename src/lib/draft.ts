import type {
  ActiveWorkout,
  Exercise,
  ExerciseType,
  Plan,
  SetValues,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '../types';
import { uid } from './uid';
import { defaultWorkoutName } from './date';
import { workoutNameFor } from './plan';

const VALUE_KEYS = ['weight', 'reps', 'duration', 'distance'] as const;

export function pickValues(s: SetValues | undefined): SetValues {
  const out: SetValues = {};
  if (!s) return out;
  for (const k of VALUE_KEYS) if (s[k] != null) out[k] = s[k];
  return out;
}

export function hasValues(s: SetValues | undefined): boolean {
  return !!s && VALUE_KEYS.some((k) => s[k] != null);
}

export function emptySet(): WorkoutSet {
  return { uid: uid(), kind: 'normal', done: false };
}

/** 沿用上次的组数和组类型，让"上次"提示与每一组对齐 */
export function newExercise(ex: Exercise, prev: WorkoutSet[]): WorkoutExercise {
  const count = prev.length ? Math.min(prev.length, 10) : ex.type === 'distance_time' ? 1 : 3;
  return {
    uid: uid(),
    exerciseId: ex.id!,
    sets: Array.from({ length: count }, (_, i) => ({ ...emptySet(), kind: prev[i]?.kind ?? 'normal' })),
  };
}

/** 新增一组：沿用上一组填写的数值 */
export function addSet(we: WorkoutExercise): WorkoutExercise {
  const last = we.sets[we.sets.length - 1];
  const s: WorkoutSet = { ...emptySet(), ...pickValues(last), target: last?.target ? { ...last.target } : undefined };
  if (last && last.kind !== 'warmup') s.kind = last.kind === 'drop' ? 'drop' : 'normal';
  return { ...we, sets: [...we.sets, s] };
}

export function removeSet(we: WorkoutExercise, setUid: string): WorkoutExercise {
  return { ...we, sets: we.sets.filter((s) => s.uid !== setUid) };
}

export function patchSet(we: WorkoutExercise, setUid: string, patch: Partial<WorkoutSet>): WorkoutExercise {
  return { ...we, sets: we.sets.map((s) => (s.uid === setUid ? { ...s, ...patch } : s)) };
}

export function moveItem<T extends { uid: string }>(list: T[], itemUid: string, dir: -1 | 1): T[] {
  const i = list.findIndex((x) => x.uid === itemUid);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** 必填项：重量×次数 / 次数 需要次数；时长需要时长；有氧需要距离或时长 */
export function isSetComplete(v: SetValues, type: ExerciseType): boolean {
  switch (type) {
    case 'weight_reps':
    case 'reps':
      return (v.reps ?? 0) > 0;
    case 'time':
      return (v.duration ?? 0) > 0;
    case 'distance_time':
      return (v.distance ?? 0) > 0 || (v.duration ?? 0) > 0;
  }
}

export function planDayToActive(p: Plan, wd: number): ActiveWorkout {
  return {
    name: workoutNameFor(p, wd),
    startedAt: Date.now(),
    templateId: p.id,
    planDay: wd,
    exercises: (p.days[wd]?.exercises ?? []).map((we) => ({
      uid: uid(),
      exerciseId: we.exerciseId,
      rest: we.rest,
      notes: we.notes,
      sets: we.sets.map((s) => ({
        uid: uid(),
        kind: s.kind,
        done: false,
        target: hasValues(s) ? pickValues(s) : undefined,
      })),
    })),
  };
}

export function workoutToActive(w: Workout): ActiveWorkout {
  return {
    name: w.name,
    startedAt: Date.now(),
    templateId: w.templateId,
    planDay: w.planDay,
    exercises: w.exercises.map((we) => ({
      uid: uid(),
      exerciseId: we.exerciseId,
      rest: we.rest,
      sets: we.sets.map((s) => ({ uid: uid(), kind: s.kind, done: false, target: pickValues(s) })),
    })),
  };
}

export function emptyActive(): ActiveWorkout {
  return { name: defaultWorkoutName(), startedAt: Date.now(), exercises: [] };
}

/** 存进计划（或复制计划里的一天）：只保留结构与数值，并换上新的 uid */
export function toPlanExercises(list: WorkoutExercise[]): WorkoutExercise[] {
  return list
    .filter((we) => we.sets.length)
    .map((we) => ({
      uid: uid(),
      exerciseId: we.exerciseId,
      rest: we.rest,
      notes: we.notes,
      sets: we.sets.map((s) => ({ uid: uid(), kind: s.kind, done: false, ...pickValues(hasValues(s) ? s : s.target) })),
    }));
}

/** 保存训练：只保留已完成的组 */
export function cleanForSave(list: WorkoutExercise[]): WorkoutExercise[] {
  return list
    .map((we) => ({
      ...we,
      sets: we.sets.filter((s) => s.done).map((s) => ({ uid: s.uid, kind: s.kind, done: true, ...pickValues(s) })),
    }))
    .filter((we) => we.sets.length > 0);
}

/** 计划结构是否与本次训练不同（动作顺序或组数） */
export function structureDiffers(a: WorkoutExercise[], b: WorkoutExercise[]): boolean {
  if (a.length !== b.length) return true;
  return a.some((we, i) => we.exerciseId !== b[i].exerciseId || we.sets.length !== b[i].sets.length);
}
