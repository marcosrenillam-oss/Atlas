import { useMemo, useState } from 'react';
import { Check, Search, Shuffle } from 'lucide-react';
import { Sheet } from '../../ui/Sheet';
import { flag } from '../passport/achievements';
import { CONTINENT_NAMES, LANDMARKS, type Continent } from './landmarks';

const ORDER: Continent[] = ['eu', 'af', 'as', 'na', 'sa', 'oc'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Buscador de los 195 países del Mundo ATLAS, agrupados por continente. */
export function WorldSearch({ open, visited, onClose, onPick }: { open: boolean; visited: Set<string>; onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const n = norm(q.trim());
    const list = LANDMARKS.filter((l) => !n || norm(`${l.country} ${l.name} ${l.city}`).includes(n)).sort((a, b) => a.country.localeCompare(b.country, 'es'));
    return ORDER.map((c) => [c, list.filter((l) => l.continent === c)] as const).filter(([, l]) => l.length);
  }, [q]);
  const pick = (id: string) => {
    setQ('');
    onPick(id);
  };
  const total = groups.reduce((s, [, l]) => s + l.length, 0);
  return (
    <Sheet open={open} title="Buscar en el mundo" onClose={onClose} full>
      <div className="ws-search">
        <label className="ws-input">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Japón, Petra, Kenia…" aria-label="Buscar país o monumento" autoComplete="off" />
        </label>
        <button type="button" className="btn secondary sm" aria-label="Sorpréndeme" onClick={() => pick(LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)].id)}>
          <Shuffle size={16} aria-hidden="true" /> <span className="ws-shuffle-txt">Sorpréndeme</span>
        </button>
      </div>
      <p className="tiny muted" style={{ margin: '8px 2px 4px' }}>
        {q ? `${total} resultado${total === 1 ? '' : 's'}` : `${LANDMARKS.length} países · ${[...visited].filter((c) => LANDMARKS.some((l) => l.countryCode === c)).length} visitados`}
      </p>
      {groups.map(([c, list]) => (
        <section key={c} className="ws-group">
          <h3 className="ws-cont">{CONTINENT_NAMES[c]}</h3>
          <ul className="ws-list">
            {list.map((l) => (
              <li key={l.id}>
                <button type="button" className="ws-item" onClick={() => pick(l.id)}>
                  <span className="ws-flag" aria-hidden="true">{flag(l.countryCode)}</span>
                  <span className="ws-text">
                    <span className="ws-country">{l.country}</span>
                    <span className="ws-name">{l.name}</span>
                  </span>
                  {visited.has(l.countryCode) && <Check size={16} className="ws-vis" aria-label="Visitado" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!total && <p className="muted" style={{ textAlign: 'center', padding: 24 }}>No encuentro ese país. Prueba con otro nombre.</p>}
    </Sheet>
  );
}
