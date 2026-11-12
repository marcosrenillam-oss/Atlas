import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}
export interface MenuAction {
  label: string;
  danger?: boolean;
  onSelect: () => void;
}
interface ToastItem {
  id: number;
  text: string;
  kind: 'info' | 'error';
  action?: { label: string; onClick: () => void };
}
interface UI {
  toast: (text: string, opts?: { kind?: 'info' | 'error'; action?: ToastItem['action']; ms?: number }) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  menu: (title: string | undefined, actions: MenuAction[]) => void;
}

const Ctx = createContext<UI | null>(null);
export function useUI(): UI {
  const v = useContext(Ctx);
  if (!v) throw new Error('UIProvider ausente');
  return v;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirm] = useState<(ConfirmOpts & { resolve: (b: boolean) => void }) | null>(null);
  const [menuState, setMenu] = useState<{ title?: string; actions: MenuAction[] } | null>(null);
  const seq = useRef(0);

  const toast = useCallback<UI['toast']>((text, opts) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, text, kind: opts?.kind ?? 'info', action: opts?.action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts?.ms ?? (opts?.kind === 'error' ? 5200 : 3200));
  }, []);
  const confirm = useCallback<UI['confirm']>((o) => new Promise<boolean>((resolve) => setConfirm({ ...o, resolve })), []);
  const menu = useCallback<UI['menu']>((title, actions) => setMenu({ title, actions }), []);
  const value = useMemo(() => ({ toast, confirm, menu }), [toast, confirm, menu]);

  const closeConfirm = (b: boolean) => {
    confirmState?.resolve(b);
    setConfirm(null);
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {createPortal(
        <>
          <div className="toasts" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className={`toast${t.kind === 'error' ? ' error' : ''}`} role={t.kind === 'error' ? 'alert' : 'status'}>
                <span>{t.text}</span>
                {t.action && (
                  <button
                    onClick={() => {
                      t.action!.onClick();
                      setToasts((x) => x.filter((y) => y.id !== t.id));
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
          {confirmState && (
            <>
              <div className="backdrop top" onClick={() => closeConfirm(false)} />
              <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
                <h3 id="dlg-title">{confirmState.title}</h3>
                {confirmState.message && <p>{confirmState.message}</p>}
                <div className="actions">
                  <button className="btn secondary" onClick={() => closeConfirm(false)} autoFocus>
                    Cancelar
                  </button>
                  <button className={`btn ${confirmState.danger ? 'danger' : ''}`} onClick={() => closeConfirm(true)}>
                    {confirmState.confirmLabel ?? 'Aceptar'}
                  </button>
                </div>
              </div>
            </>
          )}
          {menuState && (
            <>
              <div className="backdrop top" onClick={() => setMenu(null)} />
              <div className="menu" role="menu">
                <div className="list">
                  {menuState.title && <div className="menu-title">{menuState.title}</div>}
                  {menuState.actions.map((a) => (
                    <button
                      key={a.label}
                      role="menuitem"
                      className={`list-row${a.danger ? ' danger' : ''}`}
                      onClick={() => {
                        setMenu(null);
                        a.onSelect();
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <button className="list-row cancel" onClick={() => setMenu(null)}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </>,
        document.body,
      )}
    </Ctx.Provider>
  );
}
