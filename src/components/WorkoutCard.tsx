import { Clock, Trophy } from 'lucide-react';
import { useData } from '../data/DataProvider';
import { useSettings } from '../store/settings';
import { nav } from '../store/nav';
import { fmtDurationText, fmtVolumeText } from '../lib/format';
import { fmtRelativeDay, fmtTime, fmtWeekday } from '../lib/date';
import { workoutDuration, workoutSetCount, workoutVolume } from '../lib/stats';
import { BODY_PART_MAP } from '../data/meta';
import type { Workout } from '../types';

export function WorkoutCard({ w }: { w: Workout }) {
  const { exMap, index } = useData();
  const unit = useSettings((s) => s.unit);
  const prs = index.prsByWorkout.get(w.id!)?.length ?? 0;
  const vol = workoutVolume(w, exMap);
  const parts = [...new Set(w.exercises.map((we) => exMap.get(we.exerciseId)?.bodyPart).filter((b) => !!b))];

  return (
    <button className="card card-pressable wcard" onClick={() => nav.push({ name: 'workoutDetail', id: w.id! })}>
      <div className="wcard-top">
        <div className="wcard-name ellipsis">{w.name}</div>
        <div className="wcard-date">
          {fmtRelativeDay(w.startedAt)} {fmtWeekday(w.startedAt)}
        </div>
      </div>
      <div className="wcard-meta">
        <span>
          <Clock size={14} />
          {fmtTime(w.startedAt)} · {fmtDurationText(workoutDuration(w))}
        </span>
        <span>{workoutSetCount(w)} 组</span>
        {vol > 0 && <span>{fmtVolumeText(vol, unit)}</span>}
        {prs > 0 && (
          <span className="wcard-pr">
            <Trophy size={13} />
            {prs}
          </span>
        )}
      </div>
      <div className="wcard-ex">
        {w.exercises.slice(0, 4).map((we) => (
          <div key={we.uid} className="wcard-ex-row">
            <span className="ellipsis">{exMap.get(we.exerciseId)?.name ?? '已删除的动作'}</span>
            <span className="faint num">× {we.sets.length}</span>
          </div>
        ))}
        {w.exercises.length > 4 && <div className="wcard-more">还有 {w.exercises.length - 4} 个动作</div>}
      </div>
      {parts.length > 0 && (
        <div className="wcard-parts">
          {parts.map((p) => (
            <span key={p} className="tag" style={{ color: BODY_PART_MAP[p!].color }}>
              {BODY_PART_MAP[p!].label}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
