import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import { App } from './App';
import { requestPersist } from './db/db';
import { unlockAudio } from './lib/device';
import { useSettings } from './store/settings';
import { useActive } from './store/workout';
import { toast } from './store/ui';

createRoot(document.getElementById('root')!).render(<App />);

// iOS Safari 需要注册 touchstart 才会触发 :active 样式
document.addEventListener('touchstart', () => {}, { passive: true });

// 禁止双指缩放，保持 App 手感
document.addEventListener('gesturestart', (e) => e.preventDefault());

// 训练中第一次点击时解锁音频，休息结束才能响铃
for (const ev of ['touchend', 'click']) {
  document.addEventListener(
    ev,
    () => {
      if (useSettings.getState().sound && useActive.getState().active) unlockAudio();
    },
    { passive: true },
  );
}

// 键盘收起后 iOS 偶尔不会把页面滚回原位
document.addEventListener('focusout', () => {
  setTimeout(() => {
    const el = document.activeElement;
    if (!el || el === document.body) window.scrollTo(0, 0);
  }, 60);
});

void requestPersist();

const updateSW = registerSW({
  onNeedRefresh() {
    toast('发现新版本', {
      action: { label: '立即更新', onClick: () => void updateSW(true) },
      duration: 15000,
    });
  },
  onOfflineReady() {
    toast('已缓存到手机，没网也能用', { tone: 'success' });
  },
  onRegisteredSW(_url, reg) {
    if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
  },
});
