import { t } from '../i18n';
import { useSyncState } from './hooks';

/** Estado honesto de conexión y sincronización. */
export function SyncBadge() {
  const s = useSyncState();
  let dot = 'status-dot';
  let text: string;
  if (!s.online) {
    // Sin conexión no se avisa (ya se sabe): solo se indica si hay cambios esperando a sincronizar.
    if (s.phase === 'disabled' || !s.pending) return null;
    dot += ' off';
    text = `${s.pending} ${t('sync.pending')}`;
  } else if (s.phase === 'disabled') {
    dot += ' idle';
    text = `${t('sync.online')} · ${t('sync.local')}`;
  } else if (s.phase === 'syncing') {
    text = t('sync.syncing');
  } else if (s.phase === 'error') {
    dot += ' err';
    text = t('sync.error');
  } else if (s.pending) {
    dot += ' off';
    text = `${s.pending} ${t('sync.pending')}`;
  } else {
    text = s.lastSyncAt ? `Sincronizado ${new Date(s.lastSyncAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : t('sync.online');
  }
  return (
    <span className="pill" role="status" aria-live="polite">
      <span className={dot} /> {text}
    </span>
  );
}
