import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Hoja modal estilo iOS: Cancelar · Título · Acción. Se cierra con Escape o tocando fuera. */
export function Sheet(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  action?: { label: string; onClick: () => void; disabled?: boolean; form?: string };
  full?: boolean;
  closeLabel?: string;
}) {
  const { open, onClose } = props;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    requestAnimationFrame(() => ref.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      html.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="backdrop" onClick={onClose} />
      <div className={`sheet${props.full ? ' full' : ''}`} role="dialog" aria-modal="true" aria-label={props.title} ref={ref} tabIndex={-1}>
        <div className="sheet-grabber" />
        <div className="sheet-head">
          <button type="button" className="btn ghost" onClick={onClose} style={{ justifySelf: 'start' }}>
            {props.closeLabel ?? 'Cancelar'}
          </button>
          <div className="title">{props.title}</div>
          {props.action ? (
            <button
              type={props.action.form ? 'submit' : 'button'}
              form={props.action.form}
              className="btn ghost strong"
              onClick={props.action.form ? undefined : props.action.onClick}
              disabled={props.action.disabled}
              style={{ justifySelf: 'end' }}
            >
              {props.action.label}
            </button>
          ) : (
            <span />
          )}
        </div>
        <div className="sheet-body">{props.children}</div>
      </div>
    </>,
    document.body,
  );
}
