import { useEffect, type CSSProperties } from 'react';
import { DataProvider } from './data/DataProvider';
import { Navigator, TabBar } from './components/Navigator';
import { WorkoutOverlay } from './components/WorkoutOverlay';
import { SummaryOverlay } from './components/SummaryOverlay';
import { DialogHost, ToastHost } from './components/DialogHost';
import { useSettings } from './store/settings';
import { useActive, useRest } from './store/workout';
import { toast, useUI } from './store/ui';
import { ACCENTS } from './data/meta';
import { hexToRgb } from './lib/cx';
import { beep, setKeepAwake } from './lib/device';

function useTheme() {
  const theme = useSettings((s) => s.theme);
  const accent = useSettings((s) => s.accent);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((m) => m.setAttribute('content', dark ? '#000000' : '#f2f2f7'));
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    const a = ACCENTS.find((x) => x.id === accent) ?? ACCENTS[0];
    const st = document.documentElement.style;
    st.setProperty('--accent', a.color);
    st.setProperty('--accent-rgb', hexToRgb(a.color));
    st.setProperty('--on-accent', a.on);
  }, [accent]);
}

/** 休息倒计时结束：响铃 + 提示 */
function RestWatcher() {
  const endAt = useRest((s) => s.endAt);
  useEffect(() => {
    if (!endAt) return;
    const fire = () => {
      if (useRest.getState().endAt !== endAt) return;
      const late = Date.now() - endAt;
      useRest.getState().stop();
      if (late < 3000 && document.visibilityState === 'visible') {
        if (useSettings.getState().sound) beep();
        toast('休息结束，开始下一组吧 💪', { tone: 'success' });
      }
    };
    const ms = endAt - Date.now();
    if (ms <= 0) {
      fire();
      return;
    }
    const t = setTimeout(fire, ms);
    const onVis = () => {
      if (document.visibilityState === 'visible' && Date.now() >= endAt) fire();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [endAt]);
  return null;
}

function Splash() {
  return (
    <div className="splash">
      <img src="./apple-touch-icon.png" alt="" />
    </div>
  );
}

export function App() {
  useTheme();
  const hasActive = useActive((s) => s.active != null);
  const open = useUI((s) => s.workoutOpen);
  const keepAwake = useSettings((s) => s.keepAwake);

  useEffect(() => {
    setKeepAwake(hasActive && keepAwake);
  }, [hasActive, keepAwake]);

  return (
    <DataProvider fallback={<Splash />}>
      <div className="app" style={{ '--mini-h': hasActive && !open ? '66px' : '0px' } as CSSProperties}>
        <Navigator />
        <TabBar />
        <WorkoutOverlay />
        <SummaryOverlay />
        <RestWatcher />
      </div>
      <DialogHost />
      <ToastHost />
    </DataProvider>
  );
}
