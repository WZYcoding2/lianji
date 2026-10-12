import { Compass, Ellipsis, Share, ShieldCheck, Smartphone, SquarePlus, WifiOff } from 'lucide-react';
import { Page } from '../components/Page';
import { isStandalone } from '../lib/device';

const STEPS = [
  {
    icon: <Compass size={22} />,
    title: '用 Safari 打开',
    text: '必须是 iPhone 自带的 Safari 浏览器。在微信里打开的话，先点右上角「···」选择「在默认浏览器中打开」。',
  },
  {
    icon: <Share size={22} />,
    title: '点「分享」按钮',
    text: '在 Safari 底部（或地址栏旁的「···」菜单里）找到分享按钮，就是一个方框带向上箭头的图标。',
  },
  {
    icon: <SquarePlus size={22} />,
    title: '选择「添加到主屏幕」',
    text: '在分享菜单里往下滑，点「添加到主屏幕」。如果有「作为 Web App 打开」的开关，保持打开。',
  },
  {
    icon: <Ellipsis size={22} />,
    title: '点右上角「添加」',
    text: '桌面上会出现橙色的「练迹」图标，以后直接点它打开，全屏显示，和普通 App 一样。',
  },
];

export function InstallGuide() {
  const installed = isStandalone();
  return (
    <Page title="添加到主屏幕" back>
      <div className="guide-hero">
        <img src="./apple-touch-icon.png" alt="" className="guide-icon" />
        <h2>{installed ? '你已经在用 App 模式啦' : '4 步装到 iPhone 桌面'}</h2>
        <p className="muted">不用 App Store，不用付费，不会过期</p>
      </div>

      <div className="list">
        {STEPS.map((s, i) => (
          <div className="row guide-step" key={i}>
            <span className="guide-num num">{i + 1}</span>
            <div className="row-main">
              <div className="guide-title">
                {s.icon}
                {s.title}
              </div>
              <div className="guide-text">{s.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="list">
        <div className="row guide-step">
          <span className="guide-num ok">
            <WifiOff size={16} />
          </span>
          <div className="row-main">
            <div className="guide-title">可以离线使用</div>
            <div className="guide-text">首次打开后会缓存到手机里，健身房没信号也能正常记录。</div>
          </div>
        </div>
        <div className="row guide-step">
          <span className="guide-num ok">
            <Smartphone size={16} />
          </span>
          <div className="row-main">
            <div className="guide-title">先安装，再记录</div>
            <div className="guide-text">
              iPhone 上 Safari 和桌面 App 的数据是分开保存的。如果已经在 Safari 里记了数据，可以先在「我的 →
              导出备份」，装好后再「从备份恢复」。
            </div>
          </div>
        </div>
        <div className="row guide-step">
          <span className="guide-num ok">
            <ShieldCheck size={16} />
          </span>
          <div className="row-main">
            <div className="guide-title">数据只在你的手机上</div>
            <div className="guide-text">
              不需要注册账号，也不会上传。建议偶尔在「我的 → 导出备份」存一份到"文件"或微信。
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
