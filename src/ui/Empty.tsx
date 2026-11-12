import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function Empty({ icon: I, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="icon-tile">
        <I aria-hidden="true" />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
