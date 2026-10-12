import Dexie, { type EntityTable } from 'dexie';
import type { BodyRecord, Exercise, LegacyTemplate, Plan, Workout } from '../types';
import { BUILTIN_EXERCISES, LEGACY_SAMPLE_NAMES } from '../data/exercises';
import { buildSamplePlans, legacyTemplateToPlan } from '../lib/plan';

const STORES = {
  exercises: '++id, key, name, bodyPart',
  workouts: '++id, startedAt, *exerciseIds',
  templates: '++id, sort',
  bodyRecords: '++id, date',
};

export class LianjiDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  templates!: EntityTable<Plan, 'id'>;
  bodyRecords!: EntityTable<BodyRecord, 'id'>;

  constructor() {
    super('lianji');
    this.version(1).stores(STORES);
    // 2.0：计划改为按星期安排
    this.version(2)
      .stores(STORES)
      .upgrade(async (tx) => {
        const table = tx.table('templates');
        const rows: (LegacyTemplate | Plan)[] = await table.toArray();
        let removedSamples = false;
        for (const row of rows) {
          if (Array.isArray((row as Plan).days)) continue;
          const legacy = row as LegacyTemplate;
          if (LEGACY_SAMPLE_NAMES.includes(legacy.name) && legacy.updatedAt === legacy.createdAt) {
            await table.delete(legacy.id!);
            removedSamples = true;
          } else {
            await table.put(legacyTemplateToPlan(legacy));
          }
        }
        if (removedSamples) {
          const exercises: Exercise[] = await tx.table('exercises').toArray();
          const idByKey = new Map(exercises.filter((e) => e.key).map((e) => [e.key!, e.id!]));
          await table.bulkAdd(buildSamplePlans(idByKey, Date.now(), await table.count()));
        }
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
      void tx.table('exercises').bulkAdd(exercises);
      void tx.table('templates').bulkAdd(buildSamplePlans(idByKey, now));
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
