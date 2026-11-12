import { useMemo, useRef, useState } from 'react';
import { Download, File, FileText, FolderOpen, Pencil, Plus, Share, Trash2, Upload } from 'lucide-react';
import type { TripWithStatus } from '../../data/queries';
import { useDocs } from '../../data/queries';
import type { DocKind, TravelDoc } from '../../domain/types';
import { DOC_KINDS, docKindLabel } from '../../domain/catalog';
import { deleteDoc, save, storeFile, update } from '../../data/repo';
import { db } from '../../data/db';
import { formatBytes, useFileUrl } from '../../files/files';
import { Empty } from '../../ui/Empty';
import { Field } from '../../ui/Controls';
import { Sheet } from '../../ui/Sheet';
import { useUI } from '../../ui/UIProvider';
import { fmt, toISODate } from '../../lib/dates';

const MAX_DOC = 80 * 1024 * 1024;

function guessKind(f: File): DocKind {
  const n = f.name.toLowerCase();
  if (/billete|boarding|ticket|tarjeta.?embarque|vuelo|flight|renfe|tren/.test(n)) return 'billete';
  if (/reserva|booking|hotel|airbnb/.test(n)) return 'reserva';
  if (/entrada|admission|museo/.test(n)) return 'entrada';
  if (/seguro|insurance/.test(n)) return 'seguro';
  if (/confirm/.test(n)) return 'confirmacion';
  if (/dni|pasaporte|passport/.test(n)) return 'identidad';
  if (f.type.startsWith('image/')) return 'foto';
  return 'otro';
}

export function DocsTab({ trip }: { trip: TripWithStatus }) {
  const docs = useDocs(trip.id);
  const ui = useUI();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocKind | 'all'>('all');
  const [edit, setEdit] = useState<TravelDoc | null>(null);
  const [view, setView] = useState<TravelDoc | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => (docs ?? []).filter((d) => kind === 'all' || d.kind === kind).sort((a, b) => b.createdAt - a.createdAt), [docs, kind]);
  const total = (docs ?? []).reduce((a, d) => a + d.size, 0);

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    let n = 0;
    let last: TravelDoc | null = null;
    try {
      for (const f of Array.from(files)) {
        if (f.size > MAX_DOC) {
          ui.toast(`${f.name} supera 80 MB y no se ha importado.`, { kind: 'error' });
          continue;
        }
        // Los documentos se guardan tal cual (sin comprimir) para conservar su validez.
        const stored = await storeFile(f, f.name, trip.id);
        last = await save<TravelDoc>('docs', {
          tripId: trip.id, name: f.name.replace(/\.[^.]+$/, ''), kind: guessKind(f), fileId: stored.id, mime: stored.mime, size: f.size,
        });
        n++;
      }
      if (n) ui.toast(n === 1 ? 'Documento guardado en el dispositivo' : `${n} documentos guardados en el dispositivo`);
      if (n === 1 && last) setEdit(last);
    } catch (e) {
      const msg = (e as Error).name === 'QuotaExceededError' ? 'No queda espacio de almacenamiento en el dispositivo.' : (e as Error).message;
      ui.toast(msg, { kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (docs === undefined) return null;
  const kinds = DOC_KINDS.filter((k) => docs.some((d) => d.kind === k.value));

  return (
    <div className="stack">
      <div className="row-between">
        <span className="small muted">{docs.length} {docs.length === 1 ? 'documento' : 'documentos'} · {formatBytes(total)} en el dispositivo</span>
        <button className="btn sm" onClick={() => input.current?.click()} disabled={busy}><Upload /> Importar</button>
      </div>
      <input ref={input} type="file" multiple hidden accept="application/pdf,image/*,.pdf,.pkpass,.txt,.doc,.docx,.xls,.xlsx,.eml,.html,.json" onChange={(e) => { void importFiles(e.target.files); e.target.value = ''; }} />

      {docs.length === 0 ? (
        <div className="card flat">
          <Empty icon={FolderOpen} title="Sin documentos" text="Importa billetes, reservas, entradas o PDF. Se guardan solo en este dispositivo y se abren sin conexión."
            action={<button className="btn secondary sm" onClick={() => input.current?.click()}><Plus /> Importar documentos</button>} />
        </div>
      ) : (
        <>
          {kinds.length > 1 && (
            <div className="chips">
              <button className="chip" aria-pressed={kind === 'all'} onClick={() => setKind('all')}>Todos</button>
              {kinds.map((k) => <button key={k.value} className="chip" aria-pressed={kind === k.value} onClick={() => setKind(k.value)}>{k.label}</button>)}
            </div>
          )}
          <div className="doc-grid">
            {list.map((d) => <DocCard key={d.id} doc={d} onOpen={() => setView(d)} />)}
          </div>
        </>
      )}
      <p className="tiny faint">Privacidad: los documentos no se suben a ningún servicio. Solo salen del dispositivo si exportas una copia o activas la sincronización de este viaje con tu propio servidor.</p>
      {edit && <DocEdit doc={edit} onClose={() => setEdit(null)} />}
      {view && <DocViewer doc={docs.find((x) => x.id === view.id) ?? view} onClose={() => setView(null)} onEdit={() => { setEdit(view); setView(null); }} />}
    </div>
  );
}

function DocCard({ doc, onOpen }: { doc: TravelDoc; onOpen: () => void }) {
  const isImg = doc.mime.startsWith('image/');
  const url = useFileUrl(isImg ? doc.fileId : null);
  return (
    <button className="doc-card" onClick={onOpen} aria-label={`Abrir ${doc.name}`}>
      <div className="doc-thumb">{url ? <img src={url} alt="" loading="lazy" /> : doc.mime === 'application/pdf' ? <FileText /> : <File />}</div>
      <div className="body">
        <div className="name ellipsis">{doc.name}</div>
        <div className="tiny faint">{docKindLabel(doc.kind)} · {formatBytes(doc.size)}</div>
      </div>
    </button>
  );
}

function DocEdit({ doc, onClose }: { doc: TravelDoc; onClose: () => void }) {
  const [name, setName] = useState(doc.name);
  const [kind, setKind] = useState(doc.kind);
  const [description, setDescription] = useState(doc.description ?? '');
  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    await update<TravelDoc>('docs', doc.id, { name: name.trim() || doc.name, kind, description: description.trim() || undefined });
    onClose();
  }
  return (
    <Sheet open title="Documento" onClose={onClose} action={{ label: 'Guardar', onClick: () => void submit(), form: 'doc-form' }}>
      <form id="doc-form" className="form" onSubmit={submit}>
        <Field label="Nombre" htmlFor="d-name"><input id="d-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Tipo" htmlFor="d-kind">
          <select id="d-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as DocKind)}>
            {DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </Field>
        <Field label="Descripción" htmlFor="d-desc"><textarea id="d-desc" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Vuelo de ida, asiento 14C…" /></Field>
      </form>
    </Sheet>
  );
}

function DocViewer({ doc, onClose, onEdit }: { doc: TravelDoc; onClose: () => void; onEdit: () => void }) {
  const url = useFileUrl(doc.fileId);
  const ui = useUI();
  const isImg = doc.mime.startsWith('image/');
  const isPdf = doc.mime === 'application/pdf';
  const ext = doc.mime === 'application/pdf' ? '.pdf' : '';

  async function share() {
    const f = await db.files.get(doc.fileId);
    if (!f) return;
    const file = new globalThis.File([f.blob], doc.name.endsWith(ext) ? doc.name : doc.name + ext, { type: f.mime });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: doc.name });
      else {
        const a = document.createElement('a');
        a.href = url!;
        a.download = file.name;
        a.click();
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') ui.toast('No se pudo compartir.', { kind: 'error' });
    }
  }
  async function del() {
    if (await ui.confirm({ title: `¿Eliminar «${doc.name}»?`, message: 'Se borrará de este dispositivo.', confirmLabel: 'Eliminar', danger: true })) {
      await deleteDoc(doc);
      onClose();
    }
  }
  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={doc.name}>
      <div className="sheet-head" style={{ paddingTop: 'calc(var(--sat) + 6px)' }}>
        <button className="btn ghost" onClick={onClose} style={{ justifySelf: 'start' }}>Cerrar</button>
        <div className="title">{doc.name}</div>
        <div className="row" style={{ justifySelf: 'end', gap: 0 }}>
          <button className="icon-btn" aria-label="Editar datos" onClick={onEdit}><Pencil /></button>
          <button className="icon-btn" aria-label="Compartir o guardar" onClick={() => void share()}><Share /></button>
          <button className="icon-btn" aria-label="Eliminar" onClick={() => void del()} style={{ color: 'var(--danger)' }}><Trash2 /></button>
        </div>
      </div>
      <div className="content">
        {!url ? null : isImg ? <img src={url} alt={doc.name} /> : isPdf ? <iframe src={url} title={doc.name} /> : (
          <div className="empty">
            <div className="icon-tile"><File /></div>
            <h3>{doc.name}</h3>
            <p>Este tipo de archivo no se puede previsualizar aquí. Ábrelo con otra app.</p>
            <a className="btn" href={url} download={doc.name}><Download /> Abrir / guardar</a>
          </div>
        )}
      </div>
      <div className="small muted" style={{ padding: '10px 16px calc(10px + var(--sab))', borderTop: '0.5px solid var(--line)' }}>
        {docKindLabel(doc.kind)} · {formatBytes(doc.size)} · añadido el {fmt.dayYear(toISODate(new Date(doc.createdAt)))}{doc.description ? ` · ${doc.description}` : ''}
        {isPdf && <div className="tiny faint" style={{ marginTop: 4 }}>Si el PDF tiene varias páginas y solo ves la primera, usa «Compartir» para abrirlo en el visor del sistema.</div>}
      </div>
    </div>
  );
}
