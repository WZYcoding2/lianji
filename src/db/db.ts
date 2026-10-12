import Dexie, { type EntityTable } from 'dexie';
import type { BodyRecord, Exercise, Template, Workout } from '../types';
import { BUILTIN_EXERCISES, BUILTIN_TEMPLATES } from '../data/exercises';
import { uid } from '../lib/uid';

export class LianjiDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  templates!: EntityTable<Template, 'id'>;
  bodyRecords!: EntityTable<BodyRecord, 'id'>;

  constructor() {
    super('lianji');
    this.version(1).stores({
      exercises: '++id, key, name, bodyPart',
      workouts: '++id, startedAt, *exerciseIds',
      templates: '++id, sort',
      bodyRecords: '++id, date',
    });
    this.on('populate', (tx) => {
      const now = Date.now();
      const exercises: Exercise[] = BUILTIN_EXERCISES.map(([key, name, bodyPart, equipment, type], i) => ({
        id: i + 1,
        key,
        name,
        bodyPart,
        equipment,
        type: type ?? 'weight_reps',
        createdAt: now,
      }));
      const idByKey = new Map(exercises.map((e) => [e.key!, e.id!]));
      const templates: Template[] = BUILTIN_TEMPLATES.map((t, i) => ({
        name: t.name,
        notes: t.notes,
        sort: i,
        createdAt: now,
        updatedAt: now,
        exercises: t.items
          .filter(([key]) => idByKey.has(key))
          .map(([key, sets, reps, duration]) => ({
            uid: uid(),
            exerciseId: idByKey.get(key)!,
            sets: Array.from({ length: sets }, () => ({
              uid: uid(),
              kind: 'normal' as const,
              done: false,
              reps,
              duration,
            })),
          })),
      }));
      void tx.table('exercises').bulkAdd(exercises);
      void tx.table('templates').bulkAdd(templates);
    });
  }
}

export const db = new LianjiDB();

/** 请求持久化存储，降低被系统清理的概率 */
export async function requestPersist() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* 忽略 */
  }
}
