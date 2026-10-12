import { useEffect, useMemo, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useData } from '../data/DataProvider';
import { BODY_PARTS, BODY_PART_MAP, EQUIPMENT_MAP } from '../data/meta';
import { cx } from '../lib/cx';
import { haptic } from '../lib/device';
import type { BodyPart, Exercise } from '../types';
import type { HistoryIndex } from '../lib/stats';
import { ExerciseAvatar, SearchBar } from './Controls';
import { Sheet } from './Sheet';
import { ExerciseFormSheet } from './ExerciseForm';

export type PartFilter = BodyPart | 'all' | 'recent';

export function matchExercise(e: Exercise, q: string): boolean {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    e.name.toLowerCase().includes(s) ||
    BODY_PART_MAP[e.bodyPart]?.label.includes(s) ||
    EQUIPMENT_MAP[e.equipment]?.includes(s)
  );
}

export function filterExercises(list: Exercise[], q: string, part: PartFilter, index: HistoryIndex): Exercise[] {
  let out = list.filter((e) => !e.hidden && matchExercise(e, q));
  if (part === 'recent') {
    out = out
      .filter((e) => index.byExercise.has(e.id!))
      .sort((a, b) => index.byExercise.get(b.id!)![0].date - index.byExercise.get(a.id!)![0].date);
  } else if (part !== 'all') {
    out = out.filter((e) => e.bodyPart === part);
  }
  return out;
}

export function PartChips({ value, onChange, withRecent }: { value: PartFilter; onChange: (v: PartFilter) => void; withRecent?: boolean }) {
  const items: { id: PartFilter; label: string; color?: string }[] = [
    { id: 'all', label: '全部' },
    ...(withRecent ? [{ id: 'recent' as const, label: '最近练过' }] : []),
    ...BODY_PARTS.map((b) => ({ id: b.id, label: b.label, color: b.color })),
  ];
  return (
    <div className="chips">
      {items.map((it) => (
        <button
          key={it.id}
          className={cx('chip', value === it.id && 'active')}
          onClick={() => {
            haptic();
            onChange(it.id);
          }}
        >
          {it.color && <span className="chip-dot" style={{ background: it.color }} />}
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
  multi = true,
  title = '添加动作',
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ids: number[]) => void;
  multi?: boolean;
  title?: string;
}) {
  const { exercises, index } = useData();
  const [q, setQ] = useState('');
  const [part, setPart] = useState<PartFilter>('all');
  const [sel, setSel] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setSel([]);
      setQ('');
    }
  }, [open]);

  const list = useMemo(() => filterExercises(exercises, q, part, index), [exercises, q, part, index]);
  const grouped = part === 'all' && !q.trim();

  const choose = (id: number) => {
    haptic();
    if (!multi) {
      onPick([id]);
      onClose();
      return;
    }
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const renderRow = (e: Exercise) => {
    const i = sel.indexOf(e.id!);
    const sessions = index.byExercise.get(e.id!)?.length ?? 0;
    return (
      <button key={e.id} className={cx('row pick-row', i >= 0 && 'picked')} onClick={() => choose(e.id!)}>
        <ExerciseAvatar ex={e} />
        <div className="row-main">
          <div className="row-title">{e.name}</div>
          <div className="row-sub">
            {EQUIPMENT_MAP[e.equipment]}
            {sessions > 0 && ` · 练过 ${sessions} 次`}
            {e.custom && ' · 自定义'}
          </div>
        </div>
        {multi ? (
          <span className={cx('pick-mark num', i >= 0 && 'on')}>{i >= 0 ? i + 1 : ''}</span>
        ) : (
          <Check size={20} className="faint" />
        )}
      </button>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={title}
      left={
        <button className="text-btn" onClick={onClose}>
          取消
        </button>
      }
      right={
        multi ? (
          <button
            className="glass-btn primary"
            disabled={!sel.length}
            onClick={() => {
              onPick(sel);
              onClose();
            }}
          >
            添加{sel.length ? ` ${sel.length}` : ''}
          </button>
        ) : null
      }
    >
      <div className="picker-top">
        <SearchBar value={q} onChange={setQ} />
        <PartChips value={part} onChange={setPart} withRecent />
      </div>

      {grouped ? (
        BODY_PARTS.map((b) => {
          const items = list.filter((e) => e.bodyPart === b.id);
          if (!items.length) return null;
          return (
            <div key={b.id}>
              <div className="group-label">{b.label}</div>
              <div className="list" style={{ ['--sep-inset' as string]: '70px' }}>
                {items.map(renderRow)}
              </div>
            </div>
          );
        })
      ) : list.length ? (
        <div className="list" style={{ ['--sep-inset' as string]: '70px' }}>
          {list.map(renderRow)}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-title">{part === 'recent' ? '还没有练过的动作' : '没有找到相关动作'}</div>
          <div className="empty-text">可以创建一个自定义动作</div>
        </div>
      )}

      <div className="sheet-pad">
        <button className="btn btn-tinted btn-block" onClick={() => setCreating(true)}>
          <Plus size={20} />
          创建自定义动作{q.trim() ? `「${q.trim()}」` : ''}
        </button>
      </div>

      <ExerciseFormSheet
        open={creating}
        initialName={q.trim()}
        initialPart={part !== 'all' && part !== 'recent' ? part : undefined}
        onClose={() => setCreating(false)}
        onSaved={(id) => {
          if (multi) setSel((s) => [...s, id]);
          else {
            onPick([id]);
            onClose();
          }
        }}
      />
    </Sheet>
  );
}
