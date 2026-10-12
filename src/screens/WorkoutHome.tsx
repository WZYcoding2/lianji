import { useMemo, useState } from 'react';
import {
  ChevronRight,
  ClipboardList,
  Copy,
  Ellipsis,
  Flame,
  Pencil,
  Play,
  Plus,
  Share,
  Smartphone,
  SquarePlus,
  Trash,
  X,
} from 'lucide-react';
import { Page } from '../components/Page';
import { Sheet } from '../components/Sheet';
import { Empty, ExerciseAvatar } from '../components/Controls';
import { WorkoutCard } from '../components/WorkoutCard';
import { useData } from '../data/DataProvider';
import { useSettings } from '../store/settings';
import { useActive } from '../store/workout';
import { actionSheet, useUI } from '../store/ui';
import { nav } from '../store/nav';
import { cx } from '../lib/cx';
import { addDays, dayKey, fmtMonthDay, fmtRelativeDay, fmtWeekday, startOfWeek, WEEKDAYS_SHORT } from '../lib/date';
import { fmtClock, fmtDurationText } from '../lib/format';
import { emptyActive, templateToActive } from '../lib/draft';
import { deleteTemplate, duplicateTemplate, startWorkout } from '../lib/actions';
import { workoutDuration } from '../lib/stats';
import { isIOS, isStandalone } from '../lib/device';
import { useNow } from '../lib/hooks';
import { EXERCISE_TYPE_MAP } from '../data/meta';
import type { Template } from '../types';

export function WorkoutHome() {
  const { workouts, templates } = useData();
  const active = useActive((s) => s.active);
  const weekStart = useSettings((s) => s.weekStart);
  const tipDismissed = useSettings((s) => s.installTipDismissed);
  const setSettings = useSettings((s) => s.set);
  const [preview, setPreview] = useState<Template | null>(null);
  const now = Date.now();
  const showInstall = isIOS && !isStandalone() && !tipDismissed;

  return (
    <Page
      title="训练"
      large
      subtitle={`${fmtMonthDay(now)} ${fmtWeekday(now)}`}
      right={
        <button className="glass-btn round" aria-label="新建计划" onClick={() => nav.push({ name: 'templateEdit' })}>
          <Plus size={22} strokeWidth={2.4} />
        </button>
      }
    >
      {showInstall && (
        <div className="card install-tip">
          <div className="install-icon">
            <Smartphone size={22} />
          </div>
          <div className="row-main">
            <div className="install-title">添加到主屏幕，像 App 一样用</div>
            <div className="install-text">
              点 Safari 的 <Share size={13} className="inline-icon" /> 分享按钮 → 选择「添加到主屏幕」。
              建议装好后再开始记录，Safari 里的数据不会带到桌面 App。
            </div>
            <button className="section-link" onClick={() => nav.push({ name: 'installGuide' })}>
              查看详细步骤 <ChevronRight size={15} />
            </button>
          </div>
          <button className="icon-btn" aria-label="关闭" onClick={() => setSettings({ installTipDismissed: true })}>
            <X size={18} />
          </button>
        </div>
      )}

      <WeekCard weekStart={weekStart} />

      {active ? <ResumeCard /> : <StartCard />}

      <div className="section-header">
        <div className="section-title">我的计划</div>
        <button className="section-link" onClick={() => nav.push({ name: 'templateEdit' })}>
          <Plus size={17} strokeWidth={2.6} />
          新建
        </button>
      </div>
      {templates.length ? (
        <div className="tpl-grid">
          {templates.map((t) => (
            <TemplateCard key={t.id} t={t} onOpen={() => setPreview(t)} />
          ))}
        </div>
      ) : (
        <Empty
          icon={<ClipboardList size={28} />}
          title="还没有训练计划"
          text="把常练的动作组合存成计划，下次一键开始"
          action={
            <button className="btn btn-tinted btn-md" onClick={() => nav.push({ name: 'templateEdit' })}>
              <Plus size={18} />
              新建计划
            </button>
          }
        />
      )}

      {workouts.length > 0 && (
        <>
          <div className="section-header">
            <div className="section-title">最近训练</div>
            <button className="section-link" onClick={() => nav.setTab('history')}>
              全部
              <ChevronRight size={17} />
            </button>
          </div>
          {workouts.slice(0, 3).map((w) => (
            <WorkoutCard key={w.id} w={w} />
          ))}
        </>
      )}

      <TemplatePreview template={preview} onClose={() => setPreview(null)} />
    </Page>
  );
}

function WeekCard({ weekStart }: { weekStart: number }) {
  const { workouts } = useData();
  const now = Date.now();
  const ws = startOfWeek(now, weekStart);

  const { trained, count, seconds, streak } = useMemo(() => {
    const trained = new Set<string>();
    let count = 0;
    let seconds = 0;
    const weeks = new Set<number>();
    for (const w of workouts) {
      weeks.add(startOfWeek(w.startedAt, weekStart));
      if (w.startedAt >= ws) {
        trained.add(dayKey(w.startedAt));
        count++;
        seconds += workoutDuration(w);
      }
    }
    // 连续训练周数：本周没练不打断（还没结束）
    let streak = 0;
    let cur = weeks.has(ws) ? ws : addDays(ws, -7);
    while (weeks.has(cur)) {
      streak++;
      cur = addDays(cur, -7);
    }
    return { trained, count, seconds, streak };
  }, [workouts, weekStart, ws]);

  const todayKey = dayKey(now);
  return (
    <div className="card week-card">
      <div className="week-top">
        <div>
          <div className="week-label">本周训练</div>
          <div className="week-count">
            <span className="num">{count}</span>
            <small>次</small>
            {seconds > 0 && <span className="week-time">{fmtDurationText(seconds)}</span>}
          </div>
        </div>
        {streak > 0 && (
          <div className="streak">
            <Flame size={18} />
            连续 <b className="num">{streak}</b> 周
          </div>
        )}
      </div>
      <div className="week-days">
        {Array.from({ length: 7 }, (_, i) => {
          const ts = addDays(ws, i);
          const key = dayKey(ts);
          const on = trained.has(key);
          return (
            <div key={key} className={cx('wd', on && 'on', key === todayKey && 'today', ts > now && 'future')}>
              <span className="wd-label">{WEEKDAYS_SHORT[new Date(ts).getDay()]}</span>
              <span className="wd-dot">{on ? '✓' : new Date(ts).getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StartCard() {
  return (
    <div className="start-card">
      <button className="btn btn-primary btn-block start-btn" onClick={() => void startWorkout(emptyActive())}>
        <Play size={20} fill="currentColor" />
        开始空白训练
      </button>
    </div>
  );
}

function ResumeCard() {
  const active = useActive((s) => s.active)!;
  const setOpen = useUI((s) => s.setWorkoutOpen);
  const now = useNow(1000);
  const done = active.exercises.reduce((n, we) => n + we.sets.filter((s) => s.done).length, 0);
  return (
    <button className="card card-pressable resume-card" onClick={() => setOpen(true)}>
      <div className="resume-left">
        <div className="resume-label">
          <span className="live-dot" />
          训练进行中
        </div>
        <div className="resume-name ellipsis">{active.name}</div>
        <div className="resume-sub">
          {active.exercises.length} 个动作 · 已完成 {done} 组
        </div>
      </div>
      <div className="resume-right">
        <div className="resume-time num">{fmtClock((now - active.startedAt) / 1000)}</div>
        <span className="btn btn-sm btn-primary">继续</span>
      </div>
    </button>
  );
}

function TemplateCard({ t, onOpen }: { t: Template; onOpen: () => void }) {
  const { exMap } = useData();
  const names = t.exercises.map((we) => exMap.get(we.exerciseId)?.name).filter(Boolean);
  const sets = t.exercises.reduce((n, we) => n + we.sets.length, 0);

  const menu = async () => {
    const v = await actionSheet({
      title: t.name,
      actions: [
        { label: '开始训练', value: 'start', icon: <Play size={20} /> },
        { label: '编辑计划', value: 'edit', icon: <Pencil size={20} /> },
        { label: '复制计划', value: 'copy', icon: <Copy size={20} /> },
        { label: '删除计划', value: 'delete', destructive: true, icon: <Trash size={20} /> },
      ],
    });
    if (v === 'start') void startWorkout(templateToActive(t));
    else if (v === 'edit') nav.push({ name: 'templateEdit', id: t.id });
    else if (v === 'copy') void duplicateTemplate(t);
    else if (v === 'delete') void deleteTemplate(t);
  };

  return (
    <div className="card tpl-card" onClick={onOpen} role="button">
      <div className="tpl-head">
        <div className="tpl-name ellipsis">{t.name}</div>
        <button
          className="icon-btn"
          aria-label="更多"
          onClick={(e) => {
            e.stopPropagation();
            void menu();
          }}
        >
          <Ellipsis size={20} />
        </button>
      </div>
      <div className="tpl-ex">{names.length ? names.join('、') : '还没有动作'}</div>
      <div className="tpl-foot">
        <span>
          {t.exercises.length} 个动作 · {sets} 组
        </span>
        {t.lastUsedAt && <span>上次 {fmtRelativeDay(t.lastUsedAt)}</span>}
      </div>
    </div>
  );
}

function TemplatePreview({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const { exMap, templates } = useData();
  const [last, setLast] = useState<Template | null>(null);
  if (template && template !== last) setLast(template);
  const t = templates.find((x) => x.id === (template ?? last)?.id) ?? template ?? last;

  return (
    <Sheet open={!!template} onClose={onClose} title={t?.name}>
      {t && (
        <div className="sheet-pad">
          {t.notes && <div className="tpl-notes">{t.notes}</div>}
          <div className="list" style={{ margin: '0 0 16px', ['--sep-inset' as string]: '70px' }}>
            {t.exercises.map((we) => {
              const ex = exMap.get(we.exerciseId);
              const reps = we.sets.map((s) => s.reps).filter((r) => r != null);
              const sameReps = reps.length === we.sets.length && reps.every((r) => r === reps[0]);
              return (
                <div className="row" key={we.uid}>
                  <ExerciseAvatar ex={ex} />
                  <div className="row-main">
                    <div className="row-title">{ex?.name ?? '已删除的动作'}</div>
                    <div className="row-sub">
                      {we.sets.length} 组
                      {sameReps && ex?.type !== 'time' && ` × ${reps[0]} 次`}
                      {ex && ex.type !== 'weight_reps' && ` · ${EXERCISE_TYPE_MAP[ex.type]}`}
                    </div>
                  </div>
                </div>
              );
            })}
            {!t.exercises.length && (
              <div className="row">
                <div className="row-main muted">这个计划还没有动作</div>
              </div>
            )}
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              onClose();
              void startWorkout(templateToActive(t));
            }}
          >
            <Play size={20} fill="currentColor" />
            开始训练
          </button>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button
              className="btn btn-md"
              onClick={() => {
                onClose();
                nav.push({ name: 'templateEdit', id: t.id });
              }}
            >
              <Pencil size={18} />
              编辑
            </button>
            <button
              className="btn btn-md"
              onClick={() => {
                onClose();
                void duplicateTemplate(t);
              }}
            >
              <SquarePlus size={18} />
              复制
            </button>
            <button
              className="btn btn-md btn-danger"
              onClick={async () => {
                if (await deleteTemplate(t)) onClose();
              }}
            >
              <Trash size={18} />
              删除
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
