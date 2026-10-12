import { db } from '../db/db';
import { useActive, useRest } from '../store/workout';
import { actionSheet, confirmDialog, toast, useUI } from '../store/ui';
import { nav } from '../store/nav';
import type { ActiveWorkout, Exercise, Template, Workout } from '../types';
import { cleanForSave, hasValues, isSetComplete, toTemplateExercises } from './draft';
import { defaultWorkoutName } from './date';

export async function startWorkout(aw: ActiveWorkout) {
  const { active, start } = useActive.getState();
  if (active) {
    const v = await actionSheet({
      title: '已有一场进行中的训练',
      actions: [
        { label: '继续当前训练', value: 'resume' },
        { label: '放弃当前训练，开始新的', value: 'replace', destructive: true },
      ],
    });
    if (v === 'resume') {
      useUI.getState().setWorkoutOpen(true);
      return;
    }
    if (v !== 'replace') return;
  }
  useRest.getState().stop();
  start(aw);
  useUI.getState().setWorkoutOpen(true);
}

export async function discardActiveWorkout(): Promise<boolean> {
  const ok = await confirmDialog({
    title: '放弃这次训练？',
    message: '本次训练的所有记录都不会保存',
    confirmText: '放弃训练',
    destructive: true,
  });
  if (!ok) return false;
  useRest.getState().stop();
  useUI.setState({ workoutOpen: false, workoutClosing: true });
  setTimeout(() => {
    useActive.getState().clear();
    useUI.setState({ workoutClosing: false });
  }, 460);
  return true;
}

export async function finishActiveWorkout(exMap: Map<number, Exercise>) {
  const { active } = useActive.getState();
  if (!active) return;
  const typeOf = (id: number) => exMap.get(id)?.type ?? 'weight_reps';

  let doneCount = 0;
  let pending = 0;
  for (const we of active.exercises) {
    for (const s of we.sets) {
      if (s.done) doneCount++;
      else if (hasValues(s) && isSetComplete(s, typeOf(we.exerciseId))) pending++;
    }
  }

  let exercises = active.exercises;
  if (doneCount === 0 && pending === 0) {
    const ok = await confirmDialog({
      title: '还没有完成任何一组',
      message: '直接结束的话，这次训练不会被保存。',
      confirmText: '结束并放弃',
      destructive: true,
    });
    if (!ok) return;
    useRest.getState().stop();
    useUI.getState().setWorkoutOpen(false);
    useActive.getState().clear();
    return;
  }

  if (pending > 0) {
    const v = await actionSheet({
      title: `有 ${pending} 组填了数据但还没打勾`,
      actions: [
        { label: '全部标记为完成并保存', value: 'mark' },
        { label: '只保存已打勾的组', value: 'drop' },
      ],
    });
    if (!v) return;
    if (v === 'mark') {
      exercises = exercises.map((we) => ({
        ...we,
        sets: we.sets.map((s) =>
          !s.done && hasValues(s) && isSetComplete(s, typeOf(we.exerciseId)) ? { ...s, done: true } : s,
        ),
      }));
    }
  } else {
    const ok = await confirmDialog({
      title: '完成训练？',
      message: `本次共完成 ${doneCount} 组，辛苦啦！`,
      confirmText: '完成',
    });
    if (!ok) return;
  }

  const cleaned = cleanForSave(exercises);
  if (!cleaned.length) {
    toast('没有可保存的组', { tone: 'error' });
    return;
  }
  const workout: Workout = {
    name: active.name.trim() || defaultWorkoutName(active.startedAt),
    startedAt: active.startedAt,
    endedAt: Math.max(Date.now(), active.startedAt + 60000),
    notes: active.notes?.trim() || undefined,
    templateId: active.templateId,
    exercises: cleaned,
    exerciseIds: [...new Set(cleaned.map((e) => e.exerciseId))],
  };
  const id = (await db.workouts.add(workout)) as number;

  useRest.getState().stop();
  useActive.getState().clear();
  useUI.getState().setWorkoutOpen(false);
  useUI.getState().setSummaryId(id);

  if (active.templateId != null) {
    await db.templates.update(active.templateId, { lastUsedAt: Date.now() });
  }
}

/** 用一次训练的动作和组数覆盖计划 */
export async function updateTemplateFromWorkout(t: Template, w: Workout) {
  await db.templates.update(t.id!, { exercises: toTemplateExercises(w.exercises), updatedAt: Date.now() });
  toast('计划已更新', { tone: 'success' });
}

export async function deleteWorkout(w: Workout): Promise<boolean> {
  const ok = await confirmDialog({
    title: '删除这次训练？',
    message: '删除后无法恢复',
    confirmText: '删除',
    destructive: true,
  });
  if (!ok) return false;
  await db.workouts.delete(w.id!);
  toast('已删除');
  return true;
}

export async function saveWorkoutAsTemplate(w: Workout) {
  const count = await db.templates.count();
  const now = Date.now();
  const id = (await db.templates.add({
    name: w.name,
    exercises: toTemplateExercises(w.exercises),
    sort: count,
    createdAt: now,
    updatedAt: now,
  })) as number;
  toast('已保存为计划', { tone: 'success' });
  nav.push({ name: 'templateEdit', id });
}

export async function duplicateTemplate(t: Template) {
  const count = await db.templates.count();
  const now = Date.now();
  await db.templates.add({
    name: `${t.name} 副本`,
    notes: t.notes,
    exercises: toTemplateExercises(t.exercises),
    sort: count,
    createdAt: now,
    updatedAt: now,
  });
  toast('已复制计划', { tone: 'success' });
}

export async function deleteTemplate(t: Template): Promise<boolean> {
  const ok = await confirmDialog({
    title: `删除计划「${t.name}」？`,
    message: '已有的训练记录不受影响',
    confirmText: '删除',
    destructive: true,
  });
  if (!ok) return false;
  await db.templates.delete(t.id!);
  toast('计划已删除');
  return true;
}
