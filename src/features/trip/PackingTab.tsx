import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookCopy, ListChecks, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import type { TripWithStatus } from '../../data/queries';
import { db } from '../../data/db';
import type { PackingItem, PackingList } from '../../domain/types';
import { copyList, deleteList, remove, save, update } from '../../data/repo';
import { CheckButton, Field, Stepper } from '../../ui/Controls';
import { Empty } from '../../ui/Empty';
import { Sheet } from '../../ui/Sheet';
import { useUI } from '../../ui/UIProvider';

function useLists(tripId: string | null) {
  return useLiveQuery(async () => (await db.packingLists.toArray()).filter((l) => (tripId === null ? l.isTemplate : l.tripId === tripId)).sort((a, b) => a.createdAt - b.createdAt), [tripId]);
}

export function PackingTab({ trip }: { trip: TripWithStatus }) {
  const lists = useLists(trip.id);
  const templates = useLists(null) ?? [];
  const ui = useUI();
  const [sel, setSel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [renaming, setRenaming] = useState<PackingList | null>(null);

  if (lists === undefined) return null;
  const current = lists.find((l) => l.id === sel) ?? lists[0];

  function more(l: PackingList) {
    ui.menu(l.name, [
      { label: 'Renombrar', onSelect: () => setRenaming(l) },
      { label: 'Duplicar lista', onSelect: async () => { const id = await copyList(l.id, { tripId: trip.id, isTemplate: false, name: `${l.name} (copia)` }); setSel(id); } },
      { label: 'Guardar como plantilla', onSelect: async () => { await copyList(l.id, { tripId: null, isTemplate: true, name: l.name, resetChecks: true }); ui.toast('Plantilla guardada'); } },
      { label: 'Desmarcar todo', onSelect: async () => { for (const it of await db.packingItems.where('listId').equals(l.id).toArray()) if (it.checked) await update<PackingItem>('packingItems', it.id, { checked: false }); } },
      { label: 'Eliminar lista', danger: true, onSelect: async () => { if (await ui.confirm({ title: `¿Eliminar «${l.name}»?`, confirmLabel: 'Eliminar', danger: true })) { await deleteList(l.id); setSel(null); } } },
    ]);
  }

  return (
    <div className="stack">
      {lists.length === 0 ? (
        <div className="card flat">
          <Empty icon={ListChecks} title="Sin listas de equipaje" text="Empieza desde una plantilla (urbano, nieve, snowboard, playa…) o crea una lista desde cero."
            action={<button className="btn" onClick={() => setCreating(true)}><Plus /> Nueva lista</button>} />
        </div>
      ) : (
        <>
          <div className="row-between">
            <div className="chips" style={{ margin: 0, padding: 0, flex: 1 }}>
              {lists.map((l) => <button key={l.id} className="chip" aria-pressed={l.id === current?.id} onClick={() => setSel(l.id)}>{l.name}</button>)}
            </div>
            <button className="icon-btn" aria-label="Nueva lista" onClick={() => setCreating(true)}><Plus /></button>
          </div>
          {current && <ListEditor list={current} onMore={() => more(current)} />}
        </>
      )}
      <button className="btn ghost" onClick={() => setTplOpen(true)}><BookCopy /> Gestionar plantillas</button>

      {creating && <NewListSheet tripId={trip.id} templates={templates} onClose={() => setCreating(false)} onCreated={(id) => setSel(id)} />}
      {tplOpen && <TemplatesSheet templates={templates} onClose={() => setTplOpen(false)} />}
      {renaming && <RenameSheet list={renaming} onClose={() => setRenaming(null)} />}
    </div>
  );
}

/** Editor de una lista (sirve para listas de viaje y para plantillas). */
export function ListEditor({ list, onMore }: { list: PackingList; onMore?: () => void }) {
  const items = useLiveQuery(() => db.packingItems.where('listId').equals(list.id).sortBy('order'), [list.id]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const [editing, setEditing] = useState<PackingItem | null>(null);
  const groups = useMemo(() => {
    const m = new Map<string, PackingItem[]>();
    for (const it of items ?? []) {
      if (hideDone && it.checked) continue;
      const k = it.category || 'General';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }, [items, hideDone]);
  if (!items) return null;
  const done = items.filter((i) => i.checked).length;
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    await save<PackingItem>('packingItems', { listId: list.id, name: n, category: category.trim() || 'General', qty: 1, checked: false, order: (items!.at(-1)?.order ?? -1) + 1 });
    setName('');
  }

  return (
    <div className="stack">
      {!list.isTemplate && (
        <div className="card stack-sm">
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 650 }}>{list.name}</div>
              <div className="small muted">{done} de {items.length} preparados · {items.length - done} pendientes</div>
            </div>
            {onMore && <button className="icon-btn muted" aria-label={`Opciones de ${list.name}`} onClick={onMore}><MoreHorizontal /></button>}
          </div>
          <div className="progress"><div style={{ width: `${items.length ? (done / items.length) * 100 : 0}%`, background: done === items.length && items.length ? 'var(--success)' : undefined }} /></div>
          <label className="row small muted" style={{ gap: 8 }}>
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Ocultar lo ya preparado
          </label>
        </div>
      )}
      {[...groups].map(([cat, its]) => (
        <div key={cat} className="pack-group">
          <h4>{cat}</h4>
          <div className="list">
            {its.map((it) => (
              <div key={it.id} className={`list-row pack-item${it.checked ? ' checked' : ''}`}>
                {!list.isTemplate && <CheckButton on={it.checked} label={it.checked ? `Desmarcar ${it.name}` : `Marcar ${it.name}`} onToggle={() => void update<PackingItem>('packingItems', it.id, { checked: !it.checked })} />}
                <button className="grow name" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit' }} onClick={() => setEditing(it)}>{it.name}</button>
                <Stepper label={`Cantidad de ${it.name}`} value={it.qty} onChange={(v) => void update<PackingItem>('packingItems', it.id, { qty: v })} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length > 0 && groups.size === 0 && <p className="small muted center">Todo preparado.</p>}
      <form className="card stack-sm" onSubmit={add}>
        <span className="label">Añadir elemento</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cargador, bañador, forfait…" aria-label="Nombre del elemento" />
        <div className="input-group">
          <input className="input" list={`cats-${list.id}`} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoría (opcional)" aria-label="Categoría" />
          <datalist id={`cats-${list.id}`}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <button className="btn" disabled={!name.trim()}>Añadir</button>
        </div>
      </form>
      {editing && <ItemEdit item={editing} categories={categories} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ItemEdit({ item, categories, onClose }: { item: PackingItem; categories: string[]; onClose: () => void }) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [qty, setQty] = useState(item.qty);
  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    await update<PackingItem>('packingItems', item.id, { name: name.trim(), category: category.trim() || 'General', qty });
    onClose();
  }
  return (
    <Sheet open title="Elemento" onClose={onClose} action={{ label: 'Guardar', onClick: () => void submit(), form: 'pi-form' }}>
      <form id="pi-form" className="form" onSubmit={submit}>
        <Field label="Nombre" htmlFor="pi-name"><input id="pi-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Categoría" htmlFor="pi-cat">
          <input id="pi-cat" className="input" list="pi-cats" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="pi-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <div className="row-between"><span className="label">Cantidad</span><Stepper label="Cantidad" value={qty} onChange={setQty} /></div>
        <button type="button" className="btn danger" onClick={async () => { await remove('packingItems', item.id); onClose(); }}><Trash2 /> Eliminar elemento</button>
      </form>
    </Sheet>
  );
}

function NewListSheet({ tripId, templates, onClose, onCreated }: { tripId: string; templates: PackingList[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [tpl, setTpl] = useState<string>('');
  const [name, setName] = useState('');
  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const t = templates.find((x) => x.id === tpl);
    const n = name.trim() || t?.name || 'Equipaje';
    const id = t ? await copyList(t.id, { tripId, isTemplate: false, name: n, resetChecks: true }) : (await save<PackingList>('packingLists', { tripId, name: n, isTemplate: false })).id;
    onCreated(id);
    onClose();
  }
  return (
    <Sheet open title="Nueva lista" onClose={onClose} action={{ label: 'Crear', onClick: () => void submit(), form: 'nl-form' }}>
      <form id="nl-form" className="form" onSubmit={submit}>
        <Field label="Empezar desde">
          <div className="list">
            <button type="button" className="list-row" onClick={() => setTpl('')} aria-pressed={tpl === ''}>
              <span className="grow">Lista vacía</span>{tpl === '' && <span className="pill accent">Elegida</span>}
            </button>
            {templates.map((t) => (
              <button type="button" key={t.id} className="list-row" onClick={() => setTpl(t.id)} aria-pressed={tpl === t.id}>
                <span className="grow">{t.name}</span>{tpl === t.id && <span className="pill accent">Elegida</span>}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Nombre" htmlFor="nl-name"><input id="nl-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={templates.find((x) => x.id === tpl)?.name ?? 'Equipaje'} /></Field>
      </form>
    </Sheet>
  );
}

function RenameSheet({ list, onClose }: { list: PackingList; onClose: () => void }) {
  const [name, setName] = useState(list.name);
  const submit = async (e?: React.FormEvent) => { e?.preventDefault(); if (name.trim()) await update<PackingList>('packingLists', list.id, { name: name.trim() }); onClose(); };
  return (
    <Sheet open title="Renombrar" onClose={onClose} action={{ label: 'Guardar', onClick: () => void submit(), form: 'rn-form' }}>
      <form id="rn-form" className="form" onSubmit={submit}><input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre de la lista" autoFocus /></form>
    </Sheet>
  );
}

export function TemplatesSheet({ templates, onClose }: { templates: PackingList[]; onClose: () => void }) {
  const ui = useUI();
  const [open, setOpen] = useState<PackingList | null>(null);
  const [name, setName] = useState('');
  if (open) {
    return (
      <Sheet open full title={open.name} onClose={() => setOpen(null)} closeLabel="Atrás">
        <ListEditor list={open} />
      </Sheet>
    );
  }
  return (
    <Sheet open title="Plantillas" onClose={onClose} closeLabel="Cerrar">
      <div className="stack">
        <div className="list">
          {templates.map((t) => (
            <div key={t.id} className="list-row">
              <button className="grow" style={{ background: 'none', border: 0, textAlign: 'left', padding: '6px 0', color: 'inherit' }} onClick={() => setOpen(t)}>{t.name}</button>
              <button className="icon-btn sm muted" aria-label={`Duplicar ${t.name}`} onClick={() => void copyList(t.id, { tripId: null, isTemplate: true, name: `${t.name} (copia)` })}><BookCopy /></button>
              <button className="icon-btn sm muted" aria-label={`Eliminar ${t.name}`} onClick={async () => { if (await ui.confirm({ title: `¿Eliminar la plantilla «${t.name}»?`, confirmLabel: 'Eliminar', danger: true })) await deleteList(t.id); }}><Trash2 /></button>
            </div>
          ))}
        </div>
        <form className="input-group" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; const l = await save<PackingList>('packingLists', { tripId: null, name: name.trim(), isTemplate: true }); setName(''); setOpen(l); }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva plantilla" aria-label="Nombre de la nueva plantilla" />
          <button className="btn" disabled={!name.trim()}>Crear</button>
        </form>
      </div>
    </Sheet>
  );
}
