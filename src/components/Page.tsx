import { useRef, useState, type ReactNode, type UIEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cx } from '../lib/cx';
import { nav } from '../store/nav';

interface PageProps {
  title: string;
  large?: boolean;
  subtitle?: ReactNode;
  /** true 显示返回按钮；传函数可自定义返回逻辑（例如未保存提醒） */
  back?: boolean | (() => void);
  left?: ReactNode;
  right?: ReactNode;
  /** 禁用左滑返回（编辑页防止误操作丢失内容） */
  noSwipe?: boolean;
  children: ReactNode;
}

export function Page({ title, large, subtitle, back, left, right, noSwipe, children }: PageProps) {
  const [solid, setSolid] = useState(false);
  const solidRef = useRef(false);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const s = e.currentTarget.scrollTop > (large ? 42 : 2);
    if (s !== solidRef.current) {
      solidRef.current = s;
      setSolid(s);
    }
  };

  return (
    <div className="page" onScroll={onScroll} data-noswipe={noSwipe ? '1' : undefined}>
      <header className={cx('navbar', solid && 'solid', !large && 'always-title')}>
        <div className="navbar-inner">
          <div className="nav-left">
            {back ? (
              <button
                className="glass-btn round"
                aria-label="返回"
                onClick={() => (typeof back === 'function' ? back() : nav.pop())}
              >
                <ChevronLeft size={24} strokeWidth={2.4} />
              </button>
            ) : (
              left
            )}
          </div>
          <div className="nav-title">{title}</div>
          <div className="nav-right">{right}</div>
        </div>
      </header>
      {large && <h1 className="large-title">{title}</h1>}
      {large && subtitle && <div className="large-sub">{subtitle}</div>}
      {children}
    </div>
  );
}
