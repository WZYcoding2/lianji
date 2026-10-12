import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { CalendarDays, ChartColumnBig, Dumbbell, LayoutGrid, UserRound } from 'lucide-react';
import { cx } from '../lib/cx';
import { haptic } from '../lib/device';
import { useNav, type Route, type StackItem, type TabKey } from '../store/nav';
import { WorkoutHome } from '../screens/WorkoutHome';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ExerciseLibrary } from '../screens/ExerciseLibrary';
import { StatsScreen } from '../screens/StatsScreen';
import { MeScreen } from '../screens/MeScreen';
import { PlanEditor } from '../screens/PlanEditor';
import { WorkoutDetail } from '../screens/WorkoutDetail';
import { WorkoutEdit } from '../screens/WorkoutEdit';
import { ExerciseDetailPage } from '../screens/ExerciseDetail';
import { BodyData } from '../screens/BodyData';
import { InstallGuide } from '../screens/InstallGuide';

export const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: 'workout', label: '训练', icon: <Dumbbell size={24} strokeWidth={2} /> },
  { key: 'history', label: '历史', icon: <CalendarDays size={24} strokeWidth={2} /> },
  { key: 'exercises', label: '动作', icon: <LayoutGrid size={24} strokeWidth={2} /> },
  { key: 'stats', label: '数据', icon: <ChartColumnBig size={24} strokeWidth={2} /> },
  { key: 'me', label: '我的', icon: <UserRound size={24} strokeWidth={2} /> },
];

const ROOTS: Record<TabKey, () => ReactNode> = {
  workout: () => <WorkoutHome />,
  history: () => <HistoryScreen />,
  exercises: () => <ExerciseLibrary />,
  stats: () => <StatsScreen />,
  me: () => <MeScreen />,
};

function renderRoute(route: Route): ReactNode {
  switch (route.name) {
    case 'planEdit':
      return <PlanEditor id={route.id} day={route.day} />;
    case 'workoutDetail':
      return <WorkoutDetail id={route.id} />;
    case 'workoutEdit':
      return <WorkoutEdit id={route.id} />;
    case 'exerciseDetail':
      return <ExerciseDetailPage id={route.id} />;
    case 'bodyData':
      return <BodyData />;
    case 'installGuide':
      return <InstallGuide />;
    default:
      return null;
  }
}

export function Navigator() {
  const tab = useNav((s) => s.tab);
  const stacks = useNav((s) => s.stacks);
  const [visited, setVisited] = useState<TabKey[]>([tab]);

  useEffect(() => {
    setVisited((v) => (v.includes(tab) ? v : [...v, tab]));
  }, [tab]);

  return (
    <>
      {TABS.filter((t) => visited.includes(t.key) || t.key === tab).map((t) => (
        <TabStack key={t.key} tab={t.key} active={t.key === tab} items={stacks[t.key]} />
      ))}
    </>
  );
}

function TabStack({ tab, active, items }: { tab: TabKey; active: boolean; items: StackItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const live = items.filter((i) => !i.leaving);
  useSwipeBack(ref, active && live.length > 0);

  return (
    <div className="tab-stack" hidden={!active} ref={ref}>
      <div className={cx('layer', live.length > 0 && 'covered')} data-layer="">
        {ROOTS[tab]()}
      </div>
      {items.map((it) => {
        const idx = live.indexOf(it);
        const covered = idx >= 0 && idx < live.length - 1;
        return (
          <div
            key={it.key}
            className={cx('layer stacked', it.leaving ? 'leaving' : 'entering', covered && 'covered')}
            data-layer=""
            data-leaving={it.leaving ? '1' : undefined}
          >
            {renderRoute(it.route)}
          </div>
        );
      })}
    </div>
  );
}

/** 从屏幕左边缘向右滑动返回上一页 */
function useSwipeBack(ref: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    type St = {
      x: number;
      y: number;
      top: HTMLElement;
      below: HTMLElement;
      decided: boolean;
      lastX: number;
      lastT: number;
      v: number;
      w: number;
    };
    let st: St | null = null;

    const onStart = (e: TouchEvent) => {
      if (!enabledRef.current || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > 28) return;
      const layers = Array.from(el.children).filter(
        (c): c is HTMLElement => c instanceof HTMLElement && c.dataset.layer !== undefined && !c.dataset.leaving,
      );
      if (layers.length < 2) return;
      const top = layers[layers.length - 1];
      if (top.querySelector('[data-noswipe]')) return;
      st = {
        x: t.clientX,
        y: t.clientY,
        top,
        below: layers[layers.length - 2],
        decided: false,
        lastX: t.clientX,
        lastT: e.timeStamp,
        v: 0,
        w: el.clientWidth,
      };
    };

    const onMove = (e: TouchEvent) => {
      if (!st) return;
      const t = e.touches[0];
      const dx = t.clientX - st.x;
      const dy = t.clientY - st.y;
      if (!st.decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx) || dx < 0) {
          st = null;
          return;
        }
        st.decided = true;
        st.top.style.transition = 'none';
        st.below.style.transition = 'none';
      }
      e.preventDefault();
      const x = Math.max(0, dx);
      st.top.style.transform = `translate3d(${x}px,0,0)`;
      st.below.style.transform = `translate3d(${-0.28 * st.w * (1 - x / st.w)}px,0,0)`;
      const dt = e.timeStamp - st.lastT;
      if (dt > 0) st.v = (t.clientX - st.lastX) / dt;
      st.lastX = t.clientX;
      st.lastT = e.timeStamp;
    };

    const onEnd = () => {
      const s = st;
      st = null;
      if (!s || !s.decided) return;
      const dx = s.lastX - s.x;
      const commit = dx > s.w * 0.33 || (s.v > 0.4 && dx > 24);
      const ease = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
      s.top.style.transition = ease;
      s.below.style.transition = ease;
      if (commit) {
        haptic();
        s.top.style.transform = `translate3d(${s.w}px,0,0)`;
        s.below.style.transform = 'translate3d(0,0,0)';
        setTimeout(() => {
          flushSync(() => useNav.getState().popImmediate());
          s.below.style.transition = '';
          s.below.style.transform = '';
        }, 300);
      } else {
        s.top.style.transform = 'translate3d(0,0,0)';
        s.below.style.transform = `translate3d(${-0.28 * s.w}px,0,0)`;
        setTimeout(() => {
          for (const l of [s.top, s.below]) {
            l.style.transition = '';
            l.style.transform = '';
          }
        }, 300);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [ref]);
}

export function TabBar() {
  const tab = useNav((s) => s.tab);
  const setTab = useNav((s) => s.setTab);
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={cx('tab', t.key === tab && 'active')}
          onClick={() => {
            haptic();
            setTab(t.key);
          }}
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
