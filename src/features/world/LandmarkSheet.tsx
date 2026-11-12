import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarHeart, MessageCircle, Sparkles, UtensilsCrossed, X } from 'lucide-react';
import type { Landmark } from './landmarks';
import { flag } from '../passport/achievements';
import credits from '../../../public/world/credits.json';
import { paletteFor } from '../../ui/Cover';

type Credit = { author: string; license: string; source: string };
const CREDITS = credits as Record<string, Credit>;

/** Ficha del monumento: foto real (guardada en la app), breve historia y lo más típico del país. */
export function LandmarkSheet({ landmark: l, visited, onClose }: { landmark: Landmark; visited: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [imgOk, setImgOk] = useState(true);
  const cr = CREDITS[l.id];
  const [a, b] = paletteFor(l.name);
  return (
    <div className="lm-sheet" role="dialog" aria-modal="false" aria-label={l.name}>
      <div className="lm-photo" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
        {cr && imgOk ? (
          <img src={`${import.meta.env.BASE_URL}world/${l.id}.jpg`} alt={`${l.name}, ${l.city}`} onError={() => setImgOk(false)} />
        ) : (
          <div className="lm-nophoto">{flag(l.countryCode)}</div>
        )}
        <button className="icon-btn sm filled lm-close" aria-label="Cerrar" onClick={onClose}><X /></button>
        {visited && <span className="pill success lm-visited">✓ Ya has estado</span>}
      </div>
      <div className="lm-body">
        <div className="lm-country"><span>{flag(l.countryCode)}</span> {l.country} · {l.city}</div>
        <h2 className="lm-name">{l.name}</h2>
        <div className="small faint">{l.year}</div>
        <p className="lm-text">{l.text}</p>
        <div className="lm-grid">
          <div><UtensilsCrossed /><div><div className="k">Plato típico</div><div className="v">{l.dish}</div></div></div>
          <div><Sparkles /><div><div className="k">¿Sabías que…?</div><div className="v">{l.fact}</div></div></div>
          <div><MessageCircle /><div><div className="k">Cómo saludar</div><div className="v">{l.hello}</div></div></div>
          <div><CalendarHeart /><div><div className="k">Mejor época</div><div className="v">{l.season}</div></div></div>
        </div>
        <button className="btn block" onClick={() => nav(`/viajes?nuevo=${encodeURIComponent(l.destination)}`)}>Planear un viaje a {l.destination}</button>
        {cr && (
          <p className="tiny faint lm-credit">
            Foto: {cr.author} · {cr.license} · <a href={cr.source} target="_blank" rel="noopener">Wikimedia Commons</a>
          </p>
        )}
      </div>
    </div>
  );
}
