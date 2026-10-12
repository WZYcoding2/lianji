import { useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CalendarRange,
  Check,
  ChevronRight,
  ChevronsUpDown,
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
import { Empty } from '../components/Controls';
import { WorkoutCard } from '../components/WorkoutCard';
import { WeekStrip } from '../components/WeekStrip';
import { useCurrentPlan, useData } from '../data/DataProvider';
import { useSettings } from '../store/settings';
import { useActive } from '../store/workout';
import { actionSheet, toast, useUI } from '../store/ui';
import { nav } from '../store/nav';
import { cx } from '../lib/cx';
import {
  addDays,
  dayKey,
  fmtMonthDay,
  fmtRelativeDay,
  fmtWeekday,
  isSameDay,
  startOfWeek,
  WEEKDAYS,
  WEEKDAYS_SHORT,
} from '../lib/date';
import { fmtClock, fmtDurationText } from '../lib/format';
import { emptyActive, planDayToActive } from '../lib/draft';
import { deletePlan, duplicatePlan, startWorkout } from '../lib/actions';
import { dayName, isTrainingDay, nextTrainingDay, trainingDayCount, weekOrder } from '../lib/plan';
import { workoutDuration } from '../lib/stats';
import { isIOS, isStandalone } from '../lib/device';
import { useNow } from '../lib/hooks';
import type { Exercise, Plan } from '../types';

export function WorkoutHome() {
  const { workouts, plans } = useData();
  const active = useActive((s) => s.active);
  const weekStart = useSettings((s) => s.weekStart);
  const currentPlanId = useSettings((s) => s.currentPlanId);
  const tipDismissed = useSettings((s) => s.installTipDismissed);
  const setSettings = useSettings((s) => s.set);
  const current = useCurrentPlan(currentPlanId);
  const [preview, setPreview] = useState<Plan | null>(null);
  const now = Date.now();
  const showInstall = isIOS && !isStandalone() && !tipDismissed;

  return (
    <Page
      title="训练"
      large
      subtitle={`${fmtMonthDay(now)} ${fmtWeekday(now)}`}
      right={
        <button className="glass-btn round" aria-label="新建计划" onClick={() => nav.push({ name: 'planEdit' })}>
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

      {active ? (
        <ResumeCard />
      ) : current ? (
        <>
          <TodayCard plan={current} />
          <div className="start-card">
            <button className="btn btn-md btn-block" onClick={() => void startWorkout(emptyActive())}>
              <Plus size={18} strokeWidth={2.6} />
              开始空白训练
            </button>
          </div>
        </>
      ) : (
        <div className="start-card">
          <button className="btn btn-primary btn-block start-btn" onClick={() => void startWorkout(emptyActive())}>
            <Play size={20} fill="currentColor" />
            开始空白训练
          </button>
        </div>
      )}

      <WeekCard weekStart={weekStart} plan={current} />

      <div className="section-header">
        <div className="section-title">我的计划</div>
        <button className="section-link" onClick={() => nav.push({ name: 'planEdit' })}>
          <Plus size={17} strokeWidth={2.6} />
          新建
        </button>
      </div>
      {plans.length ? (
        plans.map((p) => <PlanCard key={p.id} p={p} current={p.id === current?.id} onOpen={() => setPreview(p)} />)
      ) : (
        <Empty
          icon={<ClipboardList size={28} />}
          title="还没有训练计划"
          text="按周一到周日安排每天练什么，首页会自动告诉你今天的训练"
          action={
            <button className="btn btn-tinted btn-md" onClick={() => nav.push({ name: 'planEdit' })}>
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

      <PlanPreview plan={preview} onClose={() => setPreview(null)} />
    </Page>
  );
}

function nextText(plan: Plan, wd: number, exMap: Map<number, Exercise>, weekStart: number): string {
  const next = nextTrainingDay(plan, wd);
  if (!next) return '';
  const nextWeek = ((wd - weekStart + 7) % 7) + next.inDays >= 7;
  const when = next.inDays === 1 ? '明天' : nextWeek ? `下${WEEKDAYS[next.wd]}` : WEEKDAYS[next.wd];
  return `${when}练「${dayName(plan.days[next.wd], exMap)}」`;
}

function TodayCard({ plan }: { plan: Plan }) {
  const { workouts, exMap, plans } = useData();
  const weekStart = useSettings((s) => s.weekStart);
  const setSettings = useSettings((s) => s.set);
  const now = Date.now();
  const wd = new Date(now).getDay();
  const day = plan.days[wd];
  const training = isTrainingDay(day);
  const doneToday = workouts.some((w) => isSameDay(w.startedAt, now) && w.templateId === plan.id && w.planDay === wd);
  const sets = day.exercises.reduce((n, we) => n + we.sets.length, 0);
  const names = day.exercises.map((we) => exMap.get(we.exerciseId)?.name).filter(Boolean);
  const upcoming = nextText(plan, wd, exMap, weekStart);

  const switchPlan = async () => {
    const v = await actionSheet({
      title: '首页按哪个计划安排每天的训练？',
      actions: [
        ...plans.map((p) => ({ label: `${p.name}${p.id === plan.id ? '  ✓' : ''}`, value: String(p.id) })),
        { label: '编辑这个计划', value: 'edit', icon: <Pencil size={20} /> },
      ],
    });
    if (v === 'edit') nav.push({ name: 'planEdit', id: plan.id, day: wd });
    else if (v) setSettings({ currentPlanId: Number(v) });
  };

  const pickDay = async () => {
    const options = weekOrder(weekStart).filter((d) => isTrainingDay(plan.days[d]));
    const v = await actionSheet({
      title: '今天练哪一天的内容？',
      actions: options.map((d) => ({ label: `${WEEKDAYS[d]} · ${dayName(plan.days[d], exMap)}`, value: String(d) })),
    });
    if (v != null) void startWorkout(planDayToActive(plan, Number(v)));
  };

  return (
    <div className="card today-card">
      <div className="today-head">
        <span className="today-label">
          {training ? '今日训练' : '今天'} · {WEEKDAYS[wd]}
        </span>
        <button className="today-plan" onClick={switchPlan}>
          <span className="ellipsis">{plan.name}</span>
          <ChevronsUpDown size={14} />
        </button>
      </div>
      {training ? (
        <>
          <div className="today-title">
            <span className="ellipsis">{dayName(day, exMap)}</span>
            {doneToday && (
              <span className="tag done">
                <Check size={13} strokeWidth={3} />
                已完成
              </span>
            )}
          </div>
          <div className="today-ex">{names.join('、')}</div>
          <div className="today-meta">
            {day.exercises.length} 个动作 · {sets} 组{doneToday && upcoming ? ` · ${upcoming}` : ''}
          </div>
          <button
            className={cx('btn btn-block', doneToday ? 'btn-tinted' : 'btn-primary')}
            onClick={() => void startWorkout(planDayToActive(plan, wd))}
          >
            <Play size={20} fill="currentColor" />
            {doneToday ? '再练一次' : '开始今天的训练'}
          </button>
        </>
      ) : (
        <>
          <div className="today-title">休息日 😴</div>
          <div className="today-ex">
            {trainingDayCount(plan) ? `好好恢复，${upcoming}` : '这个计划还没有安排训练日'}
          </div>
          {trainingDayCount(plan) ? (
            <button className="btn btn-tinted btn-block today-btn" onClick={pickDay}>
              <Play size={18} />
              今天也想练？选一天的内容
            </button>
          ) : (
            <button
              className="btn btn-tinted btn-block today-btn"
              onClick={() => nav.push({ name: 'planEdit', id: plan.id, day: wd })}
            >
              <CalendarRange size={18} />
              去安排训练日
            </button>
          )}
        </>
      )}
    </div>
  );
}

function WeekCard({ weekStart, plan }: { weekStart: number; plan?: Plan }) {
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

  const planned = plan ? trainingDayCount(plan) : 0;
  const todayKey = dayKey(now);
  return (
    <div className="card week-card">
      <div className="week-top">
        <div>
          <div className="week-label">本周训练</div>
          <div className="week-count">
            <span className="num">{count}</span>
            <small>{planned ? `/ ${planned} 次` : '次'}</small>
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
          const wd = new Date(ts).getDay();
          const isPlanned = !!plan && isTrainingDay(plan.days[wd]);
          const missed = isPlanned && !on && key < todayKey;
          return (
            <div
              key={key}
              className={cx(
                'wd',
                on && 'on',
                key === todayKey && 'today',
                ts > now && 'future',
                isPlanned && 'planned',
                missed && 'missed',
              )}
            >
              <span className="wd-label">{WEEKDAYS_SHORT[wd]}</span>
              <span className="wd-dot">{on ? '✓' : new Date(ts).getDate()}</span>
            </div>
          );
        })}
      </div>
      {plan && planned > 0 && <div className="week-legend">虚线圈是「{plan.name}」安排的训练日</div>}
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

function PlanCard({ p, current, onOpen }: { p: Plan; current: boolean; onOpen: () => void }) {
  const weekStart = useSettings((s) => s.weekStart);
  const setSettings = useSettings((s) => s.set);
  const n = trainingDayCount(p);

  const menu = async () => {
    const v = await actionSheet({
      title: p.name,
      actions: [
        ...(current ? [] : [{ label: '设为当前计划', value: 'current', icon: <CalendarCheck2 size={20} /> }]),
        { label: '编辑计划', value: 'edit', icon: <Pencil size={20} /> },
        { label: '复制计划', value: 'copy', icon: <Copy size={20} /> },
        { label: '删除计划', value: 'delete', destructive: true, icon: <Trash size={20} /> },
      ],
    });
    if (v === 'current') {
      setSettings({ currentPlanId: p.id });
      toast(`首页将按「${p.name}」安排每天的训练`, { tone: 'success' });
    } else if (v === 'edit') nav.push({ name: 'planEdit', id: p.id });
    else if (v === 'copy') void duplicatePlan(p);
    else if (v === 'delete') void deletePlan(p);
  };

  return (
    <div className={cx('card plan-tile', current && 'current')} role="button" onClick={onOpen}>
      <div className="tpl-head">
        <div className="tpl-name ellipsis">{p.name}</div>
        {current && <span className="tag current">当前计划</span>}
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
      <WeekStrip days={p.days} weekStart={weekStart} compact />
      <div className="plan-foot">
        <span>{n ? `每周练 ${n} 天` : '还没有安排训练日'}</span>
        {p.lastUsedAt && <span>上次 {fmtRelativeDay(p.lastUsedAt)}</span>}
      </div>
    </div>
  );
}

function PlanPreview({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const { exMap, plans } = useData();
  const weekStart = useSettings((s) => s.weekStart);
  const currentPlanId = useSettings((s) => s.currentPlanId);
  const setSettings = useSettings((s) => s.set);
  const current = useCurrentPlan(currentPlanId);
  const [last, setLast] = useState<Plan | null>(null);
  if (plan && plan !== last) setLast(plan);
  const p = plans.find((x) => x.id === (plan ?? last)?.id) ?? plan ?? last;
  const today = new Date().getDay();

  return (
    <Sheet open={!!plan} onClose={onClose} title={p?.name}>
      {p && (
        <div className="sheet-pad">
          {p.notes && <div className="tpl-notes">{p.notes}</div>}
          <div className="list" style={{ margin: '0 0 16px', ['--sep-inset' as string]: '68px' }}>
            {weekOrder(weekStart).map((wd) => {
              const d = p.days[wd];
              if (!isTrainingDay(d)) {
                return (
                  <div className="row plan-day rest" key={wd}>
                    <span className={cx('pd-wd', wd === today && 'today')}>{WEEKDAYS[wd]}</span>
                    <div className="row-main">休息</div>
                  </div>
                );
              }
              const names = d.exercises.map((we) => exMap.get(we.exerciseId)?.name).filter(Boolean);
              return (
                <div className="row plan-day" key={wd}>
                  <span className={cx('pd-wd', wd === today && 'today')}>{WEEKDAYS[wd]}</span>
                  <div className="row-main">
                    <div className="row-title">{dayName(d, exMap)}</div>
                    <div className="row-sub">
                      {d.exercises.length} 个动作 · {names.join('、')}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-tinted"
                    onClick={() => {
                      onClose();
                      void startWorkout(planDayToActive(p, wd));
                    }}
                  >
                    <Play size={14} fill="currentColor" />
                    开始
                  </button>
                </div>
              );
            })}
          </div>
          <div className="btn-row">
            <button
              className="btn btn-md"
              onClick={() => {
                onClose();
                nav.push({ name: 'planEdit', id: p.id });
              }}
            >
              <Pencil size={18} />
              编辑计划
            </button>
            {current?.id === p.id ? (
              <div className="btn btn-md btn-tinted is-static">
                <Check size={18} strokeWidth={2.6} />
                当前计划
              </div>
            ) : (
              <button
                className="btn btn-md btn-tinted"
                onClick={() => {
                  setSettings({ currentPlanId: p.id });
                  toast(`首页将按「${p.name}」安排每天的训练`, { tone: 'success' });
                }}
              >
                <CalendarCheck2 size={18} />
                设为当前计划
              </button>
            )}
          </div>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button
              className="btn btn-md"
              onClick={() => {
                onClose();
                void duplicatePlan(p);
              }}
            >
              <SquarePlus size={18} />
              复制
            </button>
            <button
              className="btn btn-md btn-danger"
              onClick={async () => {
                if (await deletePlan(p)) onClose();
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
