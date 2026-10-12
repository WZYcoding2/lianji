import { create } from 'zustand';

export type TabKey = 'workout' | 'history' | 'exercises' | 'stats' | 'me';

export type Route =
  | { name: 'templateEdit'; id?: number; fromWorkoutId?: number }
  | { name: 'workoutDetail'; id: number }
  | { name: 'workoutEdit'; id: number }
  | { name: 'exerciseDetail'; id: number }
  | { name: 'bodyData' }
  | { name: 'restSettings' }
  | { name: 'installGuide' };

export interface StackItem {
  key: string;
  route: Route;
  leaving?: boolean;
}

interface NavStore {
  tab: TabKey;
  stacks: Record<TabKey, StackItem[]>;
  setTab: (tab: TabKey) => void;
  push: (route: Route) => void;
  pop: () => void;
  /** 侧滑返回结束后直接移除，不再播放离场动画 */
  popImmediate: () => void;
  popToRoot: () => void;
}

let seq = 0;
const LEAVE_MS = 320;

export const useNav = create<NavStore>()((set, get) => ({
  tab: 'workout',
  stacks: { workout: [], history: [], exercises: [], stats: [], me: [] },
  setTab: (tab) => {
    if (get().tab === tab) {
      get().popToRoot();
      return;
    }
    set({ tab });
  },
  push: (route) => {
    const { tab, stacks } = get();
    const item: StackItem = { key: `p${++seq}`, route };
    set({ stacks: { ...stacks, [tab]: [...stacks[tab].filter((s) => !s.leaving), item] } });
  },
  pop: () => {
    const { tab, stacks } = get();
    const live = stacks[tab].filter((s) => !s.leaving);
    if (!live.length) return;
    const top = live[live.length - 1];
    set({ stacks: { ...stacks, [tab]: stacks[tab].map((s) => (s.key === top.key ? { ...s, leaving: true } : s)) } });
    setTimeout(() => {
      const cur = get().stacks;
      set({ stacks: { ...cur, [tab]: cur[tab].filter((s) => s.key !== top.key) } });
    }, LEAVE_MS);
  },
  popImmediate: () => {
    const { tab, stacks } = get();
    const live = stacks[tab].filter((s) => !s.leaving);
    if (!live.length) return;
    const top = live[live.length - 1];
    set({ stacks: { ...stacks, [tab]: stacks[tab].filter((s) => s.key !== top.key) } });
  },
  popToRoot: () => {
    const { tab, stacks } = get();
    if (!stacks[tab].length) return;
    const marked = stacks[tab].map((s, i, arr) => (i === arr.length - 1 ? { ...s, leaving: true } : s));
    // 中间页直接移除，只给最上层页面播放离场动画
    set({ stacks: { ...stacks, [tab]: marked.filter((s) => s.leaving) } });
    setTimeout(() => {
      const cur = get().stacks;
      set({ stacks: { ...cur, [tab]: cur[tab].filter((s) => !s.leaving) } });
    }, LEAVE_MS);
  },
}));

export const nav = {
  push: (r: Route) => useNav.getState().push(r),
  pop: () => useNav.getState().pop(),
  setTab: (t: TabKey) => useNav.getState().setTab(t),
};
