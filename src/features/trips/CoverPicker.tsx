import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Sheet } from '../../ui/Sheet';
import { useOnline } from '../../app/hooks';
import type { Trip } from '../../domain/types';
import { localChoices, onlineChoices, type CoverChoice } from '../../services/coverPhotos';

/** Galería para elegir la portada del viaje entre varias fotos del destino. */
export function CoverPicker({ open, trip, onClose, onPick }: {
  open: boolean;
  trip: Pick<Trip, 'name' | 'stages'>;
  onClose: () => void;
  onPick: (choice: CoverChoice) => Promise<void>;
}) {
  const online = useOnline();
  const places = [...new Set(trip.stages.map((s) => s.name.trim()).filter(Boolean))];
  const [place, setPlace] = useState(places[0] ?? '');
  const [items, setItems] = useState<CoverChoice[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const local = localChoices(trip);

  useEffect(() => {
    if (!open || !place || !online) return;
    let alive = true;
    setItems(null);
    setError(null);
    void onlineChoices(place).then((r) => alive && setItems(r), (e: Error) => {
      if (!alive) return;
      setError(e.message);
      setItems([]);
    });
    return () => {
      alive = false;
    };
  }, [open, place, online]);

  const pick = async (c: CoverChoice) => {
    setBusy(c.key);
    try {
      await onPick(c);
      onClose();
    } finally {
      setBusy(null);
    }
  };

  const grid = (list: CoverChoice[]) => (
    <div className="cp-grid">
      {list.map((c) => (
        <button key={c.key} type="button" className="cp-item" onClick={() => void pick(c)} disabled={!!busy} aria-label={`Usar esta foto (${c.credit})`}>
          <img src={c.thumb} alt="" loading="lazy" decoding="async" />
          {busy === c.key && <span className="cp-busy"><Loader2 className="spin" /></span>}
          {busy !== c.key && <span className="cp-check" aria-hidden="true"><Check /></span>}
        </button>
      ))}
    </div>
  );

  return (
    <Sheet open={open} title="Elegir portada" onClose={onClose} full>
      {local.length > 0 && (
        <section className="stack-sm">
          <h3 className="cp-head">Del país · también sin conexión</h3>
          {grid(local)}
        </section>
      )}
      <section className="stack-sm" style={{ marginTop: 18 }}>
        <h3 className="cp-head">Más fotos del destino</h3>
        {places.length > 1 && (
          <div className="row wrap" style={{ gap: 6 }}>
            {places.map((p) => (
              <button key={p} type="button" className={`chip${p === place ? ' on' : ''}`} aria-pressed={p === place} onClick={() => setPlace(p)}>{p}</button>
            ))}
          </div>
        )}
        {!places.length ? (
          <p className="small muted">Escribe primero un destino.</p>
        ) : !online ? (
          <p className="small muted">Para ver más fotos de {place} hace falta conexión. Las de arriba funcionan siempre.</p>
        ) : items === null ? (
          <p className="small muted row" style={{ gap: 8 }}><Loader2 className="spin" size={16} /> Buscando fotos de {place}…</p>
        ) : items.length ? (
          <>
            {grid(items)}
            <p className="tiny faint">Fotos de Wikimedia Commons (licencias libres). El autor y la licencia se guardan con la portada.</p>
          </>
        ) : error ? (
          <p className="small muted">{error}</p>
        ) : (
          <p className="small muted">No he encontrado fotos de «{place}» en Wikipedia. Puedes subir una tuya.</p>
        )}
      </section>
    </Sheet>
  );
}
