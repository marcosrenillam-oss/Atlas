import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, MapPin, Plus, Search, Trash2, X } from 'lucide-react';
import { Sheet } from '../../ui/Sheet';
import { Field, Segmented, Stepper } from '../../ui/Controls';
import { MoneyInput } from '../../ui/MoneyInput';
import { Cover } from '../../ui/Cover';
import { useUI } from '../../ui/UIProvider';
import { TRIP_TYPES } from '../../domain/catalog';
import type { Participant, Stage, Trip, TripType } from '../../domain/types';
import { CURRENCIES, type Minor } from '../../lib/money';
import { isISODate } from '../../lib/dates';
import { uid } from '../../lib/id';
import { remove, save, storeFile, update } from '../../data/repo';
import { useProfile } from '../../data/settings';
import { compressImage } from '../../files/files';
import { searchPlaces, wikipediaImage } from '../../maps/geocode';
import { requestPersistence, useOnline } from '../../app/hooks';

interface Draft {
  name: string;
  origin: string;
  stages: Stage[];
  startDate: string;
  endDate: string;
  travelers: number;
  companions: string[];
  type: TripType;
  planning: Trip['planning'];
  budget?: Minor;
  budgetValid: boolean;
  currency: string;
  description: string;
  cover?: Trip['cover'];
}

function fromTrip(t: Trip | undefined, currency: string, homeCity = ''): Draft {
  return {
    name: t?.name ?? '',
    origin: t ? t.origin ?? '' : homeCity,
    stages: t?.stages.length ? t.stages.map((s) => ({ ...s })) : [{ id: uid(), name: '' }],
    startDate: t?.startDate ?? '',
    endDate: t?.endDate ?? '',
    travelers: t?.travelers ?? 1,
    companions: [],
    type: t?.type ?? 'vacaciones',
    planning: t?.planning ?? 'planning',
    budget: t?.budget,
    budgetValid: true,
    currency: t?.currency ?? currency,
    description: t?.description ?? '',
    cover: t?.cover,
  };
}

export function TripForm({ open, onClose, trip, onSaved, initialDestination }: { open: boolean; onClose: () => void; trip?: Trip; onSaved?: (id: string) => void; initialDestination?: string }) {
  const profile = useProfile();
  const ui = useUI();
  const online = useOnline();
  const [d, setD] = useState<Draft>(() => {
    const base = fromTrip(trip, profile.currency, profile.homeCity ?? '');
    if (!trip && initialDestination) return { ...base, name: `Viaje a ${initialDestination}`, stages: [{ ...base.stages[0], name: initialDestination }] };
    return base;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companion, setCompanion] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const createdCover = useRef<string | null>(null);
  const editing = !!trip;
  // El perfil se carga de forma asíncrona: si llega después de abrir el formulario, rellena el origen.
  const originTouched = useRef(false);
  useEffect(() => {
    if (!trip && !originTouched.current && profile.homeCity) setD((x) => (x.origin ? x : { ...x, origin: profile.homeCity! }));
  }, [trip, profile.homeCity]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setStage = (i: number, patch: Partial<Stage>) => setD((x) => ({ ...x, stages: x.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const close = () => {
    // Si se subió una portada y se cancela, se elimina el archivo huérfano.
    if (createdCover.current && createdCover.current !== trip?.cover?.fileId) void remove('files', createdCover.current);
    createdCover.current = null;
    onClose();
  };

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!d.name.trim()) e.name = 'Ponle un nombre al viaje.';
    if (d.startDate && !isISODate(d.startDate)) e.startDate = 'Fecha no válida.';
    if (d.endDate && !isISODate(d.endDate)) e.endDate = 'Fecha no válida.';
    if (d.startDate && d.endDate && d.endDate < d.startDate) e.endDate = 'El regreso no puede ser anterior a la salida.';
    if (!d.startDate && d.endDate) e.startDate = 'Indica también la fecha de salida.';
    if (!d.budgetValid) e.budget = 'Importe no válido.';
    d.stages.forEach((s, i) => {
      if (s.start && s.end && s.end < s.start) e[`stage${i}`] = 'Fechas de etapa incoherentes.';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (!validate()) return;
    setBusy('save');
    try {
      const stages = d.stages.filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim() }));
      const companions = [...d.companions, companion.trim()].filter(Boolean);
      const data = {
        name: d.name.trim(),
        origin: d.origin.trim() || undefined,
        stages,
        startDate: d.startDate || undefined,
        endDate: d.endDate || undefined,
        travelers: Math.max(d.travelers, editing ? d.travelers : companions.length + 1),
        type: d.type,
        planning: d.planning,
        budget: d.budget,
        currency: d.currency,
        description: d.description.trim() || undefined,
        cover: d.cover,
      };
      let id: string;
      if (trip) {
        if (trip.cover && trip.cover.fileId !== d.cover?.fileId) await remove('files', trip.cover.fileId);
        await update<Trip>('trips', trip.id, data);
        id = trip.id;
      } else {
        const t = await save<Trip>('trips', { ...data, archived: false, shared: false });
        id = t.id;
        await save<Participant>('participants', { tripId: id, name: profile.name.trim() || 'Yo', role: 'owner', canSeeExpenses: true, isMe: true });
        for (const name of companions) await save<Participant>('participants', { tripId: id, name, role: 'editor', canSeeExpenses: true, isMe: false });
        void requestPersistence();
      }
      createdCover.current = null;
      ui.toast(trip ? 'Viaje actualizado' : 'Viaje creado');
      onSaved?.(id);
      onClose();
    } catch (e) {
      ui.toast((e as Error).message || 'No se pudo guardar.', { kind: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function setCoverBlob(blob: Blob, name: string, credit?: string, creditUrl?: string) {
    if (createdCover.current) await remove('files', createdCover.current);
    const f = await storeFile(await compressImage(blob, 1800), name, trip?.id ?? null);
    createdCover.current = f.id;
    set('cover', { fileId: f.id, credit, creditUrl });
  }

  async function findPhoto() {
    const q = d.stages.find((s) => s.name.trim())?.name || d.name;
    if (!q.trim()) return ui.toast('Escribe primero un destino.', { kind: 'error' });
    setBusy('photo');
    try {
      const r = await wikipediaImage(q);
      if (!r) ui.toast(`No hay foto en Wikipedia para «${q}». Puedes subir una tuya.`);
      else await setCoverBlob(r.blob, `${q}.jpg`, r.credit, r.url);
    } catch (e) {
      ui.toast((e as Error).message, { kind: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function locateStage(i: number) {
    const s = d.stages[i];
    if (!s.name.trim()) return;
    setBusy(`loc${i}`);
    try {
      const [r] = await searchPlaces(s.name);
      if (!r) ui.toast('No se encontró ese destino en OpenStreetMap.');
      else {
        setStage(i, { point: r.point });
        ui.toast(`Ubicado: ${r.address.split(',').slice(0, 2).join(',')}`);
      }
    } catch (e) {
      ui.toast((e as Error).message, { kind: 'error' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={open} onClose={close} title={editing ? 'Editar viaje' : 'Nuevo viaje'} full action={{ label: busy === 'save' ? 'Guardando…' : 'Guardar', onClick: () => void submit(), disabled: !!busy, form: 'trip-form' }}>
      <form id="trip-form" className="form" onSubmit={submit} noValidate>
        <Field label="Nombre del viaje" htmlFor="t-name" error={errors.name}>
          <input id="t-name" className="input" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Escapada a Lisboa" aria-invalid={!!errors.name || undefined} autoComplete="off" enterKeyHint="next" />
        </Field>

        <Field label="Salgo desde" htmlFor="t-origin" hint="Aparece en el billete de la portada.">
          <input id="t-origin" className="input" value={d.origin} onChange={(e) => { originTouched.current = true; set('origin', e.target.value); }} placeholder="Madrid" autoComplete="address-level2" enterKeyHint="next" />
        </Field>

        <div className="field">
          <span className="label">Destinos y etapas</span>
          <div className="stack-sm">
            {d.stages.map((s, i) => (
              <div key={s.id} className="card flat tight stack-sm">
                <div className="input-group">
                  <input className="input" value={s.name} onChange={(e) => setStage(i, { name: e.target.value, point: undefined })} placeholder={i === 0 ? 'Destino principal' : `Etapa ${i + 1}`} aria-label={`Destino ${i + 1}`} />
                  <button type="button" className="icon-btn sm muted" aria-label="Ubicar destino en el mapa" disabled={!online || !s.name.trim() || !!busy} onClick={() => void locateStage(i)} title={online ? 'Ubicar en el mapa' : 'Necesita conexión'}>
                    {busy === `loc${i}` ? <Loader2 className="spin" /> : <MapPin style={{ color: s.point ? 'var(--success)' : undefined }} />}
                  </button>
                  {d.stages.length > 1 && (
                    <button type="button" className="icon-btn sm muted" aria-label={`Quitar etapa ${i + 1}`} onClick={() => set('stages', d.stages.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </button>
                  )}
                </div>
                {d.stages.length > 1 && (
                  <div className="grid-2">
                    <input type="date" className="input" value={s.start ?? ''} onChange={(e) => setStage(i, { start: e.target.value || undefined })} aria-label={`Llegada etapa ${i + 1}`} />
                    <input type="date" className="input" value={s.end ?? ''} onChange={(e) => setStage(i, { end: e.target.value || undefined })} aria-label={`Salida etapa ${i + 1}`} />
                  </div>
                )}
                {errors[`stage${i}`] && <span className="error small">{errors[`stage${i}`]}</span>}
              </div>
            ))}
            <button type="button" className="btn secondary sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('stages', [...d.stages, { id: uid(), name: '' }])}>
              <Plus /> Añadir destino
            </button>
          </div>
        </div>

        <div className="grid-2">
          <Field label="Salida" htmlFor="t-start" error={errors.startDate}>
            <input id="t-start" type="date" className="input" value={d.startDate} onChange={(e) => set('startDate', e.target.value)} aria-invalid={!!errors.startDate || undefined} />
          </Field>
          <Field label="Regreso" htmlFor="t-end" error={errors.endDate}>
            <input id="t-end" type="date" className="input" value={d.endDate} min={d.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} aria-invalid={!!errors.endDate || undefined} />
          </Field>
        </div>

        <Field label="Estado">
          <Segmented label="Estado del viaje" value={d.planning} onChange={(v) => set('planning', v)} options={[{ value: 'planning', label: 'En preparación' }, { value: 'confirmed', label: 'Confirmado' }]} />
        </Field>

        <div className="row-between">
          <div>
            <div className="label">Número de viajeros</div>
            <div className="hint tiny faint">Incluyéndote a ti</div>
          </div>
          <Stepper label="Número de viajeros" value={d.travelers} onChange={(v) => set('travelers', v)} />
        </div>

        {!editing && (
          <Field label="Acompañantes" hint="Opcional. Se usan para repartir gastos. Puedes añadirlos después.">
            <div className="stack-sm">
              {d.companions.length > 0 && (
                <div className="row wrap" style={{ gap: 6 }}>
                  {d.companions.map((c, i) => (
                    <span key={c + i} className="chip">
                      {c}
                      <button type="button" aria-label={`Quitar ${c}`} style={{ border: 0, background: 'none', padding: 0, display: 'grid', color: 'inherit' }} onClick={() => set('companions', d.companions.filter((_, j) => j !== i))}>
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="input-group">
                <input className="input" value={companion} onChange={(e) => setCompanion(e.target.value)} placeholder="Nombre" aria-label="Nombre del acompañante"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (companion.trim()) {
                        const next = [...d.companions, companion.trim()];
                        setD((x) => ({ ...x, companions: next, travelers: Math.max(x.travelers, next.length + 1) }));
                        setCompanion('');
                      }
                    }
                  }}
                />
                <button type="button" className="btn secondary" disabled={!companion.trim()} onClick={() => {
                  const next = [...d.companions, companion.trim()];
                  setD((x) => ({ ...x, companions: next, travelers: Math.max(x.travelers, next.length + 1) }));
                  setCompanion('');
                }}>Añadir</button>
              </div>
            </div>
          </Field>
        )}

        <Field label="Tipo de viaje" htmlFor="t-type">
          <select id="t-type" className="select" value={d.type} onChange={(e) => set('type', e.target.value as TripType)}>
            {TRIP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>

        <div className="grid-2">
          <Field label="Presupuesto" htmlFor="t-budget" error={errors.budget}>
            <MoneyInput id="t-budget" value={d.budget} currency={d.currency} invalid={!!errors.budget} onChange={(v, valid) => setD((x) => ({ ...x, budget: v, budgetValid: valid }))} />
          </Field>
          <Field label="Moneda" htmlFor="t-cur">
            <select id="t-cur" className="select" value={d.currency} onChange={(e) => set('currency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Descripción" htmlFor="t-desc">
          <textarea id="t-desc" className="textarea" value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="Notas generales, objetivo del viaje…" />
        </Field>

        <div className="field">
          <span className="label">Fotografía de portada</span>
          {d.cover ? (
            <div style={{ position: 'relative' }}>
              <Cover trip={{ name: d.name, stages: d.stages, cover: d.cover }} style={{ aspectRatio: '16/8', borderRadius: 14 }} showCredit />
              <button type="button" className="icon-btn sm filled" style={{ position: 'absolute', top: 8, right: 8 }} aria-label="Quitar portada" onClick={() => {
                if (createdCover.current) void remove('files', createdCover.current);
                createdCover.current = null;
                set('cover', undefined);
              }}>
                <X />
              </button>
            </div>
          ) : null}
          <div className="row wrap" style={{ gap: 8 }}>
            <button type="button" className="btn secondary sm" onClick={() => fileInput.current?.click()} disabled={!!busy}>
              <ImagePlus /> Subir foto
            </button>
            <button type="button" className="btn secondary sm" onClick={() => void findPhoto()} disabled={!online || !!busy} title={online ? '' : 'Necesita conexión'}>
              {busy === 'photo' ? <Loader2 className="spin" /> : <Search />} Buscar en Wikipedia
            </button>
          </div>
          {!d.cover && (
            <Cover trip={{ name: d.name, stages: d.stages, origin: d.origin, startDate: d.startDate || undefined, travelers: d.travelers }} style={{ aspectRatio: '16/9', borderRadius: 18 }} />
          )}
          <span className="hint">{d.cover ? '' : 'Sin foto, la portada es este billete con tu origen y destino. '}La foto se guarda en el dispositivo y se ve sin conexión.{!online && ' La búsqueda en Wikipedia necesita conexión.'}</span>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void setCoverBlob(f, f.name);
            e.target.value = '';
          }} />
        </div>
      </form>
    </Sheet>
  );
}
