import { useEffect, useState } from 'react';
import { FileDown, Loader2, Share } from 'lucide-react';
import { Sheet } from '../../ui/Sheet';
import { useUI } from '../../ui/UIProvider';
import { useItems, useParticipants } from '../../data/queries';
import type { Trip } from '../../domain/types';
import { buildItineraryHtml, printItinerary, shareItineraryFile } from './shareItinerary';

/** Compartir el itinerario como página (archivo) o PDF, con vista previa. */
export function ShareItinerary({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const ui = useUI();
  const items = useItems(trip.id);
  const people = useParticipants(trip.id);
  const [includePrivate, setIncludePrivate] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!items || !people) return;
    let alive = true;
    setHtml(null);
    void buildItineraryHtml(trip, items, people, { includePrivate }).then((h) => alive && setHtml(h));
    return () => {
      alive = false;
    };
  }, [trip, items, people, includePrivate]);

  const share = async () => {
    if (!html) return;
    try {
      const r = await shareItineraryFile(html, trip.name);
      if (r === 'downloaded') ui.toast('Itinerario descargado');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') ui.toast('No se pudo compartir', { kind: 'error' });
    }
  };

  return (
    <Sheet open title="Compartir itinerario" onClose={onClose} full>
      <div className="share-preview">
        {html ? <iframe title="Vista previa del itinerario" srcDoc={html} /> : <div className="share-loading"><Loader2 className="spin" /> Preparando…</div>}
      </div>
      <label className="row-between share-toggle">
        <span>
          <span style={{ fontWeight: 650 }}>Incluir localizadores y notas</span>
          <span className="small muted" style={{ display: 'block' }}>Desactivado, nadie verá tus códigos de reserva.</span>
        </span>
        <span className="switch"><input type="checkbox" checked={includePrivate} onChange={(e) => setIncludePrivate(e.target.checked)} /><span /></span>
      </label>
      <div className="share-actions">
        <button type="button" className="btn block" disabled={!html} onClick={() => void share()}><Share /> Compartir</button>
        <button type="button" className="btn secondary block" disabled={!html} onClick={() => html && printItinerary(html)}><FileDown /> Guardar PDF</button>
      </div>
      <p className="tiny faint" style={{ marginTop: 10 }}>Se comparte como una página que se abre en cualquier móvil u ordenador, sin necesidad de tener ATLAS. Para el PDF, en la hoja de impresión pulsa Compartir › Guardar en Archivos.</p>
    </Sheet>
  );
}
