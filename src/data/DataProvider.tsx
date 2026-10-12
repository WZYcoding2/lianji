import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { BodyRecord, Exercise, Template, Workout } from '../types';
import { buildIndex, type HistoryIndex } from '../lib/stats';

export interface DataCtx {
  exercises: Exercise[];
  exMap: Map<number, Exercise>;
  workouts: Workout[];
  templates: Template[];
  bodyRecords: BodyRecord[];
  index: HistoryIndex;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const workouts = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().toArray(), []);
  const templates = useLiveQuery(() => db.templates.orderBy('sort').toArray(), []);
  const bodyRecords = useLiveQuery(() => db.bodyRecords.orderBy('date').reverse().toArray(), []);

  const exMap = useMemo(() => new Map((exercises ?? []).map((e) => [e.id!, e])), [exercises]);
  const index = useMemo(() => buildIndex(workouts ?? [], exMap), [workouts, exMap]);

  const value = useMemo<DataCtx | null>(() => {
    if (!exercises || !workouts || !templates || !bodyRecords) return null;
    return { exercises, exMap, workouts, templates, bodyRecords, index };
  }, [exercises, workouts, templates, bodyRecords, exMap, index]);

  if (!value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData 必须在 DataProvider 内使用');
  return v;
}
