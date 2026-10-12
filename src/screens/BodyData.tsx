import { useEffect, useMemo, useState } from 'react';
import { Plus, Scale } from 'lucide-react';
import { Page } from '../components/Page';
import { Sheet } from '../components/Sheet';
import { Empty, NumInput, Segmented, SwipeRow } from '../components/Controls';
import { LineChart } from '../components/Charts';
import { useData } from '../data/DataProvider';
import { db } from '../db/db';
import { useSettings } from '../store/settings';
import { confirmDialog, toast } from '../store/ui';
import { cx } from '../lib/cx';
import { dayKey, DAY_MS, fmtMonthDay, fmtSmartDate, parseDayKey } from '../lib/date';
import { displayToKg, fmtNum, kgToDisplay, round, type Unit } from '../lib/format';
import type { BodyRecord } from '../types';

type MetricKey = 'weight' | 'bodyFat' | 'bmi' | 'waist' | 'chest' | 'hips' | 'arm' | 'thigh' | 'calf';
type FieldKey = Exclude<MetricKey, 'bmi'>;

const FIELDS: { key: FieldKey; label: string; unit: string }[] = [
  { key: 'weight', label: '体重', unit: 'kg' },
  { key: 'bodyFat', label: '体脂率', unit: '%' },
  { key: 'waist', label: '腰围', unit: 'cm' },
  { key: 'chest', label: '胸围', unit: 'cm' },
  { key: 'hips', label: '臀围', unit: 'cm' },
  { key: 'arm', label: '臂围', unit: 'cm' },
  { key: 'thigh', label: '大腿围', unit: 'cm' },
  { key: 'calf', label: '小腿围', unit: 'cm' },
];

function metricValue(r: BodyRecord, m: MetricKey, height?: number): number | undefined {
  if (m === 'bmi') return r.weight && height ? r.weight / (height / 100) ** 2 : undefined;
  return r[m];
}

function display(v: number, m: MetricKey, unit: Unit): number {
  return m === 'weight' ? kgToDisplay(v, unit) : v;
}

function bmiLevel(b: number): string {
  if (b < 18.5) return '偏瘦';
  if (b < 24) return '正常';
  if (b < 28) return '超重';
  return '肥胖';
}

export function BodyData() {
  const { bodyRecords } = useData();
  const unit = useSettings((s) => s.unit);
  const height = useSettings((s) => s.height);
  const [metric, setMetric] = useState<MetricKey>('weight');
  const [range, setRange] = useState<30 | 90 | 365 | 0>(90);
  const [editing, setEditing] = useState<BodyRecord | 'new' | null>(null);

  const metrics = [
    ...FIELDS.slice(0, 2).map((f) => ({ key: f.key as MetricKey, label: f.label })),
    ...(height ? [{ key: 'bmi' as MetricKey, label: 'BMI' }] : []),
    ...FIELDS.slice(2).map((f) => ({ key: f.key as MetricKey, label: f.label })),
  ];
  const mUnit = metric === 'weight' ? unit : metric === 'bmi' ? '' : FIELDS.find((f) => f.key === metric)!.unit;

  const series = useMemo(
    () =>
      bodyRecords
        .map((r) => ({ r, v: metricValue(r, metric, height) }))
        .filter((x): x is { r: BodyRecord; v: number } => x.v != null && x.v > 0)
        .sort((a, b) => (a.r.date < b.r.date ? -1 : 1)),
    [bodyRecords, metric, height],
  );

  const from = range ? Date.now() - range * DAY_MS : 0;
  const points = series
    .map((x) => ({ x: parseDayKey(x.r.date), y: display(x.v, metric, unit) }))
    .filter((p) => p.x >= from);
  const latest = series[series.length - 1];
  const prev = series[series.length - 2];
  const first = series[0];
  const fmtV = (v: number) => fmtNum(display(v, metric, unit), metric === 'bmi' ? 1 : 1);
  const diff = (a?: { v: number }, b?: { v: number }) => (a && b ? display(a.v, metric, unit) - display(b.v, metric, unit) : null);
  const d1 = diff(latest, prev);
  const d2 = diff(latest, first);

  const remove = async (r: BodyRecord) => {
    const ok = await confirmDialog({ title: `删除 ${fmtSmartDate(parseDayKey(r.date))} 的记录？`, confirmText: '删除', destructive: true });
    if (ok) await db.bodyRecords.delete(r.id!);
  };

  return (
    <Page
      title="身体数据"
      back
      right={
        <button className="glass-btn round" aria-label="记录" onClick={() => setEditing('new')}>
          <Plus size={22} strokeWidth={2.4} />
        </button>
      }
    >
      <div className="chips">
        {metrics.map((m) => (
          <button key={m.key} className={cx('chip', metric === m.key && 'active')} onClick={() => setMetric(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      {!bodyRecords.length ? (
        <Empty
          icon={<Scale size={28} />}
          title="记录你的身体变化"
          text="定期记录体重、体脂和围度，看到自己的进步"
          action={
            <button className="btn btn-primary btn-md" onClick={() => setEditing('new')}>
              <Plus size={18} />
              添加第一条记录
            </button>
          }
        />
      ) : (
        <>
          <div className="card body-hero">
            <div className="body-label">{metrics.find((m) => m.key === metric)?.label}</div>
            {latest ? (
              <>
                <div className="body-value">
                  <span className="num">{fmtV(latest.v)}</span>
                  <small>{mUnit}</small>
                  {metric === 'bmi' && <span className="tag">{bmiLevel(latest.v)}</span>}
                </div>
                <div className="body-deltas">
                  <span>{fmtSmartDate(parseDayKey(latest.r.date))}</span>
                  {d1 != null && (
                    <span>
                      较上次 <b>{d1 > 0 ? '+' : d1 < 0 ? '−' : ''}{fmtNum(Math.abs(d1), 1)}</b>
                    </span>
                  )}
                  {d2 != null && series.length > 2 && (
                    <span>
                      累计 <b>{d2 > 0 ? '+' : d2 < 0 ? '−' : ''}{fmtNum(Math.abs(d2), 1)}</b>
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="muted" style={{ padding: '8px 0' }}>
                还没有记录这项数据
              </div>
            )}
            <Segmented
              small
              className="chart-seg"
              value={range}
              onChange={setRange}
              options={[
                { value: 30, label: '30天' },
                { value: 90, label: '90天' },
                { value: 365, label: '1年' },
                { value: 0, label: '全部' },
              ]}
            />
            <LineChart points={points} formatY={(v) => fmtNum(v, 1)} formatX={fmtMonthDay} color="#30C85E" />
          </div>

          <div className="group-label">全部记录</div>
          <div className="list">
            {bodyRecords.map((r) => (
              <div className="row-wrap" key={r.id}>
                <SwipeRow onDelete={() => void remove(r)}>
                  <button className="row body-row" onClick={() => setEditing(r)}>
                    <div className="row-main">
                      <div className="row-title">{fmtSmartDate(parseDayKey(r.date))}</div>
                      <div className="row-sub">
                        {FIELDS.filter((f) => r[f.key] != null)
                          .map((f) => `${f.label} ${fmtNum(display(r[f.key]!, f.key, unit), 1)}${f.key === 'weight' ? unit : f.unit}`)
                          .join(' · ')}
                        {r.note ? ` · ${r.note}` : ''}
                      </div>
                    </div>
                  </button>
                </SwipeRow>
              </div>
            ))}
          </div>
          <div className="group-foot">左滑记录可以删除</div>
        </>
      )}

      <BodyRecordSheet editing={editing} onClose={() => setEditing(null)} />
    </Page>
  );
}

function BodyRecordSheet({ editing, onClose }: { editing: BodyRecord | 'new' | null; onClose: () => void }) {
  const { bodyRecords } = useData();
  const unit = useSettings((s) => s.unit);
  const [date, setDate] = useState(dayKey(Date.now()));
  const [vals, setVals] = useState<Partial<Record<FieldKey, number>>>({});
  const [note, setNote] = useState('');
  const lastOf = (k: FieldKey) => bodyRecords.find((r) => r[k] != null)?.[k];

  useEffect(() => {
    if (!editing) return;
    if (editing === 'new') {
      setDate(dayKey(Date.now()));
      setVals({});
      setNote('');
    } else {
      setDate(editing.date);
      const v: Partial<Record<FieldKey, number>> = {};
      for (const f of FIELDS) if (editing[f.key] != null) v[f.key] = editing[f.key];
      setVals(v);
      setNote(editing.note ?? '');
    }
  }, [editing]);

  const save = async () => {
    if (!Object.values(vals).some((v) => v != null && v > 0)) {
      toast('至少填写一项数据', { tone: 'error' });
      return;
    }
    const data: Partial<BodyRecord> = { date, note: note.trim() || undefined };
    for (const f of FIELDS) data[f.key] = vals[f.key] && vals[f.key]! > 0 ? vals[f.key] : undefined;
    if (editing && editing !== 'new') {
      await db.bodyRecords.update(editing.id!, data);
    } else {
      const same = bodyRecords.find((r) => r.date === date);
      if (same) {
        const merged: Partial<BodyRecord> = { ...data };
        for (const f of FIELDS) if (merged[f.key] == null && same[f.key] != null) merged[f.key] = same[f.key];
        await db.bodyRecords.update(same.id!, merged);
      } else {
        await db.bodyRecords.add({ ...(data as BodyRecord), createdAt: Date.now() });
      }
    }
    toast('已保存', { tone: 'success' });
    onClose();
  };

  return (
    <Sheet
      open={!!editing}
      onClose={onClose}
      full
      title={editing === 'new' ? '记录身体数据' : '编辑记录'}
      left={
        <button className="text-btn" onClick={onClose}>
          取消
        </button>
      }
      right={
        <button className="glass-btn primary" onClick={save}>
          保存
        </button>
      }
    >
      <div className="sheet-pad">
        <div className="field">
          <label className="field-label">日期</label>
          <input
            className="input"
            type="date"
            value={date}
            max={dayKey(Date.now())}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </div>
        <div className="body-form">
          {FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label className="field-label">
                {f.label}（{f.key === 'weight' ? unit : f.unit}）
              </label>
              <NumInput
                className="input num"
                value={
                  vals[f.key] == null
                    ? undefined
                    : f.key === 'weight'
                      ? round(kgToDisplay(vals[f.key]!, unit), 2)
                      : vals[f.key]
                }
                placeholder={(() => {
                  const last = lastOf(f.key);
                  if (last == null) return '—';
                  return `上次 ${fmtNum(f.key === 'weight' ? kgToDisplay(last, unit) : last, 1)}`;
                })()}
                onChange={(v) =>
                  setVals((s) => ({
                    ...s,
                    [f.key]: v == null ? undefined : f.key === 'weight' ? displayToKg(v, unit) : v,
                  }))
                }
              />
            </div>
          ))}
        </div>
        <div className="field">
          <label className="field-label">备注</label>
          <input className="input" value={note} placeholder="例如：早上空腹" onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Sheet>
  );
}
