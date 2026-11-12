import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText, Ticket, WalletCards } from 'lucide-react';
import { db } from '../../data/db';
import type { TravelDoc, Trip } from '../../domain/types';
import { docKindLabel } from '../../domain/catalog';
import { useFileUrl } from '../../files/files';
import { Sheet } from '../../ui/Sheet';
import { Empty } from '../../ui/Empty';
import { paletteFor } from '../../ui/Cover';
import { DocViewer } from './DocsTab';

export function useWalletDocs(tripId?: string) {
  return useLiveQuery(async () => (tripId ? (await db.docs.where('tripId').equals(tripId).toArray()).filter((d) => d.wallet) : []), [tripId], []);
}

/** Cartera: billetes y entradas a un toque, como tarjetas grandes. */
export function WalletSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const docs = useWalletDocs(trip.id) ?? [];
  const [view, setView] = useState<TravelDoc | null>(null);
  if (view) return <DocViewer doc={view} onClose={() => setView(null)} onEdit={() => setView(null)} />;
  return (
    <Sheet open full title="Cartera" onClose={onClose} closeLabel="Cerrar">
      {docs.length === 0 ? (
        <Empty icon={WalletCards} title="Tu cartera está vacía" text="En Documentos, abre un billete o una entrada, pulsa el lápiz y activa «En la cartera». Los billetes y entradas que importes entran solos." />
      ) : (
        <div className="wallet-stack">
          {docs.map((d, i) => <WalletPass key={d.id} doc={d} index={i} label={trip.name} onOpen={() => setView(d)} />)}
        </div>
      )}
    </Sheet>
  );
}

function WalletPass({ doc, index, label, onOpen }: { doc: TravelDoc; index: number; label: string; onOpen: () => void }) {
  const isImg = doc.mime.startsWith('image/');
  const url = useFileUrl(isImg ? doc.fileId : null);
  const [a, b] = paletteFor(`${label}${index}`);
  return (
    <button className="wallet-pass" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} onClick={onOpen} aria-label={`Abrir ${doc.name}`}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div className="wp-kind">{docKindLabel(doc.kind)}</div>
          <div className="wp-name">{doc.name}</div>
          {doc.description && <div className="wp-desc">{doc.description}</div>}
        </div>
        {doc.kind === 'entrada' || doc.kind === 'billete' ? <Ticket /> : <FileText />}
      </div>
      {url ? <img src={url} alt="" className="wp-thumb" /> : <div className="wp-open">Toca para abrir</div>}
    </button>
  );
}
