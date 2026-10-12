import { db } from './db';
import { getSettings, useSettings, type Settings } from '../store/settings';
import type { BodyRecord, Exercise, LegacyTemplate, Plan, Workout } from '../types';
import { BODY_PART_MAP, SET_KIND_MAP } from '../data/meta';
import { dayKey, fmtTime } from '../lib/date';
import { legacyTemplateToPlan, normalizeDays } from '../lib/plan';

const APP_ID = 'lianji';
/** 2：计划按星期安排 */
const BACKUP_VERSION = 2;

export interface BackupFile {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  data: {
    exercises: Exercise[];
    workouts: Workout[];
    templates: Plan[];
    bodyRecords: BodyRecord[];
    settings: Partial<Settings>;
  };
}

export async function buildBackup(): Promise<BackupFile> {
  const [exercises, workouts, templates, bodyRecords] = await Promise.all([
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.templates.toArray(),
    db.bodyRecords.toArray(),
  ]);
  const { installTipDismissed: _a, lastBackupAt: _b, ...settings } = getSettings();
  void _a;
  void _b;
  return {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { exercises, workouts, templates, bodyRecords, settings },
  };
}

export function parseBackup(text: string): BackupFile {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('文件不是有效的 JSON');
  }
  const b = obj as BackupFile;
  if (!b || b.app !== APP_ID || !b.data) throw new Error('这不是「练迹」的备份文件');
  if (b.version > BACKUP_VERSION) throw new Error('备份来自更新版本的 App，请先更新');
  const d = b.data;
  if (!Array.isArray(d.exercises) || !Array.isArray(d.workouts)) throw new Error('备份文件内容不完整');
  const raw: (Plan | LegacyTemplate)[] = Array.isArray(d.templates) ? d.templates : [];
  d.templates = raw.map((t) =>
    Array.isArray((t as Plan).days)
      ? { ...(t as Plan), days: normalizeDays((t as Plan).days) }
      : legacyTemplateToPlan(t as LegacyTemplate),
  );
  d.bodyRecords = Array.isArray(d.bodyRecords) ? d.bodyRecords : [];
  return b;
}

export async function restoreBackup(b: BackupFile) {
  await db.transaction('rw', [db.exercises, db.workouts, db.templates, db.bodyRecords], async () => {
    await Promise.all([db.exercises.clear(), db.workouts.clear(), db.templates.clear(), db.bodyRecords.clear()]);
    await db.exercises.bulkPut(b.data.exercises);
    await db.workouts.bulkPut(b.data.workouts);
    await db.templates.bulkPut(b.data.templates);
    await db.bodyRecords.bulkPut(b.data.bodyRecords);
  });
  if (b.data.settings) useSettings.getState().set(b.data.settings);
}

export async function wipeAll() {
  await db.delete();
  localStorage.removeItem('lianji-active');
  localStorage.removeItem('lianji-rest');
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function buildCsv(): Promise<string> {
  const [exercises, workouts] = await Promise.all([db.exercises.toArray(), db.workouts.orderBy('startedAt').toArray()]);
  const exMap = new Map(exercises.map((e) => [e.id!, e]));
  const rows: unknown[][] = [
    ['日期', '开始时间', '训练名称', '动作', '部位', '组序', '组类型', '重量(kg)', '次数', '时长(秒)', '距离(km)', '备注'],
  ];
  for (const w of workouts) {
    for (const we of w.exercises) {
      const ex = exMap.get(we.exerciseId);
      we.sets.forEach((s, i) => {
        rows.push([
          dayKey(w.startedAt),
          fmtTime(w.startedAt),
          w.name,
          ex?.name ?? '已删除动作',
          ex ? BODY_PART_MAP[ex.bodyPart]?.label : '',
          i + 1,
          SET_KIND_MAP[s.kind]?.label ?? '',
          s.weight ?? '',
          s.reps ?? '',
          s.duration ?? '',
          s.distance ?? '',
          i === 0 ? we.notes ?? '' : '',
        ]);
      });
    }
  }
  return '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

/**
 * 通过系统分享面板保存文件（可存到"文件"、微信、隔空投送）。
 * 不支持分享文件时退回为浏览器下载。返回 false 表示需要用户再次点击触发。
 */
export async function shareFile(content: string, filename: string, mime: string): Promise<boolean> {
  const file = new File([content], filename, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === 'AbortError') return true;
      if (name === 'NotAllowedError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}
