import { useNavigate } from 'react-router-dom';
import { useUI } from '../../ui/UIProvider';
import { deleteTrip, duplicateTrip, update } from '../../data/repo';
import { backupFilename, deliverJSON, exportTrip } from '../../data/backup';
import type { Trip } from '../../domain/types';

export function useTripActions(onEdit: (t: Trip) => void) {
  const ui = useUI();
  const nav = useNavigate();

  const actions = {
    async duplicate(t: Trip) {
      const id = await duplicateTrip(t.id);
      ui.toast('Viaje duplicado (sin gastos ni documentos)', { action: { label: 'Abrir', onClick: () => nav(`/viajes/${id}`) } });
    },
    async archive(t: Trip) {
      await update<Trip>('trips', t.id, { archived: !t.archived });
      ui.toast(t.archived ? 'Viaje restaurado' : 'Viaje archivado', { action: { label: 'Deshacer', onClick: () => void update<Trip>('trips', t.id, { archived: t.archived }) } });
    },
    async remove(t: Trip, after?: () => void) {
      const ok = await ui.confirm({
        title: `¿Eliminar «${t.name}»?`,
        message: 'Se borrarán su itinerario, gastos, documentos y listas de este dispositivo. No se puede deshacer.',
        confirmLabel: 'Eliminar',
        danger: true,
      });
      if (!ok) return;
      await deleteTrip(t.id);
      ui.toast('Viaje eliminado');
      after?.();
    },
    async exportOne(t: Trip) {
      try {
        const data = await exportTrip(t.id);
        await deliverJSON(data, backupFilename(t.name));
      } catch (e) {
        if ((e as Error).name !== 'AbortError') ui.toast((e as Error).message, { kind: 'error' });
      }
    },
    open(t: Trip, after?: () => void) {
      ui.menu(t.name, [
        { label: 'Editar', onSelect: () => onEdit(t) },
        { label: 'Duplicar', onSelect: () => void actions.duplicate(t) },
        { label: 'Exportar para compartir', onSelect: () => void actions.exportOne(t) },
        { label: t.archived ? 'Desarchivar' : 'Archivar', onSelect: () => void actions.archive(t) },
        { label: 'Eliminar', danger: true, onSelect: () => void actions.remove(t, after) },
      ]);
    },
  };
  return actions;
}
