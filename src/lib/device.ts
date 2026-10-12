export const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function isStandalone(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/**
 * 轻触觉反馈。iOS Safari 不支持 navigator.vibrate，
 * 但点击带 switch 属性的复选框会触发系统触感（iOS 18+），需在点击事件中调用。
 */
export function haptic() {
  try {
    if (typeof navigator.vibrate === 'function' && !isIOS) {
      navigator.vibrate(12);
      return;
    }
    if (!isIOS) return;
    const label = document.createElement('label');
    label.ariaHidden = 'true';
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.head.appendChild(label);
    label.click();
    document.head.removeChild(label);
  } catch {
    /* 忽略 */
  }
}

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** iOS 需要在用户手势中解锁音频 */
export function unlockAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

/** 休息结束提示音：三声短促的"嘀" */
export function beep(times = 3) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const t0 = ctx.currentTime + 0.02;
  for (let i = 0; i < times; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === times - 1 ? 1320 : 880;
    const start = t0 + i * 0.28;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.45, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.22);
  }
}

type WakeLockSentinelLike = { release: () => Promise<void>; released?: boolean };
let wakeLock: WakeLockSentinelLike | null = null;
let wantWake = false;

async function acquireWake() {
  try {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
    if (!wl || document.visibilityState !== 'visible') return;
    if (wakeLock && !wakeLock.released) return;
    wakeLock = await wl.request('screen');
  } catch {
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (wantWake && document.visibilityState === 'visible') void acquireWake();
});

/** 训练时保持屏幕常亮 */
export function setKeepAwake(on: boolean) {
  wantWake = on;
  if (on) void acquireWake();
  else if (wakeLock) {
    void wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
