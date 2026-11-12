import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { compressImage, useFileUrl } from '../files/files';
import { remove, storeFile } from '../data/repo';
import { useUI } from './UIProvider';

function Thumb({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = useFileUrl(id);
  return (
    <div className="ph">
      {url && <img src={url} alt="" />}
      <button type="button" aria-label="Quitar foto" onClick={onRemove}>
        <X />
      </button>
    </div>
  );
}

/** Lista editable de fotos guardadas localmente. */
export function PhotoField({ ids, onChange, tripId, max = 8 }: { ids: string[]; onChange: (ids: string[]) => void; tripId: string | null; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const ui = useUI();
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...ids];
    for (const f of Array.from(files).slice(0, max - ids.length)) {
      if (!f.type.startsWith('image/')) {
        ui.toast(`${f.name} no es una imagen.`, { kind: 'error' });
        continue;
      }
      const stored = await storeFile(await compressImage(f), f.name, tripId);
      next.push(stored.id);
    }
    onChange(next);
  };
  return (
    <div className="photo-strip">
      {ids.map((id) => (
        <Thumb key={id} id={id} onRemove={() => { onChange(ids.filter((x) => x !== id)); void remove('files', id); }} />
      ))}
      {ids.length < max && (
        <button type="button" className="photo-add" onClick={() => input.current?.click()} aria-label="Añadir fotos">
          <ImagePlus />
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

export function PhotoRow({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  return (
    <div className="tl-photos">
      {ids.slice(0, 4).map((id) => (
        <SmallPhoto key={id} id={id} />
      ))}
    </div>
  );
}
function SmallPhoto({ id }: { id: string }) {
  const url = useFileUrl(id);
  return url ? <img src={url} alt="" loading="lazy" /> : null;
}
