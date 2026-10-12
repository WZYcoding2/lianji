import { ClipboardPlus, Ellipsis, Pencil, Repeat, Share, Trash, Trophy } from 'lucide-react';
import { Page } from '../components/Page';
import { Empty, ExerciseAvatar } from '../components/Controls';
import { PRGroupLine } from '../components/SummaryOverlay';
import { useData } from '../data/DataProvider';
import { useSettings } from '../store/settings';
import { nav } from '../store/nav';
import { actionSheet } from '../store/ui';
import { cx } from '../lib/cx';
import { fmtFullDate, fmtTime, fmtWeekday } from '../lib/date';
import { fmtDurationText, fmtNum, fmtSet, fmtVolume, kgToDisplay } from '../lib/format';
import { e1rm, workoutDuration, workoutSetCount, workoutVolume } from '../lib/stats';
import { deleteWorkout, saveWorkoutToPlan, startWorkout } from '../lib/actions';
import { workoutToActive } from '../lib/draft';
import { shareText, workoutShareText } from '../lib/share';
import { SET_KIND_MAP } from '../data/meta';

export function WorkoutDetail({ id }: { id: number }) {
  const { workouts, exMap, index, plans } = useData();
  const unit = useSettings((s) => s.unit);
  const w = workouts.find((x) => x.id === id);

  if (!w) {
    return (
      <Page title="训练详情" back>
        <Empty title="这条记录已被删除" />
      </Page>
    );
  }

  const prs = index.prsByWorkout.get(id) ?? [];
  const vol = fmtVolume(workoutVolume(w, exMap), unit);

  const menu = async () => {
    const v = await actionSheet({
      title: w.name,
      actions: [
        { label: '编辑这次训练', value: 'edit', icon: <Pencil size={20} /> },
        { label: '分享训练内容', value: 'share', icon: <Share size={20} /> },
        { label: '保存到计划的某一天', value: 'template', icon: <ClipboardPlus size={20} /> },
        { label: '删除', value: 'delete', destructive: true, icon: <Trash size={20} /> },
      ],
    });
    if (v === 'edit') nav.push({ name: 'workoutEdit', id });
    else if (v === 'share') void shareText(workoutShareText(w, exMap, unit, prs));
    else if (v === 'template') void saveWorkoutToPlan(w, plans, exMap);
    else if (v === 'delete') {
      if (await deleteWorkout(w)) nav.pop();
    }
  };

  return (
    <Page
      title={w.name}
      back
      right={
        <button className="glass-btn round" aria-label="更多" onClick={menu}>
          <Ellipsis size={22} />
        </button>
      }
    >
      <div className="detail-head">
        <h2>{w.name}</h2>
        <div className="muted">
          {fmtFullDate(w.startedAt)} {fmtWeekday(w.startedAt)} · {fmtTime(w.startedAt)} - {fmtTime(w.endedAt)}
        </div>
      </div>

      <div className="stat-grid compact">
        <div className="stat">
          <div className="stat-label">时长</div>
          <div className="stat-value">{fmtDurationText(workoutDuration(w))}</div>
        </div>
        <div className="stat">
          <div className="stat-label">总容量</div>
          <div className="stat-value">
            <span className="num">{vol.value}</span>
            <small>{vol.unit}</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">组数</div>
          <div className="stat-value">
            <span className="num">{workoutSetCount(w)}</span>
            <small>组</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">破纪录动作</div>
          <div className="stat-value">
            <span className="num">{prs.length}</span>
            <small>个</small>
          </div>
        </div>
      </div>

      {w.notes && <div className="card note-card">{w.notes}</div>}

      {prs.length > 0 && (
        <div className="card pr-card">
          <div className="pr-card-title">
            <Trophy size={20} />
            本次刷新的个人纪录
          </div>
          {prs.map((g) => (
            <PRGroupLine key={g.exerciseId} g={g} />
          ))}
        </div>
      )}

      {w.exercises.map((we) => {
        const ex = exMap.get(we.exerciseId);
        const type = ex?.type ?? 'weight_reps';
        let n = 0;
        return (
          <div className="card detail-ex" key={we.uid}>
            <button className="detail-ex-head" onClick={() => ex && nav.push({ name: 'exerciseDetail', id: ex.id! })}>
              <ExerciseAvatar ex={ex} size="sm" />
              <div className="row-main">
                <div className="detail-ex-name ellipsis">{ex?.name ?? '已删除的动作'}</div>
                {we.notes && <div className="row-sub">{we.notes}</div>}
              </div>
            </button>
            {we.sets.map((s) => {
              const label = s.kind === 'normal' ? String(++n) : SET_KIND_MAP[s.kind].badge;
              const isPR = index.prSets.has(s.uid);
              return (
                <div className={cx('detail-set', isPR && 'pr')} key={s.uid}>
                  <span
                    className="detail-set-n num"
                    style={s.kind !== 'normal' ? { color: SET_KIND_MAP[s.kind].color } : undefined}
                  >
                    {label}
                  </span>
                  <span className="detail-set-v num">{fmtSet(s, type, unit)}</span>
                  {type === 'weight_reps' && (s.reps ?? 0) > 1 && (s.weight ?? 0) > 0 && (
                    <span className="detail-set-e faint num">
                      1RM≈{fmtNum(kgToDisplay(e1rm(s.weight!, s.reps!), unit), 1)}
                    </span>
                  )}
                  {isPR && (
                    <span className="pr-badge">
                      <Trophy size={12} />
                      PR
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="form-pad">
        <button className="btn btn-primary btn-block" onClick={() => void startWorkout(workoutToActive(w))}>
          <Repeat size={20} />
          再练一次
        </button>
      </div>
    </Page>
  );
}
