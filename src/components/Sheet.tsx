import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  full?: boolean;
  children: ReactNode;
}

const CLOSE_MS = 300;

/** iOS 风格底部弹出面板，可下拉顶部关闭 */
export function Sheet({ open, onClose, title, left, right, full, children }: SheetProps) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number; t: number; v: number } | null>(null);

  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
      return;
    }
    if (!render) return;
    setClosing(true);
    const t = setTimeout(() => {
      setRender(false);
      setClosing(false);
    }, CLOSE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onTouchStart = (e: TouchEvent) => {
    drag.current = { y: e.touches[0].clientY, dy: 0, t: e.timeStamp, v: 0 };
  };
  const onTouchMove = (e: TouchEvent) => {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || !el) return;
    const y = e.touches[0].clientY;
    const dy = Math.max(0, y - d.y);
    const dt = e.timeStamp - d.t;
    if (dt > 0) d.v = (dy - d.dy) / dt;
    d.dy = dy;
    d.t = e.timeStamp;
    el.style.transition = 'none';
    el.style.transform = `translate3d(0, ${dy}px, 0)`;
  };
  const onTouchEnd = () => {
    const d = drag.current;
    const el = sheetRef.current;
    drag.current = null;
    if (!d || !el) return;
    if (d.dy > 110 || (d.v > 0.5 && d.dy > 20)) {
      el.style.transition = '';
      onClose();
      // 关闭动画从当前位置开始
      requestAnimationFrame(() => {
        if (sheetRef.current) sheetRef.current.style.transform = '';
      });
    } else {
      el.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
      el.style.transform = '';
    }
  };

  if (!render) return null;

  return createPortal(
    <>
      <div className={cx('sheet-backdrop', closing && 'closing')} onClick={onClose} />
      <div className={cx('sheet', full && 'full', closing && 'closing')} ref={sheetRef} role="dialog">
        <div className="sheet-grab" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="sheet-grabber" />
          {(title || left || right) && (
            <div className="sheet-header">
              <div className="nav-left">{left}</div>
              <div className="sheet-title">{title}</div>
              <div className="nav-right">{right}</div>
            </div>
          )}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>,
    document.body,
  );
}
