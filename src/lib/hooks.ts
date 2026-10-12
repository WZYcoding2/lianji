import { useEffect, useState } from 'react';

/** 定时刷新的当前时间；interval 为 0 时不刷新 */
export function useNow(interval: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!interval) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), interval);
    const onVis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [interval]);
  return now;
}
