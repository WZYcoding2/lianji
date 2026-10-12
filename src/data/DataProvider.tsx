import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { BodyRecord, Exercise, Plan, Workout } from '../types';
import { buildIndex, type HistoryIndex } from '../lib/stats';
import { normalizeDays } from '../lib/plan';

export interface DataCtx {
  exercises: Exercise[];
  exMap: Map<number, Exercise>;
  workouts: Workout[];
  plans: Plan[];
  bodyRecords: BodyRecord[];
  index: HistoryIndex;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const workouts = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().toArray(), []);
  const rawPlans = useLiveQuery(() => db.templates.orderBy('sort').toArray(), []);
  const bodyRecords = useLiveQuery(() => db.bodyRecords.orderBy('date').reverse().toArray(), []);

  const exMap = useMemo(() => new Map((exercises ?? []).map((e) => [e.id!, e])), [exercises]);
  const index = useMemo(() => buildIndex(workouts ?? [], exMap), [workouts, exMap]);
  const plans = useMemo(() => rawPlans?.map((p) => ({ ...p, days: normalizeDays(p.days) })), [rawPlans]);

  const value = useMemo<DataCtx | null>(() => {
    if (!exercises || !workouts || !plans || !bodyRecords) return null;
    return { exercises, exMap, workouts, plans, bodyRecords, index };
  }, [exercises, workouts, plans, bodyRecords, exMap, index]);

  if (!value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData 必须在 DataProvider 内使用');
  return v;
}

/** 首页跟随的计划：用户选过的优先，否则取第一个有训练日的计划 */
export function useCurrentPlan(currentPlanId: number | undefined): Plan | undefined {
  const { plans } = useData();
  return (
    plans.find((p) => p.id === currentPlanId) ?? plans.find((p) => p.days.some((d) => d.exercises.length)) ?? plans[0]
  );
}
