import { db } from '../db/db';
import { useActive, useRest } from '../store/workout';
import { actionSheet, confirmDialog, toast, useUI } from '../store/ui';
import { nav } from '../store/nav';
import { useSettings } from '../store/settings';
import type { ActiveWorkout, Exercise, Plan, PlanDay, Workout } from '../types';
import { cleanForSave, hasValues, isSetComplete, toPlanExercises } from './draft';
import { defaultWorkoutName, WEEKDAYS } from './date';
import { dayName, emptyDays, isTrainingDay, weekOrder } from './plan';

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
    planDay: active.planDay,
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

/** 用一次训练的动作和组数覆盖计划里的某一天 */
export async function updatePlanDayFromWorkout(p: Plan, wd: number, w: Workout) {
  const days = p.days.map((d, i) => (i === wd ? { ...d, exercises: toPlanExercises(w.exercises) } : d));
  await db.templates.update(p.id!, { days, updatedAt: Date.now() });
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

/** 把一次训练存成某个计划里星期几的内容 */
export async function saveWorkoutToPlan(w: Workout, plans: Plan[], exMap: Map<number, Exercise>) {
  const target = await actionSheet({
    title: '保存到哪个计划？',
    actions: [
      ...plans.map((p) => ({ label: p.name, value: String(p.id) })),
      { label: '＋ 新建一个计划', value: 'new' },
    ],
  });
  if (!target) return;
  const now = Date.now();
  const plan: Plan =
    target === 'new'
      ? { name: w.name, days: emptyDays(), sort: plans.length, createdAt: now, updatedAt: now }
      : plans.find((p) => p.id === Number(target))!;
  const trainedWd = new Date(w.startedAt).getDay();
  const picked = await actionSheet({
    title: `放在「${plan.name}」的星期几？`,
    actions: weekOrder(useSettings.getState().weekStart).map((wd) => {
      const d = plan.days[wd];
      const note = isTrainingDay(d) ? `（已有：${dayName(d, exMap)}）` : wd === trainedWd ? '（训练当天）' : '';
      return { label: `${WEEKDAYS[wd]}${note}`, value: String(wd) };
    }),
  });
  if (picked == null) return;
  const wd = Number(picked);
  if (isTrainingDay(plan.days[wd])) {
    const ok = await confirmDialog({
      title: `替换${WEEKDAYS[wd]}的训练？`,
      message: `「${dayName(plan.days[wd], exMap)}」会被这次训练的内容替换`,
      confirmText: '替换',
      destructive: true,
    });
    if (!ok) return;
  }
  const days = plan.days.map((d, i) => (i === wd ? { name: w.name, exercises: toPlanExercises(w.exercises) } : d));
  let id = plan.id;
  if (id == null) {
    id = (await db.templates.add({ ...plan, days })) as number;
  } else {
    await db.templates.update(id, { days, updatedAt: now });
  }
  toast(`已保存到「${plan.name}」${WEEKDAYS[wd]}`, { tone: 'success' });
  nav.push({ name: 'planEdit', id, day: wd });
}

export function copyDays(days: PlanDay[]): PlanDay[] {
  return days.map((d) => ({ name: d.name, exercises: toPlanExercises(d.exercises) }));
}

export async function duplicatePlan(p: Plan) {
  const count = await db.templates.count();
  const now = Date.now();
  await db.templates.add({
    name: `${p.name} 副本`,
    notes: p.notes,
    days: copyDays(p.days),
    sort: count,
    createdAt: now,
    updatedAt: now,
  });
  toast('已复制计划', { tone: 'success' });
}

export async function deletePlan(p: Plan): Promise<boolean> {
  const ok = await confirmDialog({
    title: `删除计划「${p.name}」？`,
    message: '已有的训练记录不受影响',
    confirmText: '删除',
    destructive: true,
  });
  if (!ok) return false;
  await db.templates.delete(p.id!);
  if (useSettings.getState().currentPlanId === p.id) useSettings.getState().set({ currentPlanId: undefined });
  toast('计划已删除');
  return true;
}
