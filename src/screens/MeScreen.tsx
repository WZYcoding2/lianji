import { useRef, type ReactNode } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  Info,
  Moon,
  Palette,
  Ruler,
  Scale,
  ShieldCheck,
  Smartphone,
  Sun,
  Timer,
  Trash,
  Upload,
  Weight,
  Zap,
} from 'lucide-react';
import { Page } from '../components/Page';
import { Segmented, Switch } from '../components/Controls';
import { useData } from '../data/DataProvider';
import { useSettings, type ThemeMode } from '../store/settings';
import { nav } from '../store/nav';
import { actionSheet, alertDialog, confirmDialog, promptDialog, toast } from '../store/ui';
import { buildBackup, buildCsv, parseBackup, restoreBackup, shareFile, wipeAll } from '../db/backup';
import { ACCENTS, REST_OPTIONS } from '../data/meta';
import { cx } from '../lib/cx';
import { dayKey, fmtFullDate, fmtRelativeDay, DAY_MS, startOfDay } from '../lib/date';
import { fmtHours, fmtNum, fmtRest, fmtVolume, fmtW } from '../lib/format';
import { workoutDuration, workoutVolume } from '../lib/stats';
import { haptic } from '../lib/device';

function RowIcon({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="row-icon" style={{ background: color }}>
      {children}
    </span>
  );
}

export function MeScreen() {
  const { workouts, exMap, bodyRecords } = useData();
  const s = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const totalSecs = workouts.reduce((n, w) => n + workoutDuration(w), 0);
  const totalVol = fmtVolume(
    workouts.reduce((n, w) => n + workoutVolume(w, exMap), 0),
    s.unit,
  );
  const first = workouts.length ? workouts[workouts.length - 1].startedAt : null;
  const days = first ? Math.floor((startOfDay(Date.now()) - startOfDay(first)) / DAY_MS) + 1 : 0;
  const trainDays = new Set(workouts.map((w) => dayKey(w.startedAt))).size;
  const latestWeight = bodyRecords.find((r) => r.weight != null);
  const prevWeight = latestWeight ? bodyRecords.find((r) => r.weight != null && r.date < latestWeight.date) : undefined;
  const wDelta = latestWeight && prevWeight ? latestWeight.weight! - prevWeight.weight! : null;

  const exportBackup = async () => {
    const b = await buildBackup();
    const name = `练迹备份-${dayKey(Date.now())}.json`;
    const ok = await shareFile(JSON.stringify(b), name, 'application/json');
    if (!ok) {
      const again = await confirmDialog({ title: '备份文件已生成', message: '点击「保存」选择存到"文件"或发送到微信', confirmText: '保存' });
      if (again) await shareFile(JSON.stringify(b), name, 'application/json');
    }
    s.set({ lastBackupAt: Date.now() });
  };

  const exportCsv = async () => {
    const csv = await buildCsv();
    const name = `练迹训练记录-${dayKey(Date.now())}.csv`;
    const ok = await shareFile(csv, name, 'text/csv');
    if (!ok) {
      const again = await confirmDialog({ title: '表格已生成', confirmText: '保存' });
      if (again) await shareFile(csv, name, 'text/csv');
    }
  };

  const onImport = async (file: File) => {
    try {
      const b = parseBackup(await file.text());
      const ok = await confirmDialog({
        title: '恢复这个备份？',
        message: `备份时间：${fmtFullDate(new Date(b.exportedAt).getTime())}\n包含 ${b.data.workouts.length} 次训练、${b.data.templates.length} 个计划。\n\n当前 App 里的数据会被替换。`,
        confirmText: '恢复',
        destructive: true,
      });
      if (!ok) return;
      await restoreBackup(b);
      toast('数据已恢复', { tone: 'success' });
    } catch (e) {
      await alertDialog('导入失败', (e as Error).message);
    }
  };

  const wipe = async () => {
    const ok = await confirmDialog({
      title: '清除所有数据？',
      message: '训练记录、计划、身体数据都会被删除且无法恢复。建议先导出备份。',
      confirmText: '全部清除',
      destructive: true,
    });
    if (!ok) return;
    const again = await confirmDialog({ title: '真的确定吗？', message: '此操作不可撤销', confirmText: '确定清除', destructive: true });
    if (!again) return;
    await wipeAll();
    location.reload();
  };

  const pickRest = async () => {
    const v = await actionSheet({
      title: '默认组间休息时间',
      actions: REST_OPTIONS.map((x) => ({ label: fmtRest(x) + (x === s.defaultRest ? '  ✓' : ''), value: String(x) })),
    });
    if (v) s.set({ defaultRest: Number(v) });
  };

  const pickWeekStart = async () => {
    const v = await actionSheet({
      title: '每周从哪天开始',
      actions: [
        { label: '周一' + (s.weekStart === 1 ? '  ✓' : ''), value: '1' },
        { label: '周日' + (s.weekStart === 0 ? '  ✓' : ''), value: '0' },
      ],
    });
    if (v) s.set({ weekStart: v === '1' ? 1 : 0 });
  };

  const editHeight = async () => {
    const v = await promptDialog({
      title: '身高（cm）',
      message: '用于计算 BMI',
      defaultValue: s.height ? String(s.height) : '',
      inputMode: 'decimal',
      placeholder: '例如 175',
    });
    if (v == null) return;
    const n = Number(v);
    if (v.trim() === '') s.set({ height: undefined });
    else if (n > 50 && n < 260) s.set({ height: n });
    else toast('请输入正确的身高', { tone: 'error' });
  };

  const editName = async () => {
    const v = await promptDialog({ title: '你的昵称', defaultValue: s.nickname, placeholder: '健身达人' });
    if (v != null) s.set({ nickname: v.trim().slice(0, 16) });
  };

  const backupHint = s.lastBackupAt ? `上次备份：${fmtRelativeDay(s.lastBackupAt)}` : '还没有备份过';

  return (
    <Page title="我的" large>
      <button className="card card-pressable profile-card" onClick={editName}>
        <div className="avatar">{(s.nickname || '练').slice(0, 1)}</div>
        <div className="row-main">
          <div className="profile-name">{s.nickname || '点击设置昵称'}</div>
          <div className="profile-sub">
            {first ? `从 ${fmtFullDate(first)} 开始，已经 ${days} 天` : '开始你的第一次训练吧'}
          </div>
        </div>
      </button>

      <div className="stat-grid three">
        <div className="stat">
          <div className="stat-label">累计训练</div>
          <div className="stat-value">
            <span className="num">{workouts.length}</span>
            <small>次</small>
          </div>
          <div className="stat-foot">{trainDays} 天</div>
        </div>
        <div className="stat">
          <div className="stat-label">累计时长</div>
          <div className="stat-value">
            <span className="num">{fmtHours(totalSecs)}</span>
            <small>小时</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">累计容量</div>
          <div className="stat-value">
            <span className="num">{totalVol.value}</span>
            <small>{totalVol.unit}</small>
          </div>
        </div>
      </div>

      <div className="list" style={{ ['--sep-inset' as string]: '58px' }}>
        <button className="row" onClick={() => nav.push({ name: 'bodyData' })}>
          <RowIcon color="#30C85E">
            <Scale size={18} />
          </RowIcon>
          <div className="row-main">
            <div className="row-title">身体数据</div>
            <div className="row-sub">体重、体脂、围度</div>
          </div>
          <span className="row-value">
            {latestWeight ? (
              <>
                <span className="num">
                  {fmtW(latestWeight.weight, s.unit)} {s.unit}
                </span>
                {wDelta != null && Math.abs(wDelta) > 0.001 && (
                  <span className="delta">
                    {wDelta > 0 ? '+' : '−'}
                    {fmtW(Math.abs(wDelta), s.unit)}
                  </span>
                )}
              </>
            ) : (
              '去记录'
            )}
          </span>
          <ChevronRight size={18} className="chev" />
        </button>
      </div>

      <div className="group-label">训练设置</div>
      <div className="list" style={{ ['--sep-inset' as string]: '58px' }}>
        <div className="row">
          <RowIcon color="#3A86FF">
            <Weight size={18} />
          </RowIcon>
          <div className="row-main row-title">重量单位</div>
          <Segmented
            small
            value={s.unit}
            onChange={(v) => s.set({ unit: v })}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
        </div>
        <button className="row" onClick={pickRest}>
          <RowIcon color="#FF8A00">
            <Timer size={18} />
          </RowIcon>
          <div className="row-main row-title">默认休息时间</div>
          <span className="row-value">{fmtRest(s.defaultRest)}</span>
          <ChevronRight size={18} className="chev" />
        </button>
        <div className="row">
          <RowIcon color="#7B61FF">
            <Zap size={18} />
          </RowIcon>
          <div className="row-main">
            <div className="row-title">完成一组后自动计时</div>
          </div>
          <Switch on={s.autoRest} onChange={(v) => s.set({ autoRest: v })} />
        </div>
        <div className="row">
          <RowIcon color="#FF5A5F">
            <Bell size={18} />
          </RowIcon>
          <div className="row-main">
            <div className="row-title">休息结束提示音</div>
            <div className="row-sub">手机静音时不会响</div>
          </div>
          <Switch on={s.sound} onChange={(v) => s.set({ sound: v })} />
        </div>
        <div className="row">
          <RowIcon color="#00A8CC">
            <Smartphone size={18} />
          </RowIcon>
          <div className="row-main">
            <div className="row-title">训练时屏幕常亮</div>
          </div>
          <Switch on={s.keepAwake} onChange={(v) => s.set({ keepAwake: v })} />
        </div>
        <button className="row" onClick={pickWeekStart}>
          <RowIcon color="#13B987">
            <CalendarDays size={18} />
          </RowIcon>
          <div className="row-main row-title">每周第一天</div>
          <span className="row-value">{s.weekStart === 1 ? '周一' : '周日'}</span>
          <ChevronRight size={18} className="chev" />
        </button>
        <button className="row" onClick={editHeight}>
          <RowIcon color="#A55EEA">
            <Ruler size={18} />
          </RowIcon>
          <div className="row-main row-title">身高</div>
          <span className="row-value">{s.height ? `${fmtNum(s.height)} cm` : '未设置'}</span>
          <ChevronRight size={18} className="chev" />
        </button>
      </div>

      <div className="group-label">外观</div>
      <div className="list" style={{ ['--sep-inset' as string]: '58px' }}>
        <div className="row">
          <RowIcon color="#636366">{s.theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}</RowIcon>
          <div className="row-main row-title">主题</div>
          <Segmented<ThemeMode>
            small
            value={s.theme}
            onChange={(v) => s.set({ theme: v })}
            options={[
              { value: 'system', label: '自动' },
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
            ]}
          />
        </div>
        <div className="row">
          <RowIcon color="var(--accent)">
            <Palette size={18} />
          </RowIcon>
          <div className="row-main row-title">主题色</div>
          <div className="swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                className={cx('swatch', s.accent === a.id && 'on')}
                style={{ background: a.color }}
                aria-label={a.label}
                onClick={() => {
                  haptic();
                  s.set({ accent: a.id });
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="group-foot">「自动」会跟随手机的深色模式设置，状态栏颜色也会保持一致</div>

      <div className="group-label">数据</div>
      <div className="list" style={{ ['--sep-inset' as string]: '58px' }}>
        <button className="row" onClick={exportBackup}>
          <RowIcon color="#30C85E">
            <Download size={18} />
          </RowIcon>
          <div className="row-main">
            <div className="row-title">导出备份</div>
            <div className="row-sub">{backupHint}</div>
          </div>
          <ChevronRight size={18} className="chev" />
        </button>
        <button className="row" onClick={() => fileRef.current?.click()}>
          <RowIcon color="#3A86FF">
            <Upload size={18} />
          </RowIcon>
          <div className="row-main">
            <div className="row-title">从备份恢复</div>
            <div className="row-sub">选择之前导出的 .json 文件</div>
          </div>
          <ChevronRight size={18} className="chev" />
        </button>
        <button className="row" onClick={exportCsv}>
          <RowIcon color="#13B987">
            <FileSpreadsheet size={18} />
          </RowIcon>
          <div className="row-main">
            <div className="row-title">导出 Excel 表格（CSV）</div>
          </div>
          <ChevronRight size={18} className="chev" />
        </button>
        <button className="row" onClick={wipe}>
          <RowIcon color="#FF3B30">
            <Trash size={18} />
          </RowIcon>
          <div className="row-main row-title danger">清除所有数据</div>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void onImport(f);
        }}
      />
      <div className="group-foot">
        <ShieldCheck size={13} className="inline-icon" /> 所有数据只保存在这台手机上，不会上传到任何服务器。换手机或删除 App
        前请先导出备份。
      </div>

      <div className="group-label">关于</div>
      <div className="list" style={{ ['--sep-inset' as string]: '58px' }}>
        <button className="row" onClick={() => nav.push({ name: 'installGuide' })}>
          <RowIcon color="#FF6B2C">
            <Smartphone size={18} />
          </RowIcon>
          <div className="row-main row-title">如何添加到主屏幕</div>
          <ChevronRight size={18} className="chev" />
        </button>
        <div className="row">
          <RowIcon color="#8E8E93">
            <Info size={18} />
          </RowIcon>
          <div className="row-main row-title">版本</div>
          <span className="row-value">练迹 1.0 · 永久免费</span>
        </div>
        <div className="row">
          <RowIcon color="#8E8E93">
            <Database size={18} />
          </RowIcon>
          <div className="row-main row-title">内置动作</div>
          <span className="row-value">{[...exMap.values()].filter((e) => !e.custom).length} 个</span>
        </div>
      </div>
    </Page>
  );
}
