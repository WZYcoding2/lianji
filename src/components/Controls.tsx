import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleX, Search } from 'lucide-react';
import { cx, alpha } from '../lib/cx';
import { fmtNum } from '../lib/format';
import { pad } from '../lib/date';
import { haptic } from '../lib/device';
import { BODY_PART_MAP } from '../data/meta';
import type { Exercise } from '../types';

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  small,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  small?: boolean;
  className?: string;
}) {
  return (
    <div className={cx('seg', small && 'small', className)} role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          aria-selected={o.value === value}
          className={cx(o.value === value && 'active')}
          onClick={() => {
            if (o.value !== value) {
              haptic();
              onChange(o.value);
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cx('switch', on && 'on')}
      onClick={() => {
        haptic();
        onChange(!on);
      }}
    />
  );
}

function selectAll(el: HTMLInputElement) {
  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(0, el.value.length);
    } catch {
      /* 忽略 */
    }
  });
}

/** 数字输入：输入中保留原始文本（如 "62."），失焦后再格式化 */
export function NumInput({
  value,
  onChange,
  placeholder,
  decimal = true,
  className,
  maxLength = 7,
  ariaLabel,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  decimal?: boolean;
  className?: string;
  maxLength?: number;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value == null ? '' : fmtNum(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value == null ? '' : fmtNum(value));
  }, [value]);

  return (
    <input
      className={className}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      autoComplete="off"
      aria-label={ariaLabel}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true;
        selectAll(e.currentTarget);
      }}
      onBlur={() => {
        focused.current = false;
        setText(value == null ? '' : fmtNum(value));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      onChange={(e) => {
        let t = e.target.value.replace(/[,，。]/g, '.').replace(decimal ? /[^\d.]/g : /\D/g, '');
        const dot = t.indexOf('.');
        if (dot >= 0) t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '');
        if (t.length > maxLength) t = t.slice(0, maxLength);
        setText(t);
        const n = t === '' || t === '.' ? undefined : Number(t);
        onChange(n == null || Number.isNaN(n) ? undefined : n);
      }}
    />
  );
}

function secToDigits(sec?: number): string {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h) return `${h}${pad(m)}${pad(s)}`;
  if (m) return `${m}${pad(s)}`;
  return String(s);
}

function digitsToDisplay(d: string): string {
  const p = d.padStart(3, '0');
  const s = p.slice(-2);
  const rest = p.slice(0, -2);
  if (rest.length <= 2) return `${Number(rest)}:${s}`;
  return `${Number(rest.slice(0, -2))}:${rest.slice(-2)}:${s}`;
}

function digitsToSec(d: string): number {
  const p = d.padStart(6, '0');
  return Number(p.slice(0, 2)) * 3600 + Number(p.slice(2, 4)) * 60 + Number(p.slice(4, 6));
}

/** 时长输入：像微波炉一样从右往左填数字，130 → 1:30 */
export function DurationInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  const [digits, setDigits] = useState(secToDigits(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDigits(secToDigits(value));
  }, [value]);

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      enterKeyHint="done"
      autoComplete="off"
      value={digits ? digitsToDisplay(digits) : ''}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true;
        selectAll(e.currentTarget);
      }}
      onBlur={() => {
        focused.current = false;
        setDigits(secToDigits(value));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(-6);
        setDigits(d);
        onChange(d ? digitsToSec(d) : undefined);
      }}
    />
  );
}

/** 左滑显示删除按钮 */
export function SwipeRow({
  children,
  onDelete,
  disabled,
  label = '删除',
}: {
  children: ReactNode;
  onDelete: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;
  const W = 84;

  useEffect(() => {
    const wrap = wrapRef.current;
    const content = contentRef.current;
    if (!wrap || !content || disabled) return;
    let st: { x: number; y: number; decided: boolean; horiz: boolean; base: number; cur: number } | null = null;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      st = { x: t.clientX, y: t.clientY, decided: false, horiz: false, base: openRef.current ? -W : 0, cur: 0 };
    };
    const onMove = (e: TouchEvent) => {
      if (!st) return;
      const t = e.touches[0];
      const dx = t.clientX - st.x;
      const dy = t.clientY - st.y;
      if (!st.decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        st.decided = true;
        st.horiz = Math.abs(dx) > Math.abs(dy) * 1.2 && !(st.x < 30 && dx > 0);
        if (!st.horiz) {
          st = null;
          return;
        }
        content.style.transition = 'none';
      }
      e.preventDefault();
      let x = Math.min(0, st.base + dx);
      if (x < -W) x = -W + (x + W) * 0.35;
      st.cur = x;
      content.style.transform = `translate3d(${x}px,0,0)`;
    };
    const onEnd = () => {
      if (!st || !st.horiz) {
        st = null;
        return;
      }
      const next = st.cur < -W / 2;
      st = null;
      content.style.transition = '';
      content.style.transform = next ? `translate3d(${-W}px,0,0)` : '';
      setOpen(next);
    };
    wrap.addEventListener('touchstart', onStart, { passive: true });
    wrap.addEventListener('touchmove', onMove, { passive: false });
    wrap.addEventListener('touchend', onEnd);
    wrap.addEventListener('touchcancel', onEnd);
    return () => {
      wrap.removeEventListener('touchstart', onStart);
      wrap.removeEventListener('touchmove', onMove);
      wrap.removeEventListener('touchend', onEnd);
      wrap.removeEventListener('touchcancel', onEnd);
    };
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        if (contentRef.current) contentRef.current.style.transform = '';
      }
    };
    document.addEventListener('touchstart', onDoc, true);
    document.addEventListener('mousedown', onDoc, true);
    return () => {
      document.removeEventListener('touchstart', onDoc, true);
      document.removeEventListener('mousedown', onDoc, true);
    };
  }, [open]);

  return (
    <div className="swipe" ref={wrapRef}>
      <div className="swipe-actions" aria-hidden={!open}>
        <button
          className="swipe-del"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            setOpen(false);
            if (contentRef.current) contentRef.current.style.transform = '';
            onDelete();
          }}
        >
          {label}
        </button>
      </div>
      <div
        className="swipe-content"
        ref={contentRef}
        onClickCapture={(e) => {
          if (openRef.current) {
            e.stopPropagation();
            e.preventDefault();
            setOpen(false);
            if (contentRef.current) contentRef.current.style.transform = '';
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder = '搜索动作',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search">
      <Search size={17} />
      <input
        className="input"
        type="search"
        enterKeyHint="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      {value && (
        <button className="icon-btn clear" aria-label="清除" onClick={() => onChange('')}>
          <CircleX size={18} />
        </button>
      )}
    </div>
  );
}

export function ExerciseAvatar({ ex, size }: { ex?: Exercise; size?: 'sm' | 'lg' }) {
  const bp = BODY_PART_MAP[ex?.bodyPart ?? 'other'] ?? BODY_PART_MAP.other;
  return (
    <div className={cx('ex-avatar', size)} style={{ background: alpha(bp.color, 0.15), color: bp.color }}>
      {bp.short}
    </div>
  );
}
