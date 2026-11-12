import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, PenLine } from 'lucide-react';
import { db } from '../../data/db';
import { remove, save, update } from '../../data/repo';
import type { JournalEntry } from '../../domain/types';
import { fmt } from '../../lib/dates';
import { PhotoField, PhotoRow } from '../../ui/Photos';
import { Sheet } from '../../ui/Sheet';

export function useJournal(tripId: string, date: string) {
  return useLiveQuery(() => db.journal.where('[tripId+date]').equals([tripId, date]).first(), [tripId, date]);
}

/** Tarjeta del diario de un día: lo vivido, en tus palabras y fotos. */
export function JournalCard({ tripId, date }: { tripId: string; date: string }) {
  const entry = useJournal(tripId, date);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="card journal-card" onClick={() => setOpen(true)} aria-label={entry ? 'Editar el diario de este día' : 'Escribir en el diario de este día'}>
        <div className="row" style={{ gap: 10 }}>
          <div className="icon-tile" data-tone="amber"><BookOpen /></div>
          <div className="grow" style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>Diario del día</div>
            {!entry && <div className="small muted">¿Qué ha sido lo mejor de hoy? Escríbelo y añade fotos.</div>}
          </div>
          <PenLine size={18} style={{ color: 'var(--accent)' }} />
        </div>
        {entry && (
          <>
            {entry.text && <p className="journal-text">{entry.text}</p>}
            <PhotoRow ids={entry.photoIds} />
          </>
        )}
      </button>
      {open && <JournalSheet tripId={tripId} date={date} entry={entry ?? undefined} onClose={() => setOpen(false)} />}
    </>
  );
}

function JournalSheet({ tripId, date, entry, onClose }: { tripId: string; date: string; entry?: JournalEntry; onClose: () => void }) {
  const [text, setText] = useState(entry?.text ?? '');
  const [photos, setPhotos] = useState<string[]>(entry?.photoIds ?? []);
  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const empty = !text.trim() && photos.length === 0;
    if (entry) {
      if (empty) await remove('journal', entry.id);
      else await update<JournalEntry>('journal', entry.id, { text: text.trim(), photoIds: photos });
    } else if (!empty) {
      await save<JournalEntry>('journal', { tripId, date, text: text.trim(), photoIds: photos });
    }
    onClose();
  }
  return (
    <Sheet open full title={`Diario · ${fmt.dayShort(date)}`} onClose={onClose} action={{ label: 'Guardar', onClick: () => void submit(), form: 'journal-form' }}>
      <form id="journal-form" className="form" onSubmit={submit}>
        <textarea className="textarea journal-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hoy hemos…" aria-label="Texto del diario" style={{ minHeight: 220 }} />
        <div className="field">
          <span className="label">Fotos del día</span>
          <PhotoField ids={photos} tripId={tripId} onChange={setPhotos} max={12} />
        </div>
      </form>
    </Sheet>
  );
}
