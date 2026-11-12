import { CloudSun } from 'lucide-react';
import type { Trip } from '../../domain/types';
import { diffDays, eachDay, today } from '../../lib/dates';
import { describeWeather, useForecast } from '../../services/weather';
import { Icon } from '../../ui/Icon';
import { useOnline } from '../../app/hooks';

/** Tiempo de los días del viaje (Open-Meteo). Honesto: la previsión solo llega a 16 días vista. */
export function TripWeather({ trip }: { trip: Trip }) {
  const online = useOnline();
  const days = eachDay(trip.startDate ?? '', trip.endDate ?? trip.startDate ?? '');
  const now = today();
  const point = trip.stages.find((s) => s.point)?.point;
  const fc = useForecast(point);
  if (!days.length || (trip.endDate && trip.endDate < now)) return null;
  const until = trip.startDate ? diffDays(now, trip.startDate) : 0;
  const head = (
    <div className="section-head"><h2>Tiempo</h2><span className="tiny faint">Open-Meteo</span></div>
  );
  if (!point) {
    return (
      <section>
        {head}
        <div className="card flat small muted row"><CloudSun size={18} /> {online ? 'Buscando la ubicación del destino…' : 'Conéctate una vez para ubicar el destino y ver el tiempo.'}</div>
      </section>
    );
  }
  if (until > 15) {
    return (
      <section>
        {head}
        <div className="card flat small muted row"><CloudSun size={18} /> La previsión estará disponible unos 16 días antes de salir (faltan {until}).</div>
      </section>
    );
  }
  if (fc === undefined) return null;
  if (fc === null) {
    return (
      <section>
        {head}
        <div className="card flat small muted row"><CloudSun size={18} /> Sin previsión guardada. Se descargará cuando haya conexión.</div>
      </section>
    );
  }
  const visible = days.filter((d) => d >= now).slice(0, 10);
  return (
    <section>
      {head}
      <div className="weather-strip">
        {visible.map((d) => {
          const w = fc.byDate.get(d);
          const date = new Date(d + 'T12:00:00');
          return (
            <div key={d} className={`wday${d === now ? ' today' : ''}`}>
              <div className="dow">{d === now ? 'Hoy' : date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</div>
              {w ? (
                <>
                  <Icon name={describeWeather(w.code).icon} size={24} />
                  <div className="max">{w.max}°</div>
                  <div className="min">{w.min}°</div>
                  {w.rain !== null && w.rain >= 30 && <div className="rain">{w.rain}%</div>}
                </>
              ) : (
                <div className="min" style={{ marginTop: 18 }}>—</div>
              )}
            </div>
          );
        })}
      </div>
      {fc.fetchedAt && <p className="tiny faint" style={{ marginTop: 6 }}>Actualizado {new Date(fc.fetchedAt).toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}{!online ? ' · sin conexión, datos guardados' : ''}</p>}
    </section>
  );
}
