import { useMemo, useState } from 'react';
import { ChevronRight, Eye, Plus } from 'lucide-react';
import { Page } from '../components/Page';
import { Empty, ExerciseAvatar, SearchBar } from '../components/Controls';
import { PartChips, filterExercises, matchExercise, type PartFilter } from '../components/ExercisePicker';
import { ExerciseFormSheet } from '../components/ExerciseForm';
import { useData } from '../data/DataProvider';
import { db } from '../db/db';
import { nav } from '../store/nav';
import { toast } from '../store/ui';
import { BODY_PARTS, EQUIPMENT_MAP } from '../data/meta';
import { fmtRelativeDay } from '../lib/date';
import type { Exercise } from '../types';

export function ExerciseLibrary() {
  const { exercises, index } = useData();
  const [q, setQ] = useState('');
  const [part, setPart] = useState<PartFilter>('all');
  const [creating, setCreating] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const list = useMemo(() => filterExercises(exercises, q, part, index), [exercises, q, part, index]);
  const hidden = exercises.filter((e) => e.hidden && matchExercise(e, q));
  const grouped = part === 'all' && !q.trim();

  const row = (e: Exercise) => {
    const sessions = index.byExercise.get(e.id!);
    return (
      <button key={e.id} className="row" onClick={() => nav.push({ name: 'exerciseDetail', id: e.id! })}>
        <ExerciseAvatar ex={e} />
        <div className="row-main">
          <div className="row-title">{e.name}</div>
          <div className="row-sub">
            {EQUIPMENT_MAP[e.equipment]}
            {sessions ? ` · 练过 ${sessions.length} 次 · ${fmtRelativeDay(sessions[0].date)}` : ''}
            {e.custom && ' · 自定义'}
          </div>
        </div>
        <ChevronRight size={18} className="chev" />
      </button>
    );
  };

  return (
    <Page
      title="动作库"
      large
      subtitle={`共 ${exercises.filter((e) => !e.hidden).length} 个动作`}
      right={
        <button className="glass-btn round" aria-label="新建动作" onClick={() => setCreating(true)}>
          <Plus size={22} strokeWidth={2.4} />
        </button>
      }
    >
      <SearchBar value={q} onChange={setQ} />
      <PartChips value={part} onChange={setPart} withRecent />

      {grouped
        ? BODY_PARTS.map((b) => {
            const items = list.filter((e) => e.bodyPart === b.id);
            if (!items.length) return null;
            return (
              <div key={b.id}>
                <div className="group-label">
                  {b.label} · {items.length}
                </div>
                <div className="list" style={{ ['--sep-inset' as string]: '70px' }}>
                  {items.map(row)}
                </div>
              </div>
            );
          })
        : list.length > 0 && (
            <div className="list" style={{ ['--sep-inset' as string]: '70px' }}>
              {list.map(row)}
            </div>
          )}

      {!list.length && (
        <Empty
          title={part === 'recent' ? '还没有练过的动作' : '没有找到相关动作'}
          text="找不到想要的？可以自己创建"
          action={
            <button className="btn btn-tinted btn-md" onClick={() => setCreating(true)}>
              <Plus size={18} />
              创建动作{q.trim() && `「${q.trim()}」`}
            </button>
          }
        />
      )}

      {hidden.length > 0 && (
        <>
          <button className="group-label link-label" onClick={() => setShowHidden((s) => !s)}>
            已隐藏的动作 · {hidden.length}（{showHidden ? '收起' : '展开'}）
          </button>
          {showHidden && (
            <div className="list" style={{ ['--sep-inset' as string]: '70px' }}>
              {hidden.map((e) => (
                <div className="row" key={e.id}>
                  <ExerciseAvatar ex={e} />
                  <div className="row-main">
                    <div className="row-title muted">{e.name}</div>
                  </div>
                  <button
                    className="btn btn-sm btn-tinted"
                    onClick={async () => {
                      await db.exercises.update(e.id!, { hidden: false });
                      toast('已恢复显示');
                    }}
                  >
                    <Eye size={16} />
                    恢复
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ExerciseFormSheet
        open={creating}
        initialName={q.trim()}
        initialPart={part !== 'all' && part !== 'recent' ? part : undefined}
        onClose={() => setCreating(false)}
        onSaved={(id) => nav.push({ name: 'exerciseDetail', id })}
      />
    </Page>
  );
}
