import type { Exercise, ExerciseType, Workout, WorkoutExercise, WorkoutSet } from '../types';

/** Epley 公式估算 1RM */
export function e1rm(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + Math.min(reps, 20) / 30);
}

export function setVolume(s: WorkoutSet): number {
  return (s.weight ?? 0) * (s.reps ?? 0);
}

export function isCounted(s: WorkoutSet): boolean {
  return s.done && s.kind !== 'warmup';
}

export function workoutVolume(w: { exercises: WorkoutExercise[] }, exMap: Map<number, Exercise>): number {
  let v = 0;
  for (const we of w.exercises) {
    const type = exMap.get(we.exerciseId)?.type ?? 'weight_reps';
    if (type !== 'weight_reps') continue;
    for (const s of we.sets) if (s.done) v += setVolume(s);
  }
  return v;
}

export function workoutSetCount(w: { exercises: WorkoutExercise[] }): number {
  let n = 0;
  for (const we of w.exercises) for (const s of we.sets) if (s.done) n++;
  return n;
}

export function workoutDuration(w: Workout): number {
  return Math.max(0, Math.round((w.endedAt - w.startedAt) / 1000));
}

export type PRKind = 'weight' | 'e1rm' | 'volume' | 'reps' | 'duration' | 'distance';

export const PR_LABEL: Record<PRKind, string> = {
  weight: '最大重量',
  e1rm: '估算1RM',
  volume: '单组容量',
  reps: '最多次数',
  duration: '最长时间',
  distance: '最远距离',
};

const PR_ORDER: PRKind[] = ['weight', 'e1rm', 'volume', 'reps', 'distance', 'duration'];

export interface PRGroup {
  exerciseId: number;
  workoutId: number;
  date: number;
  hits: PRHit[];
}

/** 同一次训练里同一个动作的多项纪录合并显示 */
export function groupPRs(hits: PRHit[]): PRGroup[] {
  const m = new Map<string, PRGroup>();
  for (const h of hits) {
    const k = `${h.workoutId}:${h.exerciseId}`;
    let g = m.get(k);
    if (!g) m.set(k, (g = { exerciseId: h.exerciseId, workoutId: h.workoutId, date: h.date, hits: [] }));
    g.hits.push(h);
  }
  const out = [...m.values()];
  for (const g of out) g.hits.sort((a, b) => PR_ORDER.indexOf(a.kind) - PR_ORDER.indexOf(b.kind));
  return out;
}

export function prKindsFor(type: ExerciseType): PRKind[] {
  switch (type) {
    case 'weight_reps':
      return ['weight', 'e1rm', 'volume'];
    case 'reps':
      return ['reps'];
    case 'time':
      return ['duration'];
    case 'distance_time':
      return ['distance', 'duration'];
  }
}

export function metricOf(s: WorkoutSet, kind: PRKind): number {
  switch (kind) {
    case 'weight':
      return s.reps ? s.weight ?? 0 : 0;
    case 'e1rm':
      return e1rm(s.weight ?? 0, s.reps ?? 0);
    case 'volume':
      return setVolume(s);
    case 'reps':
      return s.reps ?? 0;
    case 'duration':
      return s.duration ?? 0;
    case 'distance':
      return s.distance ?? 0;
  }
}

export interface Session {
  workoutId: number;
  date: number;
  workoutName: string;
  we: WorkoutExercise;
}

export interface PRHit {
  exerciseId: number;
  workoutId: number;
  date: number;
  kind: PRKind;
  value: number;
  prev: number;
  setUid: string;
}

export type Bests = Partial<Record<PRKind, { value: number; date: number; set: WorkoutSet }>>;

export interface HistoryIndex {
  byExercise: Map<number, Session[]>;
  prSets: Map<string, PRKind[]>;
  prsByWorkout: Map<number, PRGroup[]>;
  bests: Map<number, Bests>;
  allPRs: PRGroup[];
}

/** workouts 需按时间倒序 */
export function buildIndex(workouts: Workout[], exMap: Map<number, Exercise>): HistoryIndex {
  const byExercise = new Map<number, Session[]>();
  for (const w of workouts) {
    for (const we of w.exercises) {
      if (!we.sets.some((s) => s.done)) continue;
      let list = byExercise.get(we.exerciseId);
      if (!list) byExercise.set(we.exerciseId, (list = []));
      list.push({ workoutId: w.id!, date: w.startedAt, workoutName: w.name, we });
    }
  }

  const prSets = new Map<string, PRKind[]>();
  const hitsByWorkout = new Map<number, PRHit[]>();
  const bests = new Map<number, Bests>();
  const hits: PRHit[] = [];

  for (const [exId, sessions] of byExercise) {
    const type = exMap.get(exId)?.type ?? 'weight_reps';
    const kinds = prKindsFor(type);
    const best: Bests = {};
    for (let i = sessions.length - 1; i >= 0; i--) {
      const s = sessions[i];
      for (const kind of kinds) {
        let top: WorkoutSet | null = null;
        let topV = 0;
        for (const set of s.we.sets) {
          if (!isCounted(set)) continue;
          const v = metricOf(set, kind);
          if (v > topV) {
            topV = v;
            top = set;
          }
        }
        if (!top || topV <= 0) continue;
        const prev = best[kind];
        // 第一次做某个动作不算破纪录
        if (prev && topV > prev.value + 1e-9) {
          const hit: PRHit = {
            exerciseId: exId,
            workoutId: s.workoutId,
            date: s.date,
            kind,
            value: topV,
            prev: prev.value,
            setUid: top.uid,
          };
          hits.push(hit);
          const arr = prSets.get(top.uid) ?? [];
          arr.push(kind);
          prSets.set(top.uid, arr);
          const wl = hitsByWorkout.get(s.workoutId) ?? [];
          wl.push(hit);
          hitsByWorkout.set(s.workoutId, wl);
        }
        if (!prev || topV > prev.value) best[kind] = { value: topV, date: s.date, set: top };
      }
    }
    bests.set(exId, best);
  }
  hits.sort((a, b) => b.date - a.date);
  const prsByWorkout = new Map<number, PRGroup[]>();
  for (const [wid, list] of hitsByWorkout) prsByWorkout.set(wid, groupPRs(list));
  return { byExercise, prSets, prsByWorkout, bests, allPRs: groupPRs(hits) };
}

/** 某动作最近一次（早于 before）的已完成组 */
export function previousSets(index: HistoryIndex, exerciseId: number, before = Infinity): WorkoutSet[] {
  const list = index.byExercise.get(exerciseId);
  if (!list) return [];
  const s = list.find((x) => x.date < before);
  return s ? s.we.sets.filter((x) => x.done) : [];
}

/** 各次数下的最佳重量（nRM） */
export function repMaxTable(sessions: Session[], reps: number[]): Map<number, { weight: number; date: number }> {
  const out = new Map<number, { weight: number; date: number }>();
  for (const s of sessions) {
    for (const set of s.we.sets) {
      if (!isCounted(set) || !set.weight || !set.reps) continue;
      for (const r of reps) {
        if (set.reps >= r) {
          const cur = out.get(r);
          if (!cur || set.weight > cur.weight) out.set(r, { weight: set.weight, date: s.date });
        }
      }
    }
  }
  return out;
}
