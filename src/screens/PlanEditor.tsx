import { useCallback, useRef, useState } from 'react';
import { Coffee, Copy, Ellipsis, Plus, Trash } from 'lucide-react';
import { Page } from '../components/Page';
import { Empty } from '../components/Controls';
import { ExerciseBlock, type BlockAction } from '../components/ExerciseBlock';
import { ExercisePicker } from '../components/ExercisePicker';
import { WeekStrip } from '../components/WeekStrip';
import { useData } from '../data/DataProvider';
import { db } from '../db/db';
import { nav } from '../store/nav';
import { useSettings } from '../store/settings';
import { actionSheet, confirmDialog, toast } from '../store/ui';
import { emptySet, moveItem, toPlanExercises } from '../lib/draft';
import { WEEKDAYS } from '../lib/date';
import { dayName, emptyDays, isTrainingDay, suggestDayName, weekOrder } from '../lib/plan';
import { deletePlan } from '../lib/actions';
import { uid } from '../lib/uid';
import type { PlanDay, WorkoutExercise } from '../types';

export function PlanEditor({ id, day }: { id?: number; day?: number }) {
  const { plans, exMap } = useData();
  const weekStart = useSettings((s) => s.weekStart);
  const setSettings = useSettings((s) => s.set);
  const original = id != null ? plans.find((p) => p.id === id) : undefined;

  const [name, setName] = useState(original?.name ?? '');
  const [notes, setNotes] = useState(original?.notes ?? '');
  const [days, setDays] = useState<PlanDay[]>(() => (original ? structuredClone(original.days) : emptyDays()));
  const [sel, setSel] = useState(() => {
    if (day != null) return day;
    const order = weekOrder(weekStart);
    if (!original) return order[0];
    const today = new Date().getDay();
    if (isTrainingDay(original.days[today])) return today;
    return order.find((wd) => isTrainingDay(original.days[wd])) ?? order[0];
  });
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<null | { mode: 'add' } | { mode: 'replace'; uid: string }>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const cur = days[sel];
  const training = isTrainingDay(cur);
  const suggestion = suggestDayName(cur.exercises, exMap);

  const updateDay = useCallback((wd: number, fn: (d: PlanDay) => PlanDay) => {
    setDirty(true);
    setDays((ds) => ds.map((d, i) => (i === wd ? fn(d) : d)));
  }, []);

  const onChange = useCallback(
    (u: string, fn: (we: WorkoutExercise) => WorkoutExercise) =>
      updateDay(sel, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.uid === u ? fn(e) : e)) })),
    [sel, updateDay],
  );

  const onAction = useCallback(
    (u: string, action: BlockAction) => {
      if (action === 'remove') updateDay(sel, (d) => ({ ...d, exercises: d.exercises.filter((e) => e.uid !== u) }));
      else if (action === 'up' || action === 'down')
        updateDay(sel, (d) => ({ ...d, exercises: moveItem(d.exercises, u, action === 'up' ? -1 : 1) }));
      else if (action === 'replace') setPicker({ mode: 'replace', uid: u });
    },
    [sel, updateDay],
  );

  const selectDay = (wd: number) => {
    setSel(wd);
    // 往下滚过当天标题时，切换后回到标题处
    const head = headRef.current;
    const strip = stripRef.current;
    if (head && strip && head.getBoundingClientRect().top < strip.getBoundingClientRect().bottom) {
      head.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };

  const dayMenu = async () => {
    const v = await actionSheet({
      title: WEEKDAYS[sel],
      actions: training
        ? [
            { label: '复制到其他天…', value: 'copyTo', icon: <Copy size={20} /> },
            { label: '清空，改为休息日', value: 'clear', destructive: true, icon: <Trash size={20} /> },
          ]
        : [{ label: '从其他天复制…', value: 'copyFrom', icon: <Copy size={20} /> }],
    });
    if (v === 'clear') {
      const ok = await confirmDialog({
        title: `把${WEEKDAYS[sel]}改为休息日？`,
        message: '这天安排的动作会被清空',
        confirmText: '清空',
        destructive: true,
      });
      if (ok) updateDay(sel, () => ({ exercises: [] }));
    } else if (v === 'copyTo') {
      const t = await actionSheet({
        title: `把${WEEKDAYS[sel]}的内容复制到`,
        actions: weekOrder(weekStart)
          .filter((wd) => wd !== sel)
          .map((wd) => ({
            label: `${WEEKDAYS[wd]}${isTrainingDay(days[wd]) ? `（替换：${dayName(days[wd], exMap)}）` : '（休息日）'}`,
            value: String(wd),
          })),
      });
      if (t == null) return;
      const to = Number(t);
      updateDay(to, () => ({ name: cur.name, exercises: toPlanExercises(cur.exercises) }));
      toast(`已复制到${WEEKDAYS[to]}`, { tone: 'success' });
    } else if (v === 'copyFrom') {
      const sources = weekOrder(weekStart).filter((wd) => wd !== sel && isTrainingDay(days[wd]));
      if (!sources.length) {
        toast('其他天也还没有安排动作');
        return;
      }
      const f = await actionSheet({
        title: `复制到${WEEKDAYS[sel]}`,
        actions: sources.map((wd) => ({ label: `${WEEKDAYS[wd]} · ${dayName(days[wd], exMap)}`, value: String(wd) })),
      });
      if (f == null) return;
      const from = days[Number(f)];
      updateDay(sel, () => ({ name: from.name, exercises: toPlanExercises(from.exercises) }));
    }
  };

  const back = async () => {
    if (dirty) {
      const ok = await confirmDialog({
        title: '放弃修改？',
        message: '还没有保存，离开后修改会丢失',
        confirmText: '放弃',
        destructive: true,
      });
      if (!ok) return;
    }
    nav.pop();
  };

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast('给计划起个名字吧', { tone: 'error' });
      return;
    }
    const cleaned: PlanDay[] = days.map((d) => {
      const exercises = d.exercises
        .filter((we) => we.sets.length > 0)
        .map((we) => ({ ...we, sets: we.sets.map((s) => ({ ...s, done: false, target: undefined })) }));
      if (!exercises.length) return { exercises: [] };
      return { name: d.name?.trim() || suggestDayName(exercises, exMap) || undefined, exercises };
    });
    const now = Date.now();
    if (original) {
      await db.templates.update(original.id!, { name: n, notes: notes.trim() || undefined, days: cleaned, updatedAt: now });
      toast('计划已保存', { tone: 'success' });
    } else {
      const newId = (await db.templates.add({
        name: n,
        notes: notes.trim() || undefined,
        days: cleaned,
        sort: plans.length,
        createdAt: now,
        updatedAt: now,
      })) as number;
      setSettings({ currentPlanId: newId });
      toast('计划已保存，首页会按它安排每天的训练', { tone: 'success' });
    }
    nav.pop();
  };

  const addExercises = (ids: number[]) =>
    updateDay(sel, (d) => ({
      ...d,
      exercises: [
        ...d.exercises,
        ...ids
          .filter((x) => exMap.has(x))
          .map((exerciseId) => ({
            uid: uid(),
            exerciseId,
            sets: Array.from({ length: exMap.get(exerciseId)!.type === 'distance_time' ? 1 : 3 }, emptySet),
          })),
      ],
    }));

  const trainingDays = days.filter(isTrainingDay).length;

  return (
    <Page
      title={original ? '编辑计划' : '新建计划'}
      back={back}
      noSwipe
      right={
        <button className="glass-btn primary" onClick={save}>
          保存
        </button>
      }
    >
      <div className="form-pad">
        <input
          className="title-input"
          value={name}
          maxLength={30}
          placeholder="计划名称，如：五分化训练"
          onChange={(e) => {
            setDirty(true);
            setName(e.target.value);
          }}
        />
        <textarea
          className="input"
          rows={2}
          value={notes}
          placeholder="备注（可选）：训练目标、注意事项…"
          onChange={(e) => {
            setDirty(true);
            setNotes(e.target.value);
          }}
        />
      </div>

      <div className="plan-week" ref={stripRef}>
        <WeekStrip days={days} weekStart={weekStart} selected={sel} onSelect={selectDay} />
        <div className="plan-week-hint">
          {trainingDays ? `每周练 ${trainingDays} 天` : '还没有安排训练日'} · 点星期切换，分别安排每天的动作
        </div>
      </div>

      <div className="day-head" ref={headRef}>
        <div className="day-head-title">
          {WEEKDAYS[sel]}
          <small>{training ? `${cur.exercises.length} 个动作` : '休息日'}</small>
        </div>
        <button className="icon-btn" aria-label="这一天的更多操作" onClick={dayMenu}>
          <Ellipsis size={22} />
        </button>
      </div>

      {training && (
        <div className="form-pad day-name-wrap">
          <input
            className="input"
            value={cur.name ?? ''}
            maxLength={20}
            placeholder={suggestion ? `这天练什么？不填就叫「${suggestion}」` : '这天练什么？如：胸 + 三头'}
            onChange={(e) => updateDay(sel, (d) => ({ ...d, name: e.target.value }))}
          />
        </div>
      )}

      {cur.exercises.map((we, i) => (
        <ExerciseBlock
          key={we.uid}
          mode="template"
          we={we}
          index={i}
          count={cur.exercises.length}
          onChange={onChange}
          onAction={onAction}
        />
      ))}

      {!training && (
        <Empty icon={<Coffee size={28} />} title={`${WEEKDAYS[sel]}休息`} text="给这天添加动作，它就会变成训练日" />
      )}

      <div className="form-pad">
        <button className="btn btn-tinted btn-block" onClick={() => setPicker({ mode: 'add' })}>
          <Plus size={20} strokeWidth={2.6} />
          给{WEEKDAYS[sel]}添加动作
        </button>
        {training && <div className="hint">每组填写的重量 / 次数会作为训练时的目标提示</div>}
        {original && (
          <button
            className="btn btn-danger btn-block"
            style={{ marginTop: 20 }}
            onClick={async () => {
              if (await deletePlan(original)) nav.pop();
            }}
          >
            <Trash size={18} />
            删除计划
          </button>
        )}
      </div>

      <ExercisePicker
        open={picker?.mode === 'add'}
        title={`${WEEKDAYS[sel]} · 添加动作`}
        onClose={() => setPicker(null)}
        onPick={addExercises}
      />
      <ExercisePicker
        open={picker?.mode === 'replace'}
        multi={false}
        title="替换动作"
        onClose={() => setPicker(null)}
        onPick={(ids) => {
          if (picker?.mode !== 'replace' || !ids[0]) return;
          const target = picker.uid;
          updateDay(sel, (d) => ({
            ...d,
            exercises: d.exercises.map((e) => (e.uid === target ? { ...e, exerciseId: ids[0] } : e)),
          }));
        }}
      />
    </Page>
  );
}
