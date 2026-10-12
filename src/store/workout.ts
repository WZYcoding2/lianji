import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveWorkout } from '../types';

interface ActiveStore {
  active: ActiveWorkout | null;
  start: (w: ActiveWorkout) => void;
  update: (fn: (w: ActiveWorkout) => ActiveWorkout) => void;
  clear: () => void;
}

/** 进行中的训练：每次改动都写入 localStorage，App 被系统关掉也不会丢 */
export const useActive = create<ActiveStore>()(
  persist(
    (set) => ({
      active: null,
      start: (w) => set({ active: w }),
      update: (fn) => set((s) => (s.active ? { active: fn(s.active) } : s)),
      clear: () => set({ active: null }),
    }),
    { name: 'lianji-active', version: 1 },
  ),
);

interface RestStore {
  endAt: number | null;
  total: number;
  label: string;
  start: (sec: number, label?: string) => void;
  add: (sec: number) => void;
  stop: () => void;
}

export const useRest = create<RestStore>()(
  persist(
    (set, get) => ({
      endAt: null,
      total: 0,
      label: '',
      start: (sec, label = '') => set({ endAt: Date.now() + sec * 1000, total: sec, label }),
      add: (sec) => {
        const { endAt, total } = get();
        if (!endAt) return;
        const next = Math.max(Date.now(), endAt + sec * 1000);
        set({ endAt: next, total: Math.max(1, total + sec) });
      },
      stop: () => set({ endAt: null, total: 0, label: '' }),
    }),
    { name: 'lianji-rest', version: 1 },
  ),
);
