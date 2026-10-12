import type { ExerciseType, SetValues } from '../types';
import { pad } from './date';

export type Unit = 'kg' | 'lb';
const LB_PER_KG = 2.2046226218;

export function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** 去掉多余小数位：62.50 → 62.5 */
export function fmtNum(n: number | undefined | null, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '';
  return String(round(n, digits));
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function kgToDisplay(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG;
}

export function displayToKg(v: number, unit: Unit): number {
  return unit === 'kg' ? v : v / LB_PER_KG;
}

/** 重量数字（不带单位），已按单位换算 */
export function fmtW(kg: number | undefined, unit: Unit): string {
  if (kg == null) return '';
  return fmtNum(kgToDisplay(kg, unit), unit === 'kg' ? 2 : 1);
}

export function fmtWeight(kg: number | undefined, unit: Unit): string {
  if (kg == null) return '—';
  return `${fmtW(kg, unit)}${unit}`;
}

/** 总容量：大于 1 万 kg 显示为吨 */
export function fmtVolume(kg: number, unit: Unit): { value: string; unit: string } {
  if (unit === 'lb') {
    const lb = kgToDisplay(kg, 'lb');
    if (lb >= 100000) return { value: fmtNum(lb / 1000, 1) + 'k', unit: 'lb' };
    return { value: fmtInt(lb), unit: 'lb' };
  }
  if (kg >= 10000) return { value: fmtNum(kg / 1000, 1), unit: '吨' };
  return { value: fmtInt(kg), unit: 'kg' };
}

export function fmtVolumeText(kg: number, unit: Unit): string {
  const v = fmtVolume(kg, unit);
  return `${v.value} ${v.unit}`;
}

/** 秒 → 1:05:23 / 5:23 */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** 秒 → 1小时5分 / 45分钟 / 30秒 */
export function fmtDurationText(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  if (s < 60) return `${s}秒`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}分钟`;
  return m ? `${h}小时${m}分` : `${h}小时`;
}

/** 总时长（小时，保留 1 位） */
export function fmtHours(totalSec: number): string {
  return fmtNum(totalSec / 3600, 1);
}

export function fmtRest(sec: number): string {
  if (sec <= 0) return '不计时';
  if (sec < 60) return `${sec}秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}分${s}秒` : `${m}分钟`;
}

/** 一组的完整描述：60kg × 8 / 12次 / 1:30 / 5km · 30:00 */
export function fmtSet(set: SetValues, type: ExerciseType, unit: Unit): string {
  switch (type) {
    case 'weight_reps':
      return `${fmtW(set.weight ?? 0, unit)}${unit} × ${set.reps ?? 0}`;
    case 'reps':
      return `${set.reps ?? 0} 次`;
    case 'time':
      return fmtClock(set.duration ?? 0);
    case 'distance_time': {
      const parts: string[] = [];
      if (set.distance) parts.push(`${fmtNum(set.distance)}km`);
      if (set.duration) parts.push(fmtClock(set.duration));
      return parts.join(' · ') || '—';
    }
  }
}

/** 紧凑描述：60×8 / ×12 / 1:30 / 5km */
export function fmtSetShort(set: SetValues | undefined, type: ExerciseType, unit: Unit): string {
  if (!set) return '—';
  switch (type) {
    case 'weight_reps':
      if (set.reps == null && set.weight == null) return '—';
      return `${fmtW(set.weight ?? 0, unit)}×${set.reps ?? 0}`;
    case 'reps':
      return set.reps != null ? `×${set.reps}` : '—';
    case 'time':
      return set.duration != null ? fmtClock(set.duration) : '—';
    case 'distance_time':
      if (set.distance) return `${fmtNum(set.distance)}km`;
      return set.duration != null ? fmtClock(set.duration) : '—';
  }
}
