import { useState } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cx } from '../lib/cx';
import { dismissToast, useUI, type DialogReq } from '../store/ui';

export function DialogHost() {
  const dialogs = useUI((s) => s.dialogs);
  const close = useUI((s) => s.closeDialog);
  const d = dialogs[dialogs.length - 1];
  if (!d) return null;
  if (d.kind === 'actions') {
    return (
      <ActionSheetView
        key={d.id}
        d={d}
        onDone={(v) => {
          close(d.id);
          d.resolve(v);
        }}
      />
    );
  }
  return (
    <AlertView
      key={d.id}
      d={d}
      onDone={(v) => {
        close(d.id);
        if (d.kind === 'confirm') d.resolve(v === true);
        else d.resolve(typeof v === 'string' ? v : null);
      }}
    />
  );
}

function ActionSheetView({
  d,
  onDone,
}: {
  d: Extract<DialogReq, { kind: 'actions' }>;
  onDone: (v: string | null) => void;
}) {
  const [closing, setClosing] = useState(false);
  const finish = (v: string | null) => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => onDone(v), 200);
  };
  return (
    <>
      <div className={cx('dialog-backdrop', closing && 'closing')} onClick={() => finish(null)} />
      <div className={cx('action-sheet', closing && 'closing')}>
        <div className="as-group">
          {(d.title || d.message) && (
            <div className="as-head">
              {d.title && <div className="as-title">{d.title}</div>}
              {d.message && <div className="as-msg">{d.message}</div>}
            </div>
          )}
          {d.actions.map((a) => (
            <button
              key={a.value}
              className={cx('as-btn', a.destructive && 'destructive')}
              onClick={() => finish(a.value)}
            >
              {a.icon}
              <span className="ellipsis">{a.label}</span>
            </button>
          ))}
        </div>
        <button className="as-cancel" onClick={() => finish(null)}>
          取消
        </button>
      </div>
    </>
  );
}

function AlertView({
  d,
  onDone,
}: {
  d: Exclude<DialogReq, { kind: 'actions' }>;
  onDone: (v: boolean | string | null) => void;
}) {
  const [text, setText] = useState(d.kind === 'prompt' ? d.defaultValue ?? '' : '');
  const isPrompt = d.kind === 'prompt';
  const alertOnly = d.kind === 'confirm' && d.alertOnly;
  const destructive = d.kind === 'confirm' && d.destructive;
  const confirmText = d.kind === 'confirm' ? d.confirmText ?? '确定' : '确定';
  const cancelText = d.kind === 'confirm' ? d.cancelText ?? '取消' : '取消';

  const ok = () => onDone(isPrompt ? text : true);
  const cancel = () => onDone(isPrompt ? null : false);

  return (
    <>
      <div className="dialog-backdrop" onClick={alertOnly ? ok : cancel} />
      <div className="alert-wrap">
        <div className="alert" role="alertdialog">
          <div className="alert-title">{d.title}</div>
          {d.message && <div className="alert-msg">{d.message}</div>}
          {isPrompt && (
            <input
              className="input"
              autoFocus
              value={text}
              placeholder={d.placeholder}
              inputMode={d.inputMode ?? 'text'}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') ok();
              }}
            />
          )}
          <div className="alert-actions">
            {!alertOnly && (
              <button className="btn" onClick={cancel}>
                {cancelText}
              </button>
            )}
            <button className={cx('btn', destructive ? 'btn-danger' : 'btn-primary')} onClick={ok}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function ToastHost() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className={cx('toast', t.tone)} onClick={() => dismissToast(t.id)}>
          {t.tone === 'success' ? (
            <CircleCheck size={20} />
          ) : t.tone === 'error' ? (
            <CircleAlert size={20} />
          ) : (
            <Info size={20} style={{ opacity: 0.7 }} />
          )}
          <span>{t.text}</span>
          {t.action && (
            <button
              className="toast-action"
              onClick={(e) => {
                e.stopPropagation();
                t.action!.onClick();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
