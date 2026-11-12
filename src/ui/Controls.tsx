import type { ReactNode } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { celebrateFrom } from './Motion';

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <span className="error" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </span>
  );
}

export function CheckButton({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" className="check-hit" aria-pressed={on} aria-label={label} onClick={(e) => {
      if (!on) celebrateFrom(e.currentTarget);
      onToggle();
    }}>
      <span className={`check${on ? ' on' : ''}`}>
        <Check />
      </span>
    </button>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label="Menos" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Minus size={16} />
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" aria-label="Más" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Plus size={16} />
      </button>
    </div>
  );
}
