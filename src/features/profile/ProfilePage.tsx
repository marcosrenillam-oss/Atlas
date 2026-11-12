import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CloudCog, Database, Download, HardDrive, Info, Languages, Moon, RefreshCw, ShieldCheck, Smartphone, Trash2, Upload, Wallet,
} from 'lucide-react';
import { saveProfile, useProfile, getSyncConfig, type SyncConfig, type ThemePref } from '../../data/settings';
import { backupFilename, deliverJSON, exportAll, importBackup, parseBackup } from '../../data/backup';
import { db } from '../../data/db';
import { remove } from '../../data/repo';
import { ensureSeed } from '../../data/seed';
import { CURRENCIES } from '../../lib/money';
import { LANGUAGES } from '../../i18n';
import { Field, Segmented } from '../../ui/Controls';
import { Sheet } from '../../ui/Sheet';
import { useUI } from '../../ui/UIProvider';
import { formatBytes } from '../../files/files';
import { SyncBadge } from '../../app/SyncBadge';
import { isStandalone, requestPersistence, useOnline, useSyncState } from '../../app/hooks';
import { configureSync, disableSync, syncNow } from '../../sync/engine';
import { initials } from '../trip/SummaryTab';

export function ProfilePage() {
  const profile = useProfile();
  const ui = useUI();
  const [name, setName] = useState(profile.name);
  const [city, setCity] = useState(profile.homeCity ?? '');
  useEffect(() => {
    setCity(profile.homeCity ?? '');
  }, [profile.homeCity]);
  useEffect(() => {
    setName(profile.name);
  }, [profile.name]);
  const [syncOpen, setSyncOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const sync = useSyncState();
  const standalone = isStandalone();

  const storage = useStorage();

  async function doExport() {
    setBusy('export');
    try {
      const data = await exportAll();
      const how = await deliverJSON(data, backupFilename('atlas-copia'));
      await db.kv.put({ key: 'lastBackupAt', value: Date.now() });
      ui.toast(how === 'shared' ? 'Copia lista para guardar' : 'Copia descargada');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') ui.toast((e as Error).message, { kind: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function doImport(file: File | undefined) {
    if (!file) return;
    setBusy('import');
    try {
      const backup = parseBackup(await file.text());
      let mode: 'merge' | 'replace' = 'merge';
      if (backup.kind === 'full') {
        const replace = await ui.confirm({
          title: 'Importar copia completa',
          message: '«Combinar» añade y actualiza sin borrar nada. «Reemplazar» borra antes todos los datos de este dispositivo.',
          confirmLabel: 'Reemplazar todo',
          danger: true,
        });
        mode = replace ? 'replace' : 'merge';
        if (!replace && !(await ui.confirm({ title: '¿Combinar con tus datos actuales?', confirmLabel: 'Combinar' }))) return;
      }
      const r = await importBackup(backup, mode);
      await ensureSeed();
      ui.toast(`Importado: ${r.added} nuevos, ${r.updated} actualizados${r.skipped ? `, ${r.skipped} sin cambios` : ''}.`);
    } catch (e) {
      ui.toast((e as Error).message, { kind: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function wipe() {
    const ok = await ui.confirm({ title: '¿Borrar todos los datos?', message: 'Se eliminarán viajes, gastos, documentos, lugares y ajustes de este dispositivo. Exporta antes una copia si la quieres conservar.', confirmLabel: 'Continuar', danger: true });
    if (!ok) return;
    const sure = await ui.confirm({ title: 'Esta acción no se puede deshacer', message: '¿Seguro que quieres borrar todo?', confirmLabel: 'Borrar todo', danger: true });
    if (!sure) return;
    await disableSync();
    await db.delete();
    window.location.replace(import.meta.env.BASE_URL);
  }

  const lastBackup = useLiveQuery(async () => (await db.kv.get('lastBackupAt'))?.value as number | undefined, []);

  return (
    <main className="page stagger">
      <div className="page-head"><h1>Tu <span className="serif grad-text">perfil</span></h1></div>
      <div className="stack-lg">
        <div className="card row" style={{ gap: 14, alignItems: 'flex-start' }}>
          <span className="avatar">{initials(name || 'Tú')}</span>
          <div className="grow">
            <label className="label" htmlFor="pf-name">Tu nombre</label>
            <input id="pf-name" className="input" style={{ marginTop: 4 }} value={name} placeholder="Cómo quieres que te salude ATLAS" onChange={(e) => setName(e.target.value)} onBlur={() => void saveProfile({ name: name.trim() })} />
            <label className="label" htmlFor="pf-city" style={{ display: 'block', marginTop: 12 }}>Tu ciudad de origen</label>
            <input id="pf-city" className="input" style={{ marginTop: 4 }} value={city} placeholder="Madrid" onChange={(e) => setCity(e.target.value)} onBlur={() => void saveProfile({ homeCity: city.trim() })} />
            <span className="hint tiny faint">Se rellena sola en «Salgo desde» al crear un viaje.</span>
          </div>
        </div>

        <section>
          <div className="section-head"><h2>Preferencias</h2></div>
          <div className="list">
            <div className="list-row">
              <div className="icon-tile"><Moon /></div>
              <span className="grow">Apariencia</span>
              <div style={{ width: 210 }}>
                <Segmented<ThemePref> label="Apariencia" value={profile.theme} onChange={(v) => void saveProfile({ theme: v })} options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} />
              </div>
            </div>
            <div className="list-row">
              <div className="icon-tile"><Languages /></div>
              <span className="grow">Idioma</span>
              <span className="value">{LANGUAGES.find((l) => l.code === profile.language)?.label ?? 'Español'}</span>
            </div>
            <div className="list-row">
              <div className="icon-tile"><Wallet /></div>
              <div className="grow"><div>Moneda predeterminada</div><div className="meta">Para viajes nuevos y resúmenes</div></div>
              <select className="select" style={{ width: 110, minHeight: 38 }} value={profile.currency} onChange={(e) => void saveProfile({ currency: e.target.value })} aria-label="Moneda predeterminada">
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section>
          <div className="section-head"><h2>Copias de seguridad</h2></div>
          <div className="list">
            <button className="list-row" onClick={() => void doExport()} disabled={!!busy}>
              <div className="icon-tile"><Download /></div>
              <div className="grow"><div>Exportar copia completa</div><div className="meta">{lastBackup ? `Última: ${new Date(lastBackup).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Incluye documentos y fotos'}</div></div>
              {busy === 'export' && <RefreshCw className="spin" size={18} />}
            </button>
            <button className="list-row" onClick={() => fileInput.current?.click()} disabled={!!busy}>
              <div className="icon-tile"><Upload /></div>
              <div className="grow"><div>Importar copia o viaje</div><div className="meta">Archivos .atlas.json</div></div>
              {busy === 'import' && <RefreshCw className="spin" size={18} />}
            </button>
          </div>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = ''; }} />
          <p className="tiny faint" style={{ marginTop: 8 }}>Guarda la copia en Archivos, iCloud Drive o tu ordenador. Es la forma de no perder nada si cambias de móvil o borras Safari.</p>
        </section>

        <section>
          <div className="section-head"><h2>Sincronización</h2></div>
          <div className="list">
            <button className="list-row" onClick={() => setSyncOpen(true)}>
              <div className="icon-tile"><CloudCog /></div>
              <div className="grow"><div>Servidor de sincronización</div><div className="meta">{sync.phase === 'disabled' ? 'Opcional · no configurado' : 'Configurado'}</div></div>
              <SyncBadge />
            </button>
          </div>
        </section>

        <section>
          <div className="section-head"><h2>Almacenamiento</h2></div>
          <div className="list">
            <div className="list-row">
              <div className="icon-tile"><HardDrive /></div>
              <div className="grow">
                <div>Espacio usado</div>
                <div className="meta">{storage.usage !== null ? `${formatBytes(storage.usage)}${storage.quota ? ` de ${formatBytes(storage.quota)} disponibles para ATLAS` : ''}` : 'No disponible'}</div>
              </div>
            </div>
            <div className="list-row">
              <div className="icon-tile"><Database /></div>
              <div className="grow"><div>Datos guardados</div><div className="meta">{storage.counts}</div></div>
            </div>
            <div className="list-row">
              <div className="icon-tile"><ShieldCheck /></div>
              <div className="grow"><div>Almacenamiento persistente</div><div className="meta">{storage.persisted ? 'Activado: el navegador no borrará los datos por falta de espacio' : 'No confirmado por el navegador'}</div></div>
              {!storage.persisted && <button className="btn sm secondary" onClick={async () => { const ok = await requestPersistence(); storage.refresh(); ui.toast(ok ? 'Persistencia activada' : 'El navegador no lo ha concedido. Instalar ATLAS en la pantalla de inicio ayuda.'); }}>Solicitar</button>}
            </div>
            <button className="list-row" onClick={async () => { const n = await cleanOrphans(); storage.refresh(); ui.toast(n ? `${n} archivos sin uso eliminados` : 'No hay archivos sin uso'); }}>
              <div className="icon-tile neutral"><Trash2 /></div>
              <div className="grow"><div>Limpiar archivos sin uso</div><div className="meta">Fotos de formularios cancelados, etc.</div></div>
            </button>
          </div>
        </section>

        <section>
          <div className="section-head"><h2>Instalación</h2></div>
          <div className="card row small" style={{ alignItems: 'flex-start' }}>
            <Smartphone size={20} style={{ flex: 'none', color: 'var(--accent-2)' }} />
            <div className="muted">
              {standalone ? 'ATLAS está instalada como app. Funciona sin conexión una vez cargada.' : 'En iPhone: abre ATLAS en Safari, pulsa Compartir y elige «Añadir a pantalla de inicio». Así se abre a pantalla completa y Safari conserva tus datos de forma estable.'}
            </div>
          </div>
        </section>

        <section>
          <div className="section-head"><h2>Privacidad</h2></div>
          <div className="card small muted stack-sm">
            <p>Tus datos se guardan únicamente en este dispositivo (IndexedDB). ATLAS no tiene cuentas, anuncios ni analítica.</p>
            <p>Solo se conecta a servicios externos cuando tú lo pides: mapa base y búsqueda de lugares (OpenStreetMap), fotos de portada (Wikipedia) y, si lo configuras, tu propio servidor de sincronización.</p>
            <p>Los documentos nunca se suben a ningún sitio salvo que exportes una copia o sincronices ese viaje con tu servidor.</p>
          </div>
        </section>

        <section>
          <div className="section-head"><h2>Zona peligrosa</h2></div>
          <button className="btn danger block" onClick={() => void wipe()}><Trash2 /> Borrar todos los datos</button>
        </section>

        <p className="tiny faint center"><Info size={12} style={{ verticalAlign: '-2px' }} /> ATLAS 1.0 · Código abierto · Mapas © colaboradores de OpenStreetMap</p>
      </div>
      {syncOpen && <SyncSheet onClose={() => setSyncOpen(false)} />}
    </main>
  );
}

function useStorage() {
  const [usage, setUsage] = useState<number | null>(null);
  const [quota, setQuota] = useState<number | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [tick, setTick] = useState(0);
  const counts = useLiveQuery(async () => {
    const [trips, docs, files, places] = await Promise.all([db.trips.count(), db.docs.count(), db.files.count(), db.places.count()]);
    return `${trips} viajes · ${docs} documentos · ${places} lugares · ${files} archivos`;
  }, [], '…');
  useEffect(() => {
    void (async () => {
      try {
        const e = await navigator.storage?.estimate?.();
        setUsage(e?.usage ?? null);
        setQuota(e?.quota ?? null);
        setPersisted((await navigator.storage?.persisted?.()) ?? false);
      } catch {
        /* no disponible */
      }
    })();
  }, [tick]);
  return { usage, quota, persisted, counts, refresh: () => setTick((t) => t + 1) };
}

/** Elimina binarios que no referencia ningún viaje, actividad, lugar ni documento. */
async function cleanOrphans(): Promise<number> {
  const used = new Set<string>();
  for (const t of await db.trips.toArray()) if (t.cover) used.add(t.cover.fileId);
  for (const i of await db.items.toArray()) i.photoIds.forEach((x) => used.add(x));
  for (const p of await db.places.toArray()) p.photoIds.forEach((x) => used.add(x));
  for (const d of await db.docs.toArray()) used.add(d.fileId);
  const ids = (await db.files.toCollection().primaryKeys()) as string[];
  // Margen de 10 min para no borrar archivos de un formulario abierto ahora mismo.
  const cutoff = Date.now() - 10 * 60_000;
  let n = 0;
  for (const id of ids) {
    if (used.has(id)) continue;
    const f = await db.files.get(id);
    if (f && f.createdAt < cutoff) {
      await remove('files', id);
      n++;
    }
  }
  return n;
}

function SyncSheet({ onClose }: { onClose: () => void }) {
  const ui = useUI();
  const online = useOnline();
  const s = useSyncState();
  const cfg = useLiveQuery(getSyncConfig, []) as SyncConfig | undefined;
  const [url, setUrl] = useState('');
  const [space, setSpace] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const loaded = useRef(false);
  useEffect(() => {
    if (cfg && !loaded.current) {
      loaded.current = true;
      // No pisa lo que el usuario haya empezado a escribir.
      setUrl((v) => v || cfg.url);
      setSpace((v) => v || cfg.space);
      setToken((v) => v || cfg.token);
    }
  }, [cfg]);

  async function connect(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    if (!/^https?:\/\/.+/i.test(url.trim())) return setErr('La dirección debe empezar por https:// (o http:// en tu red local).');
    if (!/^[a-z0-9-]{3,64}$/.test(space.trim())) return setErr('El espacio solo admite minúsculas, números y guiones (3–64).');
    if (token.trim().length < 12) return setErr('La clave debe tener al menos 12 caracteres.');
    setBusy(true);
    try {
      await configureSync({ url: url.trim(), space: space.trim(), token: token.trim() });
      ui.toast('Sincronización activada. Elige qué viajes compartir desde su resumen.');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open full title="Sincronización" onClose={onClose} closeLabel="Cerrar">
      <div className="stack">
        <div className="notice small">
          <Info />
          <div>
            La sincronización es <strong>opcional</strong>. ATLAS funciona completo sin ella. Necesitas tu propio servidor gratuito (incluido en el proyecto: <code>server/sync-server.mjs</code>) en tu ordenador, una Raspberry Pi o similar. Solo se sincronizan los viajes que marques como compartidos, cuando hay conexión y la app está abierta.
          </div>
        </div>
        <div className="card stack-sm">
          <div className="row-between"><span className="label">Estado</span><SyncBadge /></div>
          {cfg?.lastSyncAt && <div className="small muted">Última sincronización: {new Date(cfg.lastSyncAt).toLocaleString('es-ES')}</div>}
          {s.pending > 0 && <div className="small muted">{s.pending} cambios esperando a enviarse.</div>}
          {s.lastError && s.phase === 'error' && <div className="small" style={{ color: 'var(--danger)' }}>{s.lastError}</div>}
          {s.phase !== 'disabled' && (
            <div className="row">
              <button className="btn secondary sm grow" disabled={!online || s.phase === 'syncing'} onClick={() => void syncNow()}><RefreshCw /> Sincronizar ahora</button>
              <button className="btn danger sm grow" onClick={async () => { if (await ui.confirm({ title: '¿Desactivar la sincronización?', message: 'Tus datos locales no se borran. Los cambios pendientes de enviar se descartarán.', confirmLabel: 'Desactivar', danger: true })) await disableSync(); }}>Desactivar</button>
            </div>
          )}
        </div>
        <form className="form" onSubmit={connect}>
          <Field label="Dirección del servidor" htmlFor="s-url"><input id="s-url" className="input" inputMode="url" autoCapitalize="none" autoCorrect="off" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://atlas.mi-servidor.ts.net" /></Field>
          <Field label="Espacio compartido" htmlFor="s-space" hint="El mismo en todos los dispositivos y personas que compartan viajes."><input id="s-space" className="input" autoCapitalize="none" autoCorrect="off" value={space} onChange={(e) => setSpace(e.target.value.toLowerCase())} placeholder="familia-garcia" /></Field>
          <Field label="Clave de acceso" htmlFor="s-token" hint="La que definiste en ATLAS_SYNC_TOKEN al arrancar el servidor."><input id="s-token" className="input" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} /></Field>
          {err && <div className="error small" role="alert">{err}</div>}
          <button className="btn block" disabled={busy || !online}>{busy ? 'Comprobando…' : s.phase === 'disabled' ? 'Conectar y activar' : 'Guardar y reconectar'}</button>
          {!online && <p className="tiny faint">Necesitas conexión para comprobar el servidor.</p>}
        </form>
        <p className="tiny faint">Conflictos: si dos personas editan lo mismo, se conserva la versión editada más tarde (por elemento). Los permisos de viajeros son informativos: cualquiera con la clave del espacio accede a los viajes compartidos en él.</p>
      </div>
    </Sheet>
  );
}
