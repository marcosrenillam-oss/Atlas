import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Hand, LocateFixed, Minus, Plus, Search } from 'lucide-react';
import { useTrips } from '../../data/queries';
import { LANDMARKS } from './landmarks';
import { flag } from '../passport/achievements';
import { LandmarkSheet } from './LandmarkSheet';
import { WorldSearch } from './WorldSearch';
import type { WorldApi } from './scene';

/** Mundo ATLAS: mini-mundo 3D con un monumento de cada uno de los 195 países. */
export default function WorldPage() {
  const nav = useNavigate();
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<WorldApi | null>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());
  const [selected, setSelected] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(true);
  const [search, setSearch] = useState(false);
  const trips = useTrips();
  const visited = useMemo(() => {
    const s = new Set<string>();
    for (const t of trips ?? []) if (t.status === 'completado' || t.status === 'en-curso') for (const st of t.stages) if (st.countryCode) s.add(st.countryCode);
    return s;
  }, [trips]);
  const visitedRef = useRef(visited);
  visitedRef.current = visited;

  useEffect(() => {
    let disposed = false;
    const dark = () => document.documentElement.dataset.theme === 'dark';
    void import('./scene')
      .then(({ createWorld }) => {
        if (disposed || !host.current) return;
        try {
          api.current = createWorld(host.current, { dark: dark(), visited: visitedRef.current, onSelect: (id) => { setSelected(id); setHint(false); } });
          api.current.setLabels(labelRefs.current);
        } catch {
          setFailed(true); // sin WebGL
        }
      })
      .catch(() => setFailed(true));
    const mo = new MutationObserver(() => api.current?.setTheme(dark()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const t = setTimeout(() => setHint(false), 6500);
    return () => {
      disposed = true;
      clearTimeout(t);
      mo.disconnect();
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.setLabels(labelRefs.current);
  }, [visited]);

  const landmark = LANDMARKS.find((l) => l.id === selected) ?? null;

  return (
    <div className="world">
      <div ref={host} className="world-canvas" onPointerDown={() => setHint(false)} />
      <div className="world-labels" aria-hidden={false}>
        {LANDMARKS.map((l) => (
          <button
            key={l.id}
            ref={(el) => {
              if (el) labelRefs.current.set(l.id, el);
              else labelRefs.current.delete(l.id);
            }}
            className={`world-label${selected === l.id ? ' on' : ''}`}
            onClick={() => api.current?.flyTo(l.id)}
            aria-label={`${l.name}, ${l.country}`}
          >
            <span className="flag">{flag(l.countryCode)}</span>
            <span className="nm">{l.name}</span>
            <span className="vis" aria-hidden="true">✓</span>
          </button>
        ))}
      </div>

      <div className="world-top">
        <button className="icon-btn filled" aria-label="Volver" onClick={() => nav(-1)}><ChevronLeft /></button>
        <div className="world-title">
          <div className="tiny" style={{ fontWeight: 800, letterSpacing: '.14em', color: 'var(--accent)' }}>EXPLORAR</div>
          <div>Mundo <span className="serif grad-text">ATLAS</span></div>
        </div>
        <button className="pill world-search-btn" onClick={() => setSearch(true)} aria-label="Buscar país o monumento">
          <Search size={15} aria-hidden="true" />
          {visited.size ? `${[...visited].filter((c) => LANDMARKS.some((l) => l.countryCode === c)).length}/${LANDMARKS.length}` : `${LANDMARKS.length} países`}
        </button>
      </div>

      <div className="world-ctrls" style={{ display: landmark ? 'none' : undefined }}>
        <button className="icon-btn filled" aria-label="Acercar" onClick={() => api.current?.zoom(0.7)}><Plus /></button>
        <button className="icon-btn filled" aria-label="Alejar" onClick={() => api.current?.zoom(1.4)}><Minus /></button>
        <button className="icon-btn filled" aria-label="Volver a la vista general" onClick={() => api.current?.recenter()}><LocateFixed /></button>
      </div>

      {hint && !failed && (
        <div className="world-hint" role="status"><Hand size={16} /> Arrastra para moverte · pellizca para acercar · toca un monumento o busca un país arriba</div>
      )}
      {failed && (
        <div className="world-fail card">
          Este dispositivo no permite gráficos 3D (WebGL). Puedes ver los monumentos en la lista de Explorar.
        </div>
      )}
      <WorldSearch
        open={search}
        visited={visited}
        onClose={() => setSearch(false)}
        onPick={(id) => {
          setSearch(false);
          setHint(false);
          api.current?.flyTo(id);
        }}
      />
      {landmark && <LandmarkSheet landmark={landmark} visited={visited.has(landmark.countryCode)} onClose={() => setSelected(null)} />}
    </div>
  );
}
