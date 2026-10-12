import type { Exercise, Workout } from '../types';
import { fmtDurationText, fmtSet, fmtVolumeText, type Unit } from './format';
import { fmtFullDate, fmtTime } from './date';
import { workoutDuration, workoutSetCount, workoutVolume, type PRGroup } from './stats';
import { toast } from '../store/ui';

export function workoutShareText(w: Workout, exMap: Map<number, Exercise>, unit: Unit, prs: PRGroup[]): string {
  const prSet = new Set(prs.flatMap((g) => g.hits.map((h) => h.setUid)));
  const lines: string[] = [];
  lines.push(`💪 ${w.name}`);
  lines.push(`📅 ${fmtFullDate(w.startedAt)} ${fmtTime(w.startedAt)} · 用时 ${fmtDurationText(workoutDuration(w))}`);
  const vol = workoutVolume(w, exMap);
  lines.push(`📊 ${workoutSetCount(w)} 组${vol > 0 ? ` · 总容量 ${fmtVolumeText(vol, unit)}` : ''}${prs.length ? ` · 🏆 ${prs.length} 个动作破纪录` : ''}`);
  lines.push('');
  for (const we of w.exercises) {
    const ex = exMap.get(we.exerciseId);
    const type = ex?.type ?? 'weight_reps';
    const sets = we.sets.map((s) => fmtSet(s, type, unit) + (prSet.has(s.uid) ? ' 🏆' : '')).join('，');
    lines.push(`▪ ${ex?.name ?? '动作'}：${sets}`);
  }
  if (w.notes) {
    lines.push('');
    lines.push(`📝 ${w.notes}`);
  }
  lines.push('');
  lines.push('—— 来自「练迹」健身记录');
  return lines.join('\n');
}

export async function shareText(text: string) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('已复制到剪贴板，可以粘贴到微信', { tone: 'success' });
  } catch {
    toast('分享失败', { tone: 'error' });
  }
}
