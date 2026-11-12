import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Globe2, Lock } from 'lucide-react';
import { db } from '../../data/db';
import { useTrips } from '../../data/queries';
import { tripLength } from '../../domain/status';
import { TopBar } from '../../app/TopBar';
import { MapView, type MapMarker } from '../../maps/MapView';
import { Icon } from '../../ui/Icon';
import { CountUp } from '../../ui/Motion';
import { Empty } from '../../ui/Empty';
import { enrichTrip } from '../../services/geo';
import { routeKm } from '../trip/Recap';
import { ACHIEVEMENTS, flag, type PassportData } from './achievements';

export function PassportPage() {
  const trips = useTrips();
  const extra = useLiveQuery(async () => {
    const lists = await db.packingLists.filter((l) => !l.isTemplate).toArray();
    let perfect = 0;
    for (const l of lists) {
      const its = await db.packingItems.where('listId').equals(l.id).toArray();
      if (its.length >= 5 && its.every((i) => i.checked)) perfect++;
    }
    const people = await db.participants.toArray();
    const byTrip = new Map<string, number>();
    for (const p of people) byTrip.set(p.tripId, (byTrip.get(p.tripId) ?? 0) + 1);
    return {
      items: await db.items.count(), journal: await db.journal.count(), expenses: await db.expenses.count(),
      places: await db.places.count(), perfectLists: perfect, maxGroup: Math.max(0, ...byTrip.values()),
    };
  }, []);

  useEffect(() => {
    for (const t of trips ?? []) if (t.stages.some((s) => s.name.trim() && !s.countryCode)) void enrichTrip(t.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips?.length]);

  const data = useMemo(() => {
    if (!trips || !extra) return null;
    const lived = trips.filter((t) => t.status === 'completado' || t.status === 'en-curso' || (t.status === 'archivado' && t.endDate && t.endDate < new Date().toISOString().slice(0, 10)));
    const countries = new Map<string, { name: string; trips: number }>();
    const cities = new Set<string>();
    let days = 0, km = 0;
    const years = new Map<string, { trips: number; days: number }>();
    for (const t of lived) {
      for (const s of t.stages) {
        if (s.name.trim()) cities.add(s.name.trim().toLowerCase());
        if (s.countryCode) {
          const c = countries.get(s.countryCode) ?? { name: s.country ?? s.countryCode, trips: 0 };
          c.trips++;
          countries.set(s.countryCode, c);
        }
      }
      const len = tripLength(t) ?? 0;
      days += len;
      km += routeKm(t);
      const y = t.startDate?.slice(0, 4);
      if (y) {
        const v = years.get(y) ?? { trips: 0, days: 0 };
        v.trips++;
        v.days += len;
        years.set(y, v);
      }
    }
    const pd: PassportData = {
      tripsDone: lived.length, tripsTotal: trips.length, countries: countries.size, days, km,
      snowTrips: trips.filter((t) => t.type === 'nieve').length, items: extra.items, journal: extra.journal,
      expenses: extra.expenses, places: extra.places, perfectLists: extra.perfectLists, bigGroup: extra.maxGroup >= 4 || trips.some((t) => t.travelers >= 4),
    };
    return { pd, countries: [...countries.entries()].sort((a, b) => b[1].trips - a[1].trips), cities: cities.size, years: [...years.entries()].sort((a, b) => b[0].localeCompare(a[0])), lived };
  }, [trips, extra]);

  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    for (const t of trips ?? []) {
      t.stages.forEach((s, i) => {
        if (s.point) out.push({ id: `${t.id}-${i}`, point: s.point, label: s.name, sub: t.name, icon: 'MapPin', tone: t.status === 'completado' || t.status === 'en-curso' ? 'sky' : 'muted' });
      });
    }
    return out;
  }, [trips]);

  if (!data) return <main className="page" />;
  const unlocked = ACHIEVEMENTS.filter((a) => { const [v, max] = a.progress(data.pd); return v >= max; }).length;

  return (
    <>
      <TopBar title="Pasaporte" back="/perfil" />
      <main className="page stagger" style={{ paddingTop: 4 }}>
        <div className="page-head"><h1>Tu <span className="serif grad-text">pasaporte</span></h1></div>
        <div className="stats">
          <div className="stat"><div className="lbl">Viajes vividos</div><div className="val"><CountUp value={data.pd.tripsDone} /></div><div className="sub">{data.pd.tripsTotal} en total</div></div>
          <div className="stat"><div className="lbl">Países</div><div className="val"><CountUp value={data.pd.countries} /></div><div className="sub">{data.cities} ciudades</div></div>
          <div className="stat"><div className="lbl">Días viajando</div><div className="val"><CountUp value={data.pd.days} /></div><div className="sub">en viajes completados</div></div>
          <div className="stat"><div className="lbl">Kilómetros</div><div className="val"><CountUp value={data.pd.km} format={(n) => Math.round(n).toLocaleString('es-ES')} /></div><div className="sub">aprox. en línea recta</div></div>
        </div>

        <section className="section">
          <div className="section-head"><h2>Tu mapa</h2><span className="tiny faint">azul: vividos · gris: próximos</span></div>
          {markers.length ? <MapView markers={markers} singleZoom={4.5} /> : (
            <div className="card flat"><Empty icon={Globe2} title="Aún no hay destinos en el mapa" text="Los destinos se ubican solos al abrir cada viaje con conexión." action={<Link className="btn secondary sm" to="/viajes">Ir a Viajes</Link>} /></div>
          )}
        </section>

        {data.countries.length > 0 && (
          <section className="section">
            <div className="section-head"><h2>Países</h2></div>
            <div className="chips" style={{ flexWrap: 'wrap', margin: 0, padding: 0 }}>
              {data.countries.map(([code, c]) => (
                <span key={code} className="chip"><span style={{ fontSize: 18 }}>{flag(code)}</span> {c.name}{c.trips > 1 ? <span className="count">×{c.trips}</span> : null}</span>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section-head"><h2>Logros</h2><span className="small faint">{unlocked} de {ACHIEVEMENTS.length}</span></div>
          <div className="badges">
            {ACHIEVEMENTS.map((a) => {
              const [v, max] = a.progress(data.pd);
              const done = v >= max;
              return (
                <div key={a.id} className={`badge-card${done ? ' on' : ''}`}>
                  <div className="icon-tile lg" data-tone={done ? a.tone : 'slate'}>{done ? <Icon name={a.icon} /> : <Lock />}</div>
                  <div className="b-title">{a.title}</div>
                  <div className="b-text">{a.text}</div>
                  {!done && <div className="progress" style={{ height: 5 }}><div style={{ width: `${Math.min(100, (v / max) * 100)}%` }} /></div>}
                </div>
              );
            })}
          </div>
        </section>

        {data.years.length > 0 && (
          <section className="section">
            <div className="section-head"><h2>Por año</h2></div>
            <div className="list">
              {data.years.map(([y, v]) => (
                <div key={y} className="list-row"><strong className="grow">{y}</strong><span className="meta">{v.trips} {v.trips === 1 ? 'viaje' : 'viajes'} · {v.days} días</span></div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
