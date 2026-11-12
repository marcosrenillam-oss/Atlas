import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScrolled } from './hooks';

export function TopBar({ title, back, right }: { title?: string; back?: string; right?: ReactNode }) {
  const nav = useNavigate();
  const scrolled = useScrolled();
  return (
    <header className={`topbar${scrolled ? ' scrolled' : ''}`}>
      <button
        className="icon-btn"
        aria-label="Atrás"
        onClick={() => (window.history.length > 1 && window.history.state?.idx > 0 ? nav(-1) : nav(back ?? '/'))}
      >
        <ChevronLeft />
      </button>
      <div className="title">{scrolled ? title : ''}</div>
      <div className="row" style={{ gap: 0, justifySelf: 'end' }}>{right}</div>
    </header>
  );
}
