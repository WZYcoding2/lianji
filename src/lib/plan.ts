import type { BodyPart, Exercise, LegacyTemplate, Plan, PlanDay, WorkoutExercise } from '../types';
import { BUILTIN_PLANS } from '../data/exercises';
import { WEEKDAYS } from './date';
import { uid } from './uid';

export function emptyDays(): PlanDay[] {
  return Array.from({ length: 7 }, () => ({ exercises: [] }));
}

/** 保证正好 7 天，缺的补成休息日 */
export function normalizeDays(days: PlanDay[] | undefined): PlanDay[] {
  const out = emptyDays();
  (days ?? []).slice(0, 7).forEach((d, i) => {
    if (d) out[i] = { name: d.name, exercises: Array.isArray(d.exercises) ? d.exercises : [] };
  });
  return out;
}

export function isTrainingDay(d: PlanDay | undefined): d is PlanDay {
  return !!d && d.exercises.length > 0;
}

export function trainingDayCount(p: Plan): number {
  return p.days.filter(isTrainingDay).length;
}

/** 按「每周第一天」排好的星期下标 */
export function weekOrder(weekStart: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7);
}

const PART_NAME: Record<BodyPart, string> = {
  chest: '胸',
  back: '背',
  shoulders: '肩',
  legs: '腿',
  glutes: '臀',
  biceps: '二头',
  triceps: '三头',
  core: '核心',
  cardio: '有氧',
  other: '全身',
};

/** 按动作的训练部位起名：胸 + 三头；部位太多就叫全身 */
export function suggestDayName(list: WorkoutExercise[], exMap: Map<number, Exercise>): string {
  const counts = new Map<BodyPart, number>();
  for (const we of list) {
    const bp = exMap.get(we.exerciseId)?.bodyPart;
    if (bp) counts.set(bp, (counts.get(bp) ?? 0) + 1);
  }
  if (!counts.size) return '';
  if (counts.size >= 4) return '全身';
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([bp]) => PART_NAME[bp])
    .join(' + ');
}

export function dayName(d: PlanDay, exMap: Map<number, Exercise>): string {
  return d.name?.trim() || suggestDayName(d.exercises, exMap) || '训练';
}

/** 开始训练时的名称 */
export function workoutNameFor(p: Plan, wd: number): string {
  return p.days[wd]?.name?.trim() || `${p.name} · ${WEEKDAYS[wd]}`;
}

/** 之后最近的一个训练日（不含当天；只有当天练时返回下周同一天） */
export function nextTrainingDay(p: Plan, fromWd: number): { wd: number; inDays: number } | null {
  for (let i = 1; i <= 7; i++) {
    const wd = (fromWd + i) % 7;
    if (isTrainingDay(p.days[wd])) return { wd, inDays: i };
  }
  return null;
}

/** 1.0 版的计划没有按天区分，升级后放到周一 */
export function legacyTemplateToPlan(t: LegacyTemplate): Plan {
  const { exercises, ...rest } = t;
  const days = emptyDays();
  days[1] = { name: t.name, exercises: Array.isArray(exercises) ? exercises : [] };
  return { ...rest, days };
}

export function buildSamplePlans(idByKey: Map<string, number>, now: number, startSort = 0): Plan[] {
  return BUILTIN_PLANS.map((p, i) => {
    const days = emptyDays();
    for (const [wd, d] of Object.entries(p.days)) {
      if (!d) continue;
      days[Number(wd)] = {
        name: d.name,
        exercises: d.items
          .filter(([key]) => idByKey.has(key))
          .map(([key, sets, reps, duration]) => ({
            uid: uid(),
            exerciseId: idByKey.get(key)!,
            sets: Array.from({ length: sets }, () => ({
              uid: uid(),
              kind: 'normal' as const,
              done: false,
              ...(reps != null ? { reps } : {}),
              ...(duration != null ? { duration } : {}),
            })),
          })),
      };
    }
    return { name: p.name, notes: p.notes, days, sort: startSort + i, createdAt: now, updatedAt: now };
  });
}
