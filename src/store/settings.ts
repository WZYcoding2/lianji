import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit } from '../lib/format';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  unit: Unit;
  defaultRest: number;
  autoRest: boolean;
  sound: boolean;
  keepAwake: boolean;
  theme: ThemeMode;
  accent: string;
  weekStart: 0 | 1;
  height?: number;
  nickname: string;
  installTipDismissed: boolean;
  lastBackupAt?: number;
  /** 首页「今日训练」跟随的计划 */
  currentPlanId?: number;
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  defaultRest: 90,
  autoRest: true,
  sound: true,
  keepAwake: true,
  theme: 'system',
  accent: 'orange',
  weekStart: 1,
  nickname: '',
  installTipDismissed: false,
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
    }),
    { name: 'lianji-settings', version: 1 },
  ),
);

export function getSettings(): Settings {
  const { set: _ignored, ...rest } = useSettings.getState();
  void _ignored;
  return rest;
}
