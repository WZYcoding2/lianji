import { useEffect, useId, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { cx } from '../lib/cx';
import { addDays, dayKey, fmtMonthDay, startOfDay, startOfWeek } from '../lib/date';

function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (!n) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  if (n === 2) return `M${pts[0][0]},${pts[0][1]}L${pts[1][0]},${pts[1][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = dx[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0;
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
    }
  }
  t[n - 1] = m[n - 2];
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const h = dx[i] / 3;
    d += `C${x0 + h},${y0 + h * t[i]} ${x1 - h},${y1 - h * t[i + 1]} ${x1},${y1}`;
  }
  return d;
}

function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

export interface Pt {
  x: number;
  y: number;
}

export function LineChart({
  points,
  height = 190,
  formatY = (v) => String(Math.round(v)),
  formatX = fmtMonthDay,
  color = 'var(--accent)',
}: {
  points: Pt[];
  height?: number;
  formatY?: (v: number) => string;
  formatX?: (x: number) => string;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const w = useWidth(ref);
  const [sel, setSel] = useState<number | null>(null);
  const gid = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '');

  if (!points.length) {
    return (
      <div className="chart-empty" ref={ref}>
        暂无数据
      </div>
    );
  }

  const padL = 4;
  const padR = 42;
  const padT = 30;
  const padB = 24;
  const ys = points.map((p) => p.y);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (minY === maxY) {
    minY -= Math.max(1, Math.abs(minY) * 0.1);
    maxY += Math.max(1, Math.abs(maxY) * 0.1);
  }
  const span = maxY - minY;
  minY -= span * 0.18;
  maxY += span * 0.12;
  if (Math.min(...ys) >= 0 && minY < 0) minY = 0;
  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const innerW = Math.max(10, w - padL - padR);
  const innerH = height - padT - padB;
  const sx = (x: number) => (maxX === minX ? padL + innerW / 2 : padL + ((x - minX) / (maxX - minX)) * innerW);
  const sy = (y: number) => padT + (1 - (y - minY) / (maxY - minY)) * innerH;
  const pts: [number, number][] = points.map((p) => [sx(p.x), sy(p.y)]);
  const line = monotonePath(pts);
  const area =
    pts.length > 1 ? `${line}L${pts[pts.length - 1][0]},${padT + innerH}L${pts[0][0]},${padT + innerH}Z` : '';
  const ticks = niceTicks(minY, maxY, 3);

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let best = 0;
    let bd = Infinity;
    pts.forEach(([px], i) => {
      const d = Math.abs(px - x);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setSel(best);
  };

  const selPt = sel != null ? pts[sel] : null;
  const xLabels = points.length >= 3 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);

  return (
    <div
      className="chart"
      ref={ref}
      style={{ height }}
      onPointerDown={pick}
      onPointerMove={(e) => {
        if (e.buttons || e.pointerType === 'touch') pick(e);
      }}
    >
      {w > 0 && (
        <svg width={w} height={height}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.28" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + innerW} y1={sy(t)} y2={sy(t)} className="chart-grid" />
              <text x={w - 2} y={sy(t) + 4} textAnchor="end" className="chart-axis">
                {formatY(t)}
              </text>
            </g>
          ))}
          {area && <path d={area} fill={`url(#${gid})`} />}
          <path d={line} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          {pts.length <= 40 &&
            pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={pts.length <= 12 ? 3.5 : 2.5} fill="var(--surface)" stroke={color} strokeWidth="2" />
            ))}
          {xLabels.map((i) => (
            <text
              key={i}
              x={pts[i][0]}
              y={height - 6}
              textAnchor={i === 0 && pts.length > 1 ? 'start' : i === pts.length - 1 && pts.length > 1 ? 'end' : 'middle'}
              className="chart-axis"
            >
              {formatX(points[i].x)}
            </text>
          ))}
          {selPt && (
            <g>
              <line x1={selPt[0]} x2={selPt[0]} y1={padT - 6} y2={padT + innerH} className="chart-cursor" />
              <circle cx={selPt[0]} cy={selPt[1]} r="6" fill={color} stroke="var(--surface)" strokeWidth="3" />
            </g>
          )}
        </svg>
      )}
      {selPt && sel != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(selPt[0], 50), w - 50) }}>
          <b>{formatY(points[sel].y)}</b>
          <span>{formatX(points[sel].x)}</span>
        </div>
      )}
    </div>
  );
}

export function BarChart({
  data,
  height = 160,
  format = (v) => String(v),
}: {
  data: { label: string; value: number; title?: string }[];
  height?: number;
  format?: (v: number) => string;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0) || 1;
  const shown = sel ?? data.length - 1;
  const cur = data[shown];
  return (
    <>
      {cur && (
        <div className="bars-head">
          <b>{format(cur.value)}</b>
          <span>{cur.title ?? cur.label}</span>
        </div>
      )}
      <div className="bars" style={{ height }}>
        {data.map((d, i) => (
          <button key={i} className={cx('bar-col', i === shown && 'sel')} onClick={() => setSel(i)}>
            <div className="bar-track">
              <div className="bar" style={{ height: `${Math.max(d.value ? 4 : 0, (d.value / max) * 100)}%` }} />
            </div>
            <div className="bar-label">{d.label}</div>
          </button>
        ))}
      </div>
    </>
  );
}

export function HBars({
  items,
  format = (v) => String(v),
}: {
  items: { label: string; value: number; color: string }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 0) || 1;
  return (
    <div className="hbars">
      {items.map((it) => (
        <div className="hbar" key={it.label}>
          <div className="hbar-label">{it.label}</div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(it.value / max) * 100}%`, background: it.color }} />
          </div>
          <div className="hbar-val num">{format(it.value)}</div>
        </div>
      ))}
    </div>
  );
}

/** 训练热力图：每列一周，每行一天 */
export function Heatmap({
  weeks = 18,
  values,
  weekStart,
}: {
  weeks?: number;
  values: Map<string, number>;
  weekStart: number;
}) {
  const today = startOfDay(Date.now());
  const first = addDays(startOfWeek(today, weekStart), -7 * (weeks - 1));
  const cols: { ts: number; key: string; v: number }[][] = [];
  const months: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let c = 0; c < weeks; c++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const ts = addDays(first, c * 7 + r);
      const key = dayKey(ts);
      col.push({ ts, key, v: ts > today ? -1 : values.get(key) ?? 0 });
    }
    const m = new Date(col[0].ts).getMonth();
    if (m !== lastMonth) {
      months.push({ col: c, label: `${m + 1}月` });
      lastMonth = m;
    }
    cols.push(col);
  }
  const level = (v: number) => (v < 0 ? -1 : v === 0 ? 0 : v < 10 ? 1 : v < 18 ? 2 : v < 26 ? 3 : 4);
  const dayLabels = weekStart === 1 ? ['一', '', '三', '', '五', '', '日'] : ['日', '', '二', '', '四', '', '六'];
  return (
    <div className="heatmap">
      <div className="hm-months" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
        {months.map((m) => (
          <span key={m.col} style={{ gridColumn: `${m.col + 1} / span 3` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="hm-body">
        <div className="hm-days">
          {dayLabels.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="hm-grid" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
          {cols.map((col, c) =>
            col.map((cell, r) => (
              <div
                key={cell.key}
                className={cx('hm-cell', `l${level(cell.v)}`)}
                style={{ gridColumn: c + 1, gridRow: r + 1 }}
                title={`${cell.key} ${cell.v > 0 ? cell.v + ' 组' : ''}`}
              />
            )),
          )}
        </div>
      </div>
      <div className="hm-legend">
        少
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className={cx('hm-cell', `l${l}`)} />
        ))}
        多
      </div>
    </div>
  );
}
